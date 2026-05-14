import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/redux/store/store';
import { logout, loadEnrichedUserData, updateUserProfile, changeUserPassword, refreshUserData } from '@/redux/slices/authSlice';
import {
  fetchPlayerCardSessions,
  createPlayerCardSession,
  fetchTeamMembers,
  selectPlayerCardSessions,
  selectTeamMembers,
  selectIsLoadingTeamMembers
} from '@/redux/slices/votingSlice';
import { createTeam } from '@/redux/slices/teamSlice';
import { PlayerCardNavigator } from '@/components/PlayerCardNavigator';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { TrendingUp, Target, Users, Trophy, Award, TrendingDown, Star, LogOut, Goal, Hand, User as UserIcon, Lock, KeyRound } from 'lucide-react';
import { motion } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { RoleBadge, deriveMemberRole } from '@/components/RoleBadge';
import { Match, User } from '@/types/match';
// import { PlayerCardDisplay } from '@/components/PlayerCardDisplay';
import { StatsTooltip } from '@/components/StatsTooltip';
import EditModal from '@/components/EditModal';
import { apiCall } from '@/lib/api';
import { toast } from 'sonner';
import { useToast } from '@/hooks/use-toast';
import { calculateAge } from '@/utils/playerCardCalculations';
import { isAdmin } from '@/utils/permissions';

// Semplifichiamo l'interface utilizzando i dati già disponibili
interface UserStats {
  averageRating: number;
  goals: number;
  assists: number;
  appearances: number;
  bestRating: number;
  worstRating: number;
}


const Profile = () => {
  const { user, isGuest } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redux selectors esattamente come in PlayerCards
  const playerCardSessions = useSelector(selectPlayerCardSessions);
  const teamMembers = useSelector(selectTeamMembers);
  const isLoadingTeamMembers = useSelector(selectIsLoadingTeamMembers);

  // Local state esattamente come in PlayerCards
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [showVoteForm, setShowVoteForm] = useState(false);

  // Stato dialog crea team
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);

  const handleCreateTeamSubmit = async () => {
    if (!newTeamName.trim()) return;
    setIsCreatingTeam(true);
    try {
      const result = await dispatch(createTeam({ name: newTeamName.trim() }));
      if (createTeam.fulfilled.match(result)) {
        toast({ title: 'Team creato!', description: `"${newTeamName.trim()}" creato con successo.` });
        setCreateTeamOpen(false);
        setNewTeamName('');
        await dispatch(refreshUserData());
        await dispatch(loadEnrichedUserData());
      } else {
        toast({ title: 'Errore', description: 'Impossibile creare il team.', variant: 'destructive' });
      }
    } finally {
      setIsCreatingTeam(false);
    }
  };

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

  // Stati per EditModal con debug
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editModalType, setEditModalType] = useState<'user-profile' | 'user-password'>('user-profile');
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  // Carica team members quando il componente si monta - ESATTAMENTE COME IN PLAYERCARDS
  useEffect(() => {
    if (user?.teams?.[0]?.id && teamMembers.length === 0) {
      dispatch(fetchTeamMembers(user.teams[0].id));
    }
  }, [user, teamMembers.length, dispatch]);

  // Usa team members reali invece di fake players - ESATTAMENTE COME IN PLAYERCARDS
  const allPlayers = React.useMemo(() => {
    // Se sta caricando o non ci sono teamMembers, ritorna array vuoto
    // NON usare mai fake players
    if (isLoadingTeamMembers || !teamMembers || teamMembers.length === 0) {
      return [];
    }
    // Usa team members reali dal backend
    const mappedPlayers = teamMembers.map(member => ({
      id: member.id,        // Fix: usa 'id' invece di '_id'
      name: member.name,
      email: member.email,
      age: member.birthdate ? calculateAge(member.birthdate) : 25 // Calcola età reale da birthdate
    }));
    return mappedPlayers;
  }, [teamMembers, isLoadingTeamMembers]);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    // Load player card sessions from API - ESATTAMENTE COME IN PLAYERCARDS
    dispatch(fetchPlayerCardSessions({}));
  }, [user, navigate, dispatch]);

  // Funzioni handler esattamente come in PlayerCards
  const handleCreatePlayerCardSession = async (playerId: string) => {
    // Guard admin: la creazione sessione PlayerCard è riservata agli admin
    // globali. Il backend la blinda comunque (requireRole('admin')), qui
    // evitiamo la chiamata 403 e mostriamo un messaggio chiaro.
    // TODO: nascondere il bottone in PlayerCardNavigator quando refactoring UI.
    if (!isAdmin(user)) {
      toast({
        title: 'Azione riservata',
        description: 'Solo gli amministratori possono avviare una nuova valutazione PlayerCard.',
        variant: 'destructive'
      });
      return;
    }

    const targetPlayer = allPlayers.find(p => p.id === playerId);
    if (!targetPlayer) return;

    try {
      const response = await dispatch(createPlayerCardSession({
        targetPlayerId: targetPlayer.id,
        title: `Valuta ${targetPlayer.name}`,
        description: `Esprimi la tua valutazione sulle abilità di ${targetPlayer.name}`,
        teamId: user?.teams?.[0]?.id
      })).unwrap();
      // Sessione creata con successo

      // 🟢 AUTO-APERTURA form voto (COME MATCH PATTERN)
      if (response.votingSession && response.autoOpenVoteForm) {
        setSelectedSession(response.votingSession.id);
        setShowVoteForm(true);
        // Form di voto aperto automaticamente
      }

      // Ricarica le sessioni
      dispatch(fetchPlayerCardSessions({}));
    } catch (error) {
      console.error('Errore creazione sessione:', error);
    }
  };

  // Gestisce l'apertura del form di voto per Navigator
  const handleOpenVoteForm = (sessionId: string) => {
    setSelectedSession(sessionId);
    setShowVoteForm(true);
  };

  // Vera API per risultati finali
  const handleLoadResults = async (playerId: string) => {
    try {
      // Chiama la vera API con timestamp per bypassare cache
      const timestamp = Date.now();
      const response = await apiCall(`/player-cards/results/user/${playerId}?t=${timestamp}`);

      if (!response.success || !response.results || response.results.length === 0) {
        return null;
      }

      // Prendi il risultato più recente 
      const latestResult = response.results[0];
      // 📝 Verifica che il risultato abbia i dati necessari
      if (!latestResult.finalAttributes) {
        return null;
      }

      // ✅ USA IL VALORE REALE DAL DATABASE invece di calcolarlo
      const dbOverallRating = latestResult.finalOverallRating;

      // Fallback se non disponibile nel DB (calcolo manuale)
      const attrs = latestResult.finalAttributes;
      const calculatedRating = Math.round(
        (attrs.tir + attrs.pas + attrs.dri + attrs.fin + attrs.vis + attrs.res + attrs.for) / 7
      );

      const finalRating = dbOverallRating || calculatedRating;
      // Mappa la risposta API al formato PlayerCardResult
      const result = {
        finalAttributes: latestResult.finalAttributes,
        goalkeeperAttributes: latestResult.goalkeeperAttributes, // ✅ PORTIERI DAL DATABASE
        finalAdditionalAttributes: latestResult.finalAdditionalAttributes, // ⭐ STELLE DAL DATABASE
        finalOverallRating: finalRating, // ✅ VALORE REALE DAL DATABASE
        grade: finalRating >= 80 ? "A" : finalRating >= 70 ? "B" : "C",
        profile: {
          mostVotedPosition: latestResult.consensusProfile?.mostVotedPosition || "CEN",
          preferredRole: "Centrocampista"
        },
        metadata: {
          totalVoters: latestResult.sessionMetadata?.totalVoters || latestResult.totalVotes || 4,
          confidence: latestResult.statistics?.overallStats?.confidence || 95
        }
      };
      return result;

    } catch (error) {
      console.error('📊 Errore caricamento risultati:', error);
      return null;
    }
  };

  // Mappatura sessions per PlayerCardNavigator format
  const mappedSessions = React.useMemo(() => {
    return playerCardSessions.map(session => {
      const targetIdValue = session.targetId as any;
      const targetIdString = targetIdValue ? (typeof targetIdValue === 'object' ? (targetIdValue._id || targetIdValue.id) : targetIdValue) : '';

      return {
        id: session.id,
        targetId: targetIdString,
        status: session.status as 'active' | 'completed',
        hasVoted: session.hasVoted || false,
        canVote: session.canVote || false,
        submissionsCount: session.submissionsCount || 0,
        participationRate: session.participationRate
      };
    });
  }, [playerCardSessions]);

  // Check User profile con playercard per mostrare subito la sua card
  const userPlayerCardSession = mappedSessions.find(s => s.targetId === user?.id);

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



  // Forza sempre il caricamento di dati freschi da API
  useEffect(() => {
    if (user) {
      dispatch(loadEnrichedUserData());
    }
  }, [user?.id, dispatch]);



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

    // Pending matches (stessa logica di Home.tsx)
    const currentTeamId = user.teams?.[0]?.id;
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


                    {/* Mobile Action Buttons - sotto TOT badge.
                        Nascosti ai guest: prima di registrarsi non possono
                        modificare profilo né password (azioni che presuppongono
                        un account user pieno). */}
                    {!isGuest && (
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
                    )}
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

                      {/* Bottoni Edit - nascosti ai guest (vedi commento sopra) */}
                      {!isGuest && (
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
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

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


          {/* Crea il tuo team - visibile solo se l'utente non ha team */}
          {!user.teams?.length && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <Card className="bg-accent/10 border-accent/30 shadow-card">
                <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                      <Users className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-foreground">Nessun team associato</h3>
                      <p className="text-sm text-muted-foreground">Crea il tuo team per iniziare a giocare</p>
                    </div>
                  </div>
                  <Button onClick={() => setCreateTeamOpen(true)} className="bg-accent text-accent-foreground hover:bg-accent/90 shrink-0">
                    <Users className="w-4 h-4 mr-2" />
                    Crea il tuo team
                  </Button>
                </CardContent>
              </Card>

              {/* Dialog creazione team */}
              <Dialog open={createTeamOpen} onOpenChange={setCreateTeamOpen}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-accent" />
                      Crea il tuo team
                    </DialogTitle>
                  </DialogHeader>
                  <div className="py-2">
                    <Input
                      placeholder="Nome del team..."
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateTeamSubmit()}
                      autoFocus
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateTeamOpen(false)}>Annulla</Button>
                    <Button onClick={handleCreateTeamSubmit} disabled={!newTeamName.trim() || isCreatingTeam}>
                      {isCreatingTeam ? 'Creazione...' : 'Crea team'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </motion.div>
          )}

          {/* Player Cards Navigator */}
          {!isLoadingTeamMembers && allPlayers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >


              <PlayerCardNavigator
                players={allPlayers}
                sessions={mappedSessions}
                onCreateSession={handleCreatePlayerCardSession}
                onVote={handleOpenVoteForm}
                onLoadResults={handleLoadResults}
                initialPlayerId={user.id}
                showNavigation={false}
              />


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
                  {teamMembers
                    .filter((teammate) => teammate.id !== user.id || true) // Mostriamo tutti
                    .map((teammate, index: number) => {
                      const role = deriveMemberRole(teammate as any, []);
                      return (
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
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-foreground truncate">
                                  {teammate.name}
                                </p>
                                {teammate.id === user.id && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">Tu</Badge>
                                )}
                                <RoleBadge role={role} />
                              </div>
                              {teammate.email && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {teammate.email}
                                </p>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
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
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="cursor-pointer"
                  onClick={() => setLogoutDialogOpen(true)}
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
              </CardContent>
            </Card>

            <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
              <DialogContent
                className="w-[calc(100%-2rem)] max-w-xs rounded-xl p-0 gap-0"
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                <DialogHeader className="px-4 pt-4 pb-2">
                  <DialogTitle className="flex items-center gap-2 text-base">
                    <LogOut className="w-4 h-4 text-destructive" />
                    Conferma Logout
                  </DialogTitle>
                </DialogHeader>
                <div className="px-4 pb-3">
                  <p className="text-sm text-muted-foreground">Sei sicuro di voler uscire dal tuo account?</p>
                </div>
                <DialogFooter className="px-4 py-3 flex-row gap-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-9 text-sm"
                    onClick={() => setLogoutDialogOpen(false)}
                  >
                    Annulla
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 h-9 text-sm bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                    onClick={handleLogout}
                  >
                    Esci
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
