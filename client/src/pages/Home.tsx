import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/redux/store/store';
import { selectPendingVoteSessions } from '@/redux/slices/votingSlice';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Medal, Target, TrendingUp, Crown, AlertCircle, Star, Goal, BarChart3, Hand, Users, Vote as VoteIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { FakeNews } from '@/components/FakeNews';
import { BadgesSection } from '@/components/BadgesSection';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { createTeam } from '@/redux/slices/teamSlice';
import { refreshUserData } from '@/redux/slices/authSlice';
import { toast } from 'sonner';
import MatchCard from '@/components/MatchCard';
import { OnboardingTutorial } from '@/components/OnboardingTutorial';
import useHomeDashboard from '@/hooks/useHomeDashboard';
import { WeatherWidget } from '@/components/WeatherWidget';
import { isAdmin, isTeamAdmin } from '@/utils/permissions';
import { userAvatarUrl, playerLeaderboardAvatarUrl } from '@/utils/avatarUrl';
import SeasonSelector from '@/components/SeasonSelector';

// Types now handled by useHomeDashboard hook
type LeaderboardType = 'rating' | 'goals' | 'assists' | 'playercard' | 'stats-per-match';

const Home = () => {
  const { user, isGuest } = useSelector((state: RootState) => state.auth);
  const { currentTeam } = useSelector((state: RootState) => state.teams);
  const pendingVoteSessions = useSelector(selectPendingVoteSessions);
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  // 🔐 Solo admin globale o team admin può creare partite (specchio del backend).
  //    I player normali e i guest vedono il bottone in stato "disabled" (stesso
  //    stile del "Vota Partita" quando non c'è nulla da votare).
  const canCreateMatch = isAdmin(user) || isTeamAdmin(user, currentTeam as any);

  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    setIsCreatingTeam(true);
    try {
      const result = await dispatch(createTeam({ name: newTeamName.trim() }));
      if (createTeam.fulfilled.match(result)) {
        toast.success(`Team "${newTeamName.trim()}" creato con successo!`);
        setCreateTeamOpen(false);
        setNewTeamName('');
        await dispatch(refreshUserData());
      } else {
        toast.error('Errore nella creazione del team.');
      }
    } finally {
      setIsCreatingTeam(false);
    }
  };

  // 🎯 Usa useHomeDashboard invece di logica duplicata
  const {
    news,
    leaderboard,
    pendingMatches,
    allUsers,
    showOnboarding,
    activeLeaderboard,
    isLoading,
    error,
    setActiveLeaderboard,
    handleOnboardingComplete,
    loadLeaderboard,
    seasons,
    selectedSeason,
    setSelectedSeason,
    showSelector,
  } = useHomeDashboard();

  const handleTabChange = (newTab: LeaderboardType) => {
    setActiveLeaderboard(newTab);
    // useHomeDashboard gestisce automaticamente il caricamento
  };

  if (!user) return null;

  // Funzioni per titolo e sottotitolo dinamici
  const getLeaderboardTitle = (type: LeaderboardType) => {
    switch (type) {
      case 'rating':
        return 'Classifica';
      case 'goals':
        return 'Marcatori';
      case 'assists':
        return 'Assist';
      case 'playercard':
        return 'Player Card';
      case 'stats-per-match':
        return 'Gol-Assist / Partita';
      default:
        return 'Classifica';
    }
  };

  const getLeaderboardIcon = (type: LeaderboardType) => {
    const cls = 'w-5 h-5 text-primary';
    switch (type) {
      case 'rating': return <BarChart3 className={cls} />;
      case 'goals': return <Goal className={cls} />;
      case 'assists': return <Hand className={cls} />;
      case 'playercard': return <Star className={cls} />;
      case 'stats-per-match': return <TrendingUp className={cls} />;
      default: return <BarChart3 className={cls} />;
    }
  };

  const getLeaderboardSubtitle = (type: LeaderboardType) => {
    switch (type) {
      case 'rating':
        return 'Classifica complessiva per media voti nelle partite';
      case 'goals':
        return 'Chi ha segnato più gol nelle partite';
      case 'assists':
        return 'Chi ha fornito più assist ai compagni';
      case 'playercard':
        return 'Rating TOT dalle valutazioni complete dei giocatori';
      case 'stats-per-match':
        return 'Media Gol a Partita e Assist a Partita. \n Ordinati per G/P, con A/P come secondo criterio.';
      default:
        return 'Classifica complessiva per media voti nelle partite';
    }
  };

  // Funzione per ottenere il valore primario in base al tipo di classifica
  const getPrimaryValue = (player: any, type: LeaderboardType) => {
    switch (type) {
      case 'rating':
        return player.averageRating ? player.averageRating.toFixed(1) : '0.0';
      case 'goals':
        return (player.totalGoals || 0).toString();
      case 'assists':
        return (player.totalAssists || 0).toString();
      case 'playercard':
        // Il campo corretto è playerCardTOT
        const cardValue = player.playerCardTOT || player.playerCardAverage;
        return cardValue ? Math.round(cardValue).toString() : 'N/A';
      case 'stats-per-match':
        // 🆕 Stats-per-match mostra GOL per partita come primario
        return player.goalPerMatch ? player.goalPerMatch.toFixed(2) : '0.00';
      default:
        return '';
    }
  };

  // 🆕 NUOVA FUNZIONE: Ottieni il valore secondario (per stats-per-match)
  const getSecondaryValue = (player: any, type: LeaderboardType) => {
    switch (type) {
      case 'stats-per-match':
        // Stats-per-match mostra ASSIST per partita come secondario
        return player.assistPerMatch ? player.assistPerMatch.toFixed(2) : '0.00';
      default:
        return '';
    }
  };

  // Funzione per ottenere la label del valore primario
  const getPrimaryLabel = (type: LeaderboardType) => {
    switch (type) {
      case 'rating':
        return 'Media';
      case 'goals':
        return 'Gol';
      case 'assists':
        return 'Assist';
      case 'playercard':
        return 'TOT';
      case 'stats-per-match':
        return 'G/P';
      default:
        return '';
    }
  };

  // 🆕 NUOVA FUNZIONE: Ottieni la label del valore secondario
  const getSecondaryLabel = (type: LeaderboardType) => {
    switch (type) {
      case 'stats-per-match':
        return 'A/P';
      default:
        return '';
    }
  };

  const getMedalIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-8 h-8 text-primary drop-shadow-glow" />;
    if (index === 1) return <Medal className="w-7 h-7 text-slate-300 drop-shadow-glow" />;
    if (index === 2) return <Medal className="w-6 h-6 text-amber-600 drop-shadow-glow" />;
    return null;
  };

  return (
    <DashboardLayout>
      {/* Onboarding Tutorial */}
      {showOnboarding && (
        <OnboardingTutorial onComplete={handleOnboardingComplete} />
      )}

      <div className="pb-24 lg:pb-8">
        <div className="p-6 lg:p-8 space-y-6">
          {/* Compact Welcome & Stats Banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="space-y-3">
              <div>
                <h1 className="font-display text-3xl lg:text-4xl font-bold text-foreground mb-1">
                  👋 Ciao {user.name || user.username}!
                </h1>
                <p className="text-muted-foreground text-lg">
                  🏆 Team {user.teams?.[0]?.name || user.teamName || 'Football Club'}
                </p>
              </div>
              {!isGuest && (
                <motion.div whileTap={{ scale: 0.95 }} className="flex items-center gap-2 w-full">
                  {user.teams?.length ? (
                    canCreateMatch ? (
                      <button
                        onClick={() => navigate('/create-match')}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 text-base font-semibold rounded-lg bg-primary text-primary-foreground shadow-glow"
                      >
                        <Target className="w-4 h-4" />
                        Crea Partita
                      </button>
                    ) : (
                      // 🚫 Player non-admin: stesso stile "inattivo" di Vota Partita,
                      //    così è chiaro che il bottone esiste ma non gli è abilitato.
                      <span
                        className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 text-base font-semibold rounded-lg border-2 border-border/30 text-muted-foreground/50 bg-transparent cursor-not-allowed select-none"
                        title="Solo gli admin del team possono creare partite"
                      >
                        <Target className="w-4 h-4 opacity-40" />
                        Crea Partita
                      </span>
                    )
                  ) : (
                    <button
                      onClick={() => setCreateTeamOpen(true)}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 text-base font-semibold rounded-lg bg-accent text-accent-foreground shadow-glow"
                    >
                      <Users className="w-4 h-4" />
                      Crea il tuo team
                    </button>
                  )}

                  {/* Pulsante Vota Partite */}
                  {pendingVoteSessions.length > 0 ? (
                    <button
                      onClick={() => {
                        if (pendingVoteSessions.length === 1) {
                          navigate('/vote', { state: { autoSessionId: pendingVoteSessions[0].id } });
                        } else {
                          navigate('/vote');
                        }
                      }}
                      className="flex-1 relative inline-flex items-center justify-center gap-2 px-5 py-3 text-base font-semibold rounded-lg text-primary bg-background/50 overflow-visible"
                    >
                      {/* Solo il bordo animato */}
                      <span className="absolute inset-0 rounded-lg border-2 border-primary animate-pulse pointer-events-none" />
                      {/* Badge contatore sessioni multiple */}
                      {pendingVoteSessions.length > 1 && (
                        <span className="absolute -top-2 -right-2 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shadow animate-pulse">
                          {pendingVoteSessions.length}
                        </span>
                      )}
                      <VoteIcon className="w-4 h-4 relative z-10" />
                      <span className="relative z-10">Vota ora!</span>
                    </button>
                  ) : (
                    <span className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 text-base font-semibold rounded-lg border-2 border-border/30 text-muted-foreground/50 bg-transparent cursor-default select-none">
                      <VoteIcon className="w-4 h-4 opacity-40" />
                      Vota Partita
                    </span>
                  )}
                </motion.div>
              )}

              {/* Guest: stesso layout 2 colonne, ma "Crea Partita" sempre disabilitato
                  (i guest non possono crearle) — coerente con i player non-admin. */}
              {isGuest && (
                <motion.div whileTap={{ scale: 0.95 }} className="flex items-center gap-2 w-full">
                  <span
                    className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 text-base font-semibold rounded-lg border-2 border-border/30 text-muted-foreground/50 bg-transparent cursor-not-allowed select-none"
                    title="Solo gli admin del team possono creare partite"
                  >
                    <Target className="w-4 h-4 opacity-40" />
                    Crea Partita
                  </span>

                  {pendingVoteSessions.length > 0 ? (
                    <button
                      onClick={() => {
                        if (pendingVoteSessions.length === 1) {
                          navigate('/vote', { state: { autoSessionId: pendingVoteSessions[0].id } });
                        } else {
                          navigate('/vote');
                        }
                      }}
                      className="flex-1 relative inline-flex items-center justify-center gap-2 px-5 py-3 text-base font-semibold rounded-lg text-primary bg-background/50 overflow-visible"
                    >
                      <span className="absolute inset-0 rounded-lg border-2 border-primary animate-pulse pointer-events-none" />
                      {pendingVoteSessions.length > 1 && (
                        <span className="absolute -top-2 -right-2 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shadow animate-pulse">
                          {pendingVoteSessions.length}
                        </span>
                      )}
                      <VoteIcon className="w-4 h-4 relative z-10" />
                      <span className="relative z-10">Vota Partita</span>
                    </button>
                  ) : (
                    <span className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 text-base font-semibold rounded-lg border-2 border-border/30 text-muted-foreground/50 bg-transparent cursor-default select-none">
                      <VoteIcon className="w-4 h-4 opacity-40" />
                      Vota Partita
                    </span>
                  )}
                </motion.div>
              )}
            </div>

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
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateTeam()}
                    autoFocus
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateTeamOpen(false)}>Annulla</Button>
                  <Button onClick={handleCreateTeam} disabled={!newTeamName.trim() || isCreatingTeam}>
                    {isCreatingTeam ? 'Creazione...' : 'Crea team'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <WeatherWidget />

            {/* Compact Stats Row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  icon: TrendingUp,
                  label: "Giocatori",
                  value: user.teams?.[0]?.teamStats?.activePlayers ?? leaderboard.length,
                  color: "text-primary"
                },
                {
                  icon: Goal,
                  label: "Gol",
                  value: user.teams?.[0]?.teamStats?.totalGoals ?? leaderboard.reduce((sum, p) => sum + p.totalGoals, 0),
                  color: "text-accent"
                },
                {
                  icon: Trophy,
                  label: "Partite",
                  value: user.teams?.[0]?.teamStats?.totalMatches ?? leaderboard.reduce((sum, p) => sum + p.totalMatches, 0),
                  color: "text-yellow-400"
                },
              ].map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="bg-card/60 backdrop-blur-sm border-border transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <stat.icon className={`w-5 h-5 ${stat.color}`} />
                        <span className="text-2xl font-display font-bold text-foreground">
                          {stat.value}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Pending Matches Section */}
          {pendingMatches.length > 0 && user && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="bg-card/80 backdrop-blur-sm shadow-card border-accent/30">
                <CardHeader className="border-b border-border bg-accent/10">
                  <CardTitle className="flex items-center gap-3 font-display text-2xl">
                    <AlertCircle className="w-6 h-6 text-accent" />
                    Azioni Richieste
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {pendingMatches.map((match) => (
                      <MatchCard
                        key={match.id}
                        match={match}
                        currentUserId={user._id}
                        showActions={true}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Fake News - Prominent Section */}
          <FakeNews news={news} />

          {/* Leaderboard with Tabs - HERO SECTION */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-card/80 backdrop-blur-sm border-border shadow-card">
              <CardHeader className="border-b border-border bg-gradient-to-r from-primary/10 to-accent/10">
                {/* Riga 1: icona tab-specifica + selettore stagione — sempre su una riga */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getLeaderboardIcon(activeLeaderboard)}
                  </div>
                  <SeasonSelector
                    seasons={seasons}
                    selectedSeason={selectedSeason}
                    onSeasonChange={setSelectedSeason}
                    showSelector={showSelector}

                  />
                </div>
                {/* Riga 2: titolo grande libero da vincoli di spazio */}
                <CardTitle className="font-display text-3xl leading-tight mt-2">
                  {getLeaderboardTitle(activeLeaderboard)}
                </CardTitle>
                <p className="hidden md:block text-muted-foreground text-sm mt-1">
                  {getLeaderboardSubtitle(activeLeaderboard)}
                </p>
              </CardHeader>
              <CardContent className="p-6">
                <Tabs value={activeLeaderboard} onValueChange={handleTabChange} className="w-full">
                  <TabsList className="grid w-full grid-cols-5 mb-6">
                    <TabsTrigger value="rating" className="flex items-center gap-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                      <BarChart3 className={`w-4 h-4 ${activeLeaderboard === 'rating' ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className={`hidden sm:inline ${activeLeaderboard === 'rating' ? 'text-primary' : 'text-muted-foreground'}`}>Media</span>
                    </TabsTrigger>
                    <TabsTrigger value="goals" className="flex items-center gap-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                      <Goal className={`w-4 h-4 ${activeLeaderboard === 'goals' ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className={`hidden sm:inline ${activeLeaderboard === 'goals' ? 'text-primary' : 'text-muted-foreground'}`}>Gol</span>
                    </TabsTrigger>
                    <TabsTrigger value="assists" className="flex items-center gap-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                      <Hand className={`w-4 h-4 ${activeLeaderboard === 'assists' ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className={`hidden sm:inline ${activeLeaderboard === 'assists' ? 'text-primary' : 'text-muted-foreground'}`}>Assist</span>
                    </TabsTrigger>
                    <TabsTrigger value="playercard" className="flex items-center gap-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                      <Star className={`w-4 h-4 ${activeLeaderboard === 'playercard' ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className={`hidden sm:inline ${activeLeaderboard === 'playercard' ? 'text-primary' : 'text-muted-foreground'}`}>Card</span>
                    </TabsTrigger>
                    <TabsTrigger value="stats-per-match" className="flex items-center gap-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                      <TrendingUp className={`w-4 h-4 ${activeLeaderboard === 'stats-per-match' ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className={`hidden sm:inline ${activeLeaderboard === 'stats-per-match' ? 'text-primary' : 'text-muted-foreground'}`}>Gol-Assist X Match</span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value={activeLeaderboard} className="space-y-0">
                    {isLoading.leaderboard ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-12 text-center"
                      >
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                        <p className="text-muted-foreground">Caricamento classifica...</p>
                      </motion.div>
                    ) : error.leaderboard ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-12 text-center"
                      >
                        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
                        <p className="text-destructive font-semibold mb-2">Errore di caricamento</p>
                        <p className="text-muted-foreground mb-4">{error.leaderboard}</p>
                        <button
                          onClick={() => loadLeaderboard(activeLeaderboard, user?.teams?.[0]?.id)}
                          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
                        >
                          Riprova
                        </button>
                      </motion.div>
                    ) : leaderboard.length === 0 ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-16"
                      >
                        <Trophy className="w-20 h-20 text-muted-foreground/30 mx-auto mb-4" />
                        <p className="text-muted-foreground text-xl mb-2">
                          Nessuna partita registrata
                        </p>
                        <p className="text-muted-foreground/70">
                          Inizia creando una nuova partita!
                        </p>
                      </motion.div>
                    ) : (
                      <div className="space-y-3">
                        {leaderboard.map((player, index) => (
                          <motion.div
                            key={player.playerId}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex items-center justify-between p-5 pt-10 bg-secondary/40 rounded-xl transition-all duration-300 border border-border/50 relative overflow-hidden"
                          >
                            {/* Posizione classifica — stesso stile dello Storico */}
                            <span className="absolute top-3 left-3 text-xs font-mono bg-secondary/40 px-2 py-1 rounded text-muted-foreground z-10">
                              #{index + 1}
                            </span>

                            {/* MVP Crown for top player */}
                            {index === 0 && (
                              <motion.div
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ delay: 0.5, type: "spring" }}
                                className="absolute -top-1 -right-1"
                              >
                                <Crown className="w-8 h-8 text-primary drop-shadow-glow" fill="hsl(var(--primary))" />
                              </motion.div>
                            )}
                            <div className={`flex items-center ${activeLeaderboard === 'stats-per-match' ? 'gap-2' : 'gap-5'} flex-1`}>
                              {activeLeaderboard !== 'stats-per-match' && (
                                <motion.div
                                  transition={{ duration: 0.5 }}
                                  className="relative w-12 h-12"
                                >
                                  <Avatar className="w-12 h-12 rounded-lg">
                                    <AvatarImage src={playerLeaderboardAvatarUrl(player)} alt={player.playerName} />
                                    <AvatarFallback className="bg-gradient-to-br from-primary/30 to-accent/30 text-foreground font-display font-bold text-sm">
                                      {player.playerName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'}
                                    </AvatarFallback>
                                  </Avatar>
                                  {/* Icona podio solo per i primi 3 — senza cerchio */}
                                  {getMedalIcon(index) && (
                                    <motion.div
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      transition={{ duration: 0.3 }}
                                      className="absolute -bottom-2 -right-2 z-10"
                                    >
                                      {getMedalIcon(index)}
                                    </motion.div>
                                  )}
                                </motion.div>
                              )}
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-display text-xl font-bold text-foreground">
                                    {player.playerName}
                                  </p>
                                </div>
                                {/* Stats Summary */}
                                <div className={`flex items-center ${activeLeaderboard === 'stats-per-match' ? 'gap-1.5 sm:gap-2' : 'gap-3 sm:gap-4'} text-sm`}>
                                  <span className={`flex items-center ${activeLeaderboard === 'stats-per-match' ? 'gap-0.5' : 'gap-1'}`}>
                                    <span className="text-muted-foreground text-xs uppercase tracking-wide">PG</span>
                                    <span className="font-bold text-foreground">{player.totalMatches || 0}</span>
                                  </span>
                                  <span className={`flex items-center ${activeLeaderboard === 'stats-per-match' ? 'gap-0.5' : 'gap-1'}`}>
                                    <span className="text-muted-foreground text-xs uppercase tracking-wide">G</span>
                                    <span className="font-bold text-primary">{player.totalGoals || 0}</span>
                                  </span>
                                  <span className={`flex items-center ${activeLeaderboard === 'stats-per-match' ? 'gap-0.5' : 'gap-1'}`}>
                                    <span className="text-muted-foreground text-xs uppercase tracking-wide">A</span>
                                    <span className="font-bold text-accent">{player.totalAssists || 0}</span>
                                  </span>
                                  <span className="hidden md:flex items-center gap-1.5">
                                    <BarChart3 className="w-4 h-4 text-muted-foreground" />
                                    <span className="font-bold text-foreground">{player.averageRating ? player.averageRating.toFixed(1) : '0.0'}</span>
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Main Value based on active leaderboard */}
                            <div className="text-right flex items-center gap-3 sm:gap-4">
                              {/* 🆕 Se è stats-per-match, mostra entrambi i valori */}
                              {activeLeaderboard === 'stats-per-match' ? (
                                <div className="flex items-end gap-2.5 sm:gap-3">
                                  {/* Gol per Partita */}
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: index * 0.1 + 0.2, type: "spring" }}
                                    className="text-center min-w-[58px]"
                                  >
                                    <div className="text-[1.7rem] sm:text-[1.9rem] leading-none font-display font-bold text-primary transition-transform">
                                      {getPrimaryValue(player, activeLeaderboard)}
                                    </div>
                                    <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider leading-tight mt-1">
                                      {getPrimaryLabel(activeLeaderboard)}
                                    </p>
                                  </motion.div>

                                  {/* Assist per Partita */}
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: index * 0.1 + 0.25, type: "spring" }}
                                    className="text-center min-w-[58px]"
                                  >
                                    <div className="text-[1.7rem] sm:text-[1.9rem] leading-none font-display font-bold text-accent transition-transform">
                                      {getSecondaryValue(player, activeLeaderboard)}
                                    </div>
                                    <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider leading-tight mt-1">
                                      {getSecondaryLabel(activeLeaderboard)}
                                    </p>
                                  </motion.div>
                                </div>
                              ) : (
                                // Per gli altri tab, mostra solo il valore primario (layout di sempre)
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ delay: index * 0.1 + 0.2, type: "spring" }}
                                  className="text-center"
                                >
                                  <div className="text-4xl font-display font-bold text-primary transition-transform">
                                    {getPrimaryValue(player, activeLeaderboard)}
                                  </div>
                                  <p className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1 justify-center">
                                    {getPrimaryLabel(activeLeaderboard)}
                                  </p>
                                </motion.div>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>

              </CardContent>
            </Card>
          </motion.div>

          {/* Badges - Moved to Bottom */}
          <BadgesSection />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Home;
