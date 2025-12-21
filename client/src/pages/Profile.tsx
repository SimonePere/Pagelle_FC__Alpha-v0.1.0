import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/redux/store/store';
import { logout, loadEnrichedUserData, updateUserProfile, changeUserPassword } from '@/redux/slices/authSlice';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { TrendingUp, Target, Users, Trophy, Award, TrendingDown, Star, LogOut, Goal, Hand, User as UserIcon, Lock, KeyRound } from 'lucide-react';
import { motion } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { Match, User } from '@/types/match';
// import { PlayerCardDisplay } from '@/components/PlayerCardDisplay';
import { StatsTooltip } from '@/components/StatsTooltip';
import EditModal from '@/components/EditModal';
import { apiCall } from '@/lib/api';
import { toast } from 'sonner';
import { useToast } from '@/hooks/use-toast';

// Semplifichiamo l'interface utilizzando i dati già disponibili
interface UserStats {
  averageRating: number;
  goals: number;
  assists: number;
  appearances: number;
  bestRating: number;
  worstRating: number;
}

// Interface per PlayerCard risultati completi (come in PlayerCards)
interface PlayerCardResult {
  finalAttributes: {
    tir: number;
    pas: number;
    dri: number;
    fin: number;
    vis: number;
    res: number;
    for: number;
  };
  finalAdditionalAttributes?: {
    piedeDebole?: number;
    skill?: number;
  };
  finalOverallRating: number;
  profile: {
    mostVotedPosition?: string;
    preferredRole?: string;
  };
}

const Profile = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Semplifichiamo lo stato utilizzando i dati da /auth/me
  const [stats, setStats] = useState<UserStats>({
    averageRating: 0,
    goals: 0,
    assists: 0,
    appearances: 0,
    bestRating: 0,      // TODO: Da backend
    worstRating: 0,     // TODO: Da backend
  });
  const [pendingMatches, setPendingMatches] = useState<Match[]>([]);
  const [teammates, setTeammates] = useState<User[]>([]);

  // Stato per PlayerCard completa (con stelle)
  const [playerCardResult, setPlayerCardResult] = useState<PlayerCardResult | null>(null);

  // Stati per EditModal con debug
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editModalType, setEditModalType] = useState<'user-profile' | 'user-password'>('user-profile');

  // Gestione EditModal
  const handleEditProfile = () => {
    setEditModalType('user-profile');
    setEditModalOpen(true);
  };

  const handleChangePassword = () => {
    setEditModalType('user-password');
    setEditModalOpen(true);
  };

  const handleModalClose = () => {
    setEditModalOpen(false);
  };

  const handleModalSave = async (data: any) => {
    if (editModalType === 'user-profile') {
      // Chiamata Redux per aggiornare profilo
      const result = await dispatch(updateUserProfile({
        name: data.name,
        email: data.email,
        birthdate: data.birthdate
      }));

      if (updateUserProfile.fulfilled.match(result)) {
        toast({ title: 'Successo!', description: 'Profilo aggiornato con successo!' });
        setEditModalOpen(false);
        // Ricarica i dati per aggiornare la UI
        dispatch(loadEnrichedUserData());
        return { success: true };
      } else {
        const errorMessage = result.payload as string;
        toast({
          title: 'Errore',
          description: errorMessage || 'Impossibile aggiornare il profilo',
          variant: 'destructive'
        });
        return { success: false, error: errorMessage };
      }

    } else if (editModalType === 'user-password') {
      // Chiamata Redux per cambiare password - validazione delegata al backend
      const result = await dispatch(changeUserPassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword
      }));

      if (changeUserPassword.fulfilled.match(result)) {
        toast({ title: 'Successo!', description: 'Password cambiata con successo!' });
        setEditModalOpen(false); // Chiude modal solo in caso di successo
        return { success: true };
      } else {
        // Errore: modal rimane aperto, messaggio gestito dal backend
        const errorMessage = result.payload as string;
        toast({
          title: 'Errore',
          description: errorMessage || 'Impossibile cambiare la password',
          variant: 'destructive'
        });
        return { success: false, error: errorMessage };
      }
    }

    return { success: false, error: 'Operazione non riconosciuta' };
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  // Carica risultati PlayerCard completi (con stelle) - IDENTICA A PlayerCards
  const loadPlayerCardResults = async (userId: string) => {
    try {
      const timestamp = Date.now();
      const response = await apiCall(`/player-cards/results/user/${userId}?t=${timestamp}`);

      if (!response.success || !response.results || response.results.length === 0) {
        return null;
      }

      const latestResult = response.results[0];
      if (!latestResult.finalAttributes) {
        return null;
      }

      const dbOverallRating = latestResult.finalOverallRating;
      const attrs = latestResult.finalAttributes;
      const calculatedRating = Math.round(
        (attrs.tir + attrs.pas + attrs.dri + attrs.fin + attrs.vis + attrs.res + attrs.for) / 7
      );

      const finalRating = dbOverallRating || calculatedRating;

      const result: PlayerCardResult = {
        finalAttributes: latestResult.finalAttributes,
        finalAdditionalAttributes: latestResult.finalAdditionalAttributes, // ⭐ STELLE DAL DATABASE
        finalOverallRating: finalRating,
        profile: {
          mostVotedPosition: latestResult.consensusProfile?.mostVotedPosition || "CEN",
          preferredRole: "Centrocampista"
        }
      };

      setPlayerCardResult(result);
      return result;
    } catch (error) {
      console.error('Errore caricamento PlayerCard:', error);
      return null;
    }
  };

  // Forza sempre il caricamento di dati freschi da API
  useEffect(() => {
    if (user) {
      dispatch(loadEnrichedUserData());
    }
  }, [user?.id, dispatch]);

  // Carica i dati PlayerCard completi se l'utente ha una PlayerCard
  useEffect(() => {
    if (user?.id && user?.playerCard?.latestCard?.finalOverallRating) {
      loadPlayerCardResults(user.id);
    }
  }, [user?.id, user?.playerCard?.latestCard?.finalOverallRating]);

  // Main useEffect - utilizziamo i dati già disponibili da /auth/me
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Usiamo direttamente personalStats da /auth/me invece di calcolare
    if (user.personalStats) {
      setStats({
        averageRating: user.personalStats.averageRating || 0,
        goals: user.personalStats.totalGoals || 0,
        assists: user.personalStats.totalAssists || 0,
        appearances: user.personalStats.totalMatches || 0,
        bestRating: user.personalStats.bestRating || 0,
        worstRating: user.personalStats.worstRating || 0,
      });
    } else {
    }

    // Teammates da localStorage (SAFE approach)
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const currentTeamId = user.teams?.[0]?.id;
    const teamMembers = users.filter((u: any) => u.teamId === currentTeamId);
    setTeammates(teamMembers);

    // Pending matches (stessa logica di Home.tsx)
    const matches: Match[] = JSON.parse(localStorage.getItem('matches') || '[]');
    const teamMatches = matches.filter(m => m.teamId === currentTeamId);
    const pending = teamMatches.filter(m => m.status === 'active');
    setPendingMatches(pending);
  }, [user, navigate]);

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="pb-24 lg:pb-8">
        <div className="p-6 lg:p-8 space-y-8">
          {/* Player Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="bg-card/80 backdrop-blur-sm border-border shadow-card overflow-hidden">
              <CardContent className="p-6 lg:p-8">
                {/* Header Section - Responsive Layout */}
                <div className="mb-4">
                  {/* Mobile Layout - OTTIMIZZATO E BILANCIATO */}
                  <div className="block md:hidden space-y-4">
                    {/* Header compatto: Avatar + Info */}
                    <div className="flex items-center gap-4">
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Avatar className="w-20 h-20 border-4 border-primary/30 shadow-glow">
                          <AvatarImage src="" alt={user.name} />
                          <AvatarFallback className="bg-gradient-primary text-primary-foreground font-display text-xl">
                            {user.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                      </motion.div>

                      <div className="flex-1 min-w-0">
                        <h1 className="font-display text-2xl font-bold text-foreground leading-tight">
                          {user.name}
                        </h1>
                        <p className="text-muted-foreground text-base mt-1 break-all">{user.email}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Users className="w-5 h-5 text-primary" />
                          <span className="text-foreground font-semibold text-base">{user.teams?.[0]?.name || user.teamName || 'Team'}</span>
                        </div>
                      </div>
                    </div>

                    {/* TOT Badge se disponibile - layout orizzontale compatto */}


                    {/* Mobile Action Buttons - sotto TOT badge */}
                    <div className="flex items-center justify-center gap-4 mt-6">
                      <button
                        onClick={handleEditProfile}
                        className="flex items-center gap-2 px-4 py-2.5 bg-secondary/40 hover:bg-secondary/60 text-secondary-foreground hover:text-foreground transition-all duration-200 text-sm rounded-xl border border-border/40 hover:border-primary/30 shadow-sm"
                      >
                        <UserIcon className="w-4 h-4" />
                        <span>modifica profilo</span>
                      </button>
                      <button
                        onClick={handleChangePassword}
                        className="flex items-center gap-2 px-4 py-2.5 bg-secondary/40 hover:bg-secondary/60 text-secondary-foreground hover:text-foreground transition-all duration-200 text-sm rounded-xl border border-border/40 hover:border-primary/30 shadow-sm"
                      >
                        <KeyRound className="w-4 h-4" />
                        <span>cambia password</span>
                      </button>
                    </div>
                  </div>

                  {/* Desktop Layout */}
                  <div className="hidden md:flex items-center gap-8">
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Avatar className="w-28 h-28 lg:w-32 lg:h-32 border-4 border-primary/30 shadow-glow">
                        <AvatarImage src="" alt={user.name} />
                        <AvatarFallback className="bg-gradient-primary text-primary-foreground font-display text-4xl">
                          {user.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                    </motion.div>
                    <div className="flex-1 space-y-4">
                      <div className="space-y-2">
                        <h1 className="font-display text-4xl lg:text-6xl font-bold text-foreground leading-tight">
                          {user.name}
                        </h1>
                        <p className="text-muted-foreground text-xl mt-2">{user.email}</p>
                      </div>

                      <div className="flex flex-wrap gap-4 mt-6">
                        {/* Team Badge */}
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          className="inline-flex items-center gap-3 bg-secondary/40 px-6 py-3 rounded-xl border border-border/40 shadow-sm"
                        >
                          <Users className="w-6 h-6 text-primary" />
                          <span className="text-foreground font-bold text-lg">{user.teams?.[0]?.name || user.teamName || 'Team'}</span>
                        </motion.div>

                        {/* Card TOT Badge - da /auth/me */}
                        {user.playerCard?.latestCard?.finalOverallRating && (
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            className="inline-flex items-center gap-3 bg-accent/20 px-6 py-3 rounded-xl border border-accent/30 shadow-sm"
                          >
                            <Star className="w-6 h-6 text-accent" />
                            <span className="text-foreground font-bold text-2xl">{Math.round(user.playerCard.latestCard.finalOverallRating)}</span>
                            <span className="text-muted-foreground text-base flex items-center gap-1">
                              TOT
                              <StatsTooltip type="tot" />
                            </span>
                          </motion.div>
                        )}

                        {/* Match Average Badge */}
                        {stats.appearances > 0 && (
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            className="inline-flex items-center gap-3 bg-primary/20 px-6 py-3 rounded-xl border border-primary/30 shadow-sm"
                          >
                            <TrendingUp className="w-6 h-6 text-primary" />
                            <span className="text-foreground font-bold text-2xl">{stats.averageRating}</span>
                            <span className="text-muted-foreground text-base flex items-center gap-1">
                              Media
                              <StatsTooltip type="media" />
                            </span>
                          </motion.div>
                        )}
                      </div>

                      {/* Bottoni Edit */}
                      <div className="flex gap-3 mt-4">
                        <Button
                          onClick={handleEditProfile}
                          variant="outline"
                          size="sm"
                          className="bg-primary/10 hover:bg-primary/20 border-primary/30"
                        >
                          <UserIcon className="w-4 h-4 mr-2" />
                          Modifica Profilo
                        </Button>
                        <Button
                          onClick={handleChangePassword}
                          variant="outline"
                          size="sm"
                          className="bg-accent/10 hover:bg-accent/20 border-accent/30"
                        >
                          <Lock className="w-4 h-4 mr-2" />
                          Cambia Password
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* My Player Card - con dati completi incluse stelle */}
          {playerCardResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <Card className="bg-card/80 backdrop-blur-sm border-border shadow-card">
                <CardHeader className="border-b border-border bg-gradient-to-r from-accent/10 to-primary/10">
                  <CardTitle className="flex items-center gap-3 font-display text-2xl">
                    <Star className="w-7 h-7 text-accent" />
                    La Tua Player Card
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Attributi valutati dal tuo team
                  </p>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    {/* Header con TOT prominente */}
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">TOT</div>
                      <div className={`font-display text-5xl font-black leading-none ${playerCardResult.finalOverallRating >= 80 ? 'text-green-500' :
                        playerCardResult.finalOverallRating >= 70 ? 'text-yellow-500' :
                          playerCardResult.finalOverallRating >= 60 ? 'text-orange-500' :
                            'text-red-500'
                        }`}>
                        {Math.round(playerCardResult.finalOverallRating)}
                      </div>
                      <div className="text-sm text-muted-foreground font-medium mt-1">
                        {playerCardResult.profile.mostVotedPosition || 'Centrocampista'}
                      </div>
                    </div>

                    {/* Attributi */}
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">TIR (Tiro)</span>
                          <span className="font-bold text-foreground">{playerCardResult.finalAttributes.tir}</span>
                        </div>
                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-800"
                            style={{ width: `${Math.min(playerCardResult.finalAttributes.tir, 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">PAS (Passaggio)</span>
                          <span className="font-bold text-foreground">{playerCardResult.finalAttributes.pas}</span>
                        </div>
                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-800"
                            style={{ width: `${Math.min(playerCardResult.finalAttributes.pas, 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">DRI (Dribbling)</span>
                          <span className="font-bold text-foreground">{playerCardResult.finalAttributes.dri}</span>
                        </div>
                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-800"
                            style={{ width: `${Math.min(playerCardResult.finalAttributes.dri, 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">FIN (Finalizzazione)</span>
                          <span className="font-bold text-foreground">{playerCardResult.finalAttributes.fin}</span>
                        </div>
                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-800"
                            style={{ width: `${Math.min(playerCardResult.finalAttributes.fin, 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">VIS (Visione)</span>
                          <span className="font-bold text-foreground">{playerCardResult.finalAttributes.vis}</span>
                        </div>
                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-800"
                            style={{ width: `${Math.min(playerCardResult.finalAttributes.vis, 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">RES (Resistenza)</span>
                          <span className="font-bold text-foreground">{playerCardResult.finalAttributes.res}</span>
                        </div>
                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-800"
                            style={{ width: `${Math.min(playerCardResult.finalAttributes.res, 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">FOR (Forza)</span>
                          <span className="font-bold text-foreground">{playerCardResult.finalAttributes.for}</span>
                        </div>
                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-800"
                            style={{ width: `${Math.min(playerCardResult.finalAttributes.for, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Star Ratings */}
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Piede Debole</div>
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => {
                            const piedeDebole = playerCardResult.finalAdditionalAttributes?.piedeDebole || 3;
                            return (
                              <Star
                                key={i}
                                size={16}
                                className={i < piedeDebole
                                  ? "fill-primary text-primary"
                                  : "text-muted-foreground"}
                              />
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Skill</div>
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => {
                            const skill = playerCardResult.finalAdditionalAttributes?.skill || 3;
                            return (
                              <Star
                                key={i}
                                size={16}
                                className={i < skill
                                  ? "fill-primary text-primary"
                                  : "text-muted-foreground"}
                              />
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* 3 Box Statistiche Principali - Mobili ottimizzate */}
          {stats.appearances > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="grid grid-cols-3 gap-4"
            >
              {[
                {
                  icon: TrendingUp,
                  label: "Media",
                  value: stats.averageRating.toFixed(1),
                  color: "text-primary",
                  bgColor: "bg-primary/10",
                  borderColor: "border-primary/20"
                },
                {
                  icon: Goal,
                  label: "Gol",
                  value: stats.goals.toString(),
                  color: "text-accent",
                  bgColor: "bg-accent/10",
                  borderColor: "border-accent/20"
                },
                {
                  icon: Hand,
                  label: "Assist",
                  value: stats.assists.toString(),
                  color: "text-blue-400",
                  bgColor: "bg-blue-400/10",
                  borderColor: "border-blue-400/20"
                }
              ].map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 + 0.3 }}
                  whileHover={{ scale: 1.05 }}
                  className={`p-4 rounded-lg border ${stat.bgColor} ${stat.borderColor} transition-all hover:shadow-md`}
                >
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                    <div className={`text-2xl font-display font-bold ${stat.color} mb-1`}>
                      {stat.value}
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">
                      {stat.label}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Detailed Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="bg-card/80 backdrop-blur-sm border-border shadow-card">
              <CardHeader className="border-b border-border">
                <CardTitle className="flex items-center gap-3 font-display text-2xl">
                  <Trophy className="w-7 h-7 text-primary" />
                  Statistiche Dettagliate
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { icon: Trophy, label: "Presenze Totali", value: stats.appearances, gradient: "from-primary to-accent" },
                    { icon: TrendingUp, label: "Voto Migliore", value: stats.bestRating.toFixed(1), gradient: "from-green-500 to-emerald-500" },
                    { icon: TrendingDown, label: "Voto Peggiore", value: stats.worstRating.toFixed(1), gradient: "from-red-500 to-orange-500" },
                    { icon: Award, label: "Contributi Totali", value: stats.goals + stats.assists, gradient: "from-purple-500 to-pink-500" },
                  ].map((stat, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.02 }}
                      className="flex items-center justify-between p-5 bg-secondary/40 rounded-xl border border-border/50 hover:bg-secondary/60 hover:shadow-elevation transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <motion.div
                          whileHover={{ rotate: 360 }}
                          transition={{ duration: 0.5 }}
                          className={`w-12 h-12 rounded-lg bg-gradient-to-br ${stat.gradient} flex items-center justify-center group-hover:scale-110 transition-transform shadow-glow`}
                        >
                          <stat.icon className="w-6 h-6 text-white" />
                        </motion.div>
                        <span className="font-medium text-foreground">{stat.label}</span>
                      </div>
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: index * 0.1 + 0.2, type: "spring" }}
                        className="text-3xl font-display font-bold text-foreground"
                      >
                        {stat.value}
                      </motion.span>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Team Roster */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="bg-card/80 backdrop-blur-sm border-border shadow-card">
              <CardHeader className="border-b border-border">
                <CardTitle className="flex items-center gap-3 font-display text-2xl">
                  <Users className="w-7 h-7 text-primary" />
                  {user.teams?.[0]?.name || user.teamName || 'Team'} - Rosa Completa
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  Giocatori nel tuo team che puoi votare
                </p>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {teammates
                    .filter((teammate: User) => teammate.id !== user.id || true) // Mostriamo tutti
                    .map((teammate: User, index: number) => (
                      <motion.div
                        key={teammate.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ scale: 1.03 }}
                        className={`p-4 rounded-xl border transition-all ${teammate.id === user.id
                          ? 'bg-primary/10 border-primary/30 shadow-glow'
                          : 'bg-secondary/40 border-border/50 hover:bg-secondary/60'
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center font-display font-bold shadow-elevation">
                            <span className="text-primary-foreground">
                              {teammate.name.split(' ').map((n: string) => n[0]).join('')}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-foreground truncate">
                                {teammate.name}
                              </p>
                              {teammate.id === user.id && (
                                <Badge variant="secondary" className="text-xs">Tu</Badge>
                              )}
                            </div>
                            {teammate.email && (
                              <p className="text-xs text-muted-foreground truncate">
                                {teammate.email}
                              </p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Logout Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <Card className="bg-card/80 backdrop-blur-sm border-destructive/20 shadow-card hover:border-destructive/40 transition-colors">
              <CardContent className="p-6">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 transition-colors group">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-destructive to-red-600 flex items-center justify-center shadow-glow">
                            <LogOut className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-display font-bold text-foreground group-hover:text-destructive transition-colors">
                              Logout
                            </h3>
                          </div>
                        </div>
                        <div className="text-destructive opacity-60 group-hover:opacity-100 transition-opacity">
                          <LogOut className="w-5 h-5" />
                        </div>
                      </div>
                    </motion.div>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <LogOut className="w-5 h-5 text-destructive" />
                        Conferma Logout
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Sei sicuro di voler uscire dal tuo account?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annulla</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleLogout}
                        className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                      >
                        Esci
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* EditModal */}
      <EditModal
        isOpen={editModalOpen}
        onClose={handleModalClose}
        type={editModalType}
        data={editModalType === 'user-profile' ? {
          name: user?.name || '',
          email: user?.email || '',
          birthdate: user?.birthdate || ''
        } : {}}
        onSave={handleModalSave}
      />
    </DashboardLayout>
  );
};

export default Profile;
