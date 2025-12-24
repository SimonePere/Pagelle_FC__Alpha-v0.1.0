import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/redux/store/store';
import { loadEnrichedUserData } from '@/redux/slices/authSlice';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Medal, Target, TrendingUp, Crown, AlertCircle, Star, Goal, Users, BarChart3, Circle, Footprints, Hand } from 'lucide-react';
import { motion } from 'framer-motion';
import { FakeNews } from '@/components/FakeNews';
import { BadgesSection } from '@/components/BadgesSection';
import { Match } from '@/types/match';
import { User } from '@/types/api';
import { PlayerCard } from '@/types/playerCard';
// import { calculateOverallRating } from '@/utils/playerCardCalculations';
import MatchCard from '@/components/MatchCard';
import { api } from '@/lib/api';
import { OnboardingTutorial } from '@/components/OnboardingTutorial';

interface PlayerStats {
  playerId: string;
  playerName: string;
  averageRating: number;
  totalGoals: number;
  totalAssists: number;
  totalMatches: number;
  playerCardAverage?: number; // Player card average rating
  formRating?: number; // Form rating for last 5 matches
}

type LeaderboardType = 'rating' | 'goals' | 'assists' | 'playercard' | 'form';

const Home = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState<PlayerStats[]>([]);
  const [pendingMatches, setPendingMatches] = useState<Match[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [playerCards, setPlayerCards] = useState<PlayerCard[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [activeLeaderboard, setActiveLeaderboard] = useState<LeaderboardType>('rating');
  const [loading, setLoading] = useState(false); // Cambiato da true a false
  const [error, setError] = useState<string | null>(null);

  const loadLeaderboard = async (type: LeaderboardType, teamId: string) => {
    if (!teamId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await api.get(`/leaderboards/${teamId}/${type}`);

      // L'API restituisce direttamente l'oggetto con success/data
      if (response.success) {
        setLeaderboard(response.data || []);
      } else {
        setError('Errore nel caricamento della classifica');
      }
    } catch (err) {
      console.error(`❌ Error loading ${type} leaderboard:`, err);
      setError('Errore di connessione');
      // Fallback to empty array instead of demo data
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  };

  // Load enriched data once when user first loads
  useEffect(() => {
    if (user && (!user.teams || !user.personalStats)) {
      dispatch(loadEnrichedUserData());
    }
  }, [user?.id, dispatch]); // Solo quando cambia l'ID utente

  // Main useEffect for component initialization  
  useEffect(() => {
    if (user) {
      const hasSeenOnboarding = localStorage.getItem(`onboarding_${user._id}`);
      if (!hasSeenOnboarding) {
        setShowOnboarding(true);
      }

      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const currentTeamId = user.teams?.[0]?.id;
      const teammates = users.filter((u: any) => u.teamId === currentTeamId);
      setAllUsers(teammates);

      const cards = JSON.parse(localStorage.getItem('playerCards') || '[]') as PlayerCard[];
      const teamCards = cards.filter(c => c.teamId === currentTeamId);
      setPlayerCards(teamCards);

      loadPendingMatches();
    }
  }, [user?.id]); // Solo quando cambia l'ID utente

  // Separate useEffect for leaderboard changes
  useEffect(() => {
    const currentTeamId = user?.teams?.[0]?.id;
    if (currentTeamId) {
      loadLeaderboard(activeLeaderboard, currentTeamId);
    }
  }, [activeLeaderboard, user?.teams?.[0]?.id]);

  const handleOnboardingComplete = () => {
    if (user) {
      localStorage.setItem(`onboarding_${user._id}`, 'true');
    }
    setShowOnboarding(false);
  };

  const loadPendingMatches = () => {
    if (!user) return;
    const matches: Match[] = JSON.parse(localStorage.getItem('matches') || '[]');
    const currentTeamId = user.teams?.[0]?.id;
    const teamMatches = matches.filter(m => m.teamId === currentTeamId);
    const pending = teamMatches.filter(m => m.status === 'active');
    setPendingMatches(pending);
  };

  const handleTabChange = (newTab: LeaderboardType) => {
    setActiveLeaderboard(newTab);
    // useEffect will trigger loadLeaderboard automatically
  };

  if (!user) return null;

  // Funzioni per titolo e sottotitolo dinamici
  const getLeaderboardTitle = (type: LeaderboardType) => {
    switch (type) {
      case 'rating':
        return 'Classifica Generale';
      case 'goals':
        return 'Marcatori';
      case 'assists':
        return 'Assist';
      case 'playercard':
        return 'Player Card';
      case 'form':
        return 'Forma Recente';
      default:
        return 'Classifica Generale';
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
      case 'form':
        return 'Media dei voti delle ultime 5 partite giocate';
      default:
        return 'Classifica complessiva per media voti nelle partite';
    }
  };

  // Funzione per ottenere il valore primario in base al tipo di classifica
  const getPrimaryValue = (player: PlayerStats, type: LeaderboardType) => {
    switch (type) {
      case 'rating':
        return player.averageRating ? player.averageRating.toFixed(1) : '0.0';
      case 'goals':
        return (player.totalGoals || 0).toString();
      case 'assists':
        return (player.totalAssists || 0).toString();
      case 'playercard':
        // Il campo corretto è playerCardTOT
        const cardValue = (player as any).playerCardTOT || player.playerCardAverage;
        return cardValue ? Math.round(cardValue).toString() : 'N/A';
      case 'form':
        return player.formRating ? player.formRating.toFixed(1) : '0.0';
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
      case 'form':
        return 'Forma';
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

  const users = JSON.parse(localStorage.getItem('users') || '[]');

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
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="font-display text-3xl lg:text-4xl font-bold text-foreground mb-1">
                  👋 Ciao {user.name || user.username}!
                </h1>
                <p className="text-muted-foreground text-lg">
                  🏆 Team {user.teams?.[0]?.name || user.teamName || 'Football Club'}
                </p>
              </div>
              <motion.div whileTap={{ scale: 0.95 }}>
                <button
                  onClick={() => navigate('/create-match')}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 text-lg font-semibold rounded-lg bg-primary text-primary-foreground shadow-glow"
                >
                  <Target className="w-5 h-5" />
                  Crea Partita
                </button>
              </motion.div>
            </div>

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
              <Card className="bg-card/80 backdrop-blur-sm border-border shadow-card border-accent/30">
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
          <FakeNews />

          {/* Leaderboard with Tabs - HERO SECTION */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-card/80 backdrop-blur-sm border-border shadow-card">
              <CardHeader className="border-b border-border bg-gradient-to-r from-primary/10 to-accent/10">
                <CardTitle className="flex items-center gap-3 font-display text-3xl">
                  <Trophy className="w-8 h-8 text-primary animate-pulse" />
                  {getLeaderboardTitle(activeLeaderboard)}
                </CardTitle>
                <p className="text-muted-foreground text-sm mt-1">
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
                    <TabsTrigger value="form" className="flex items-center gap-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                      <TrendingUp className={`w-4 h-4 ${activeLeaderboard === 'form' ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className={`hidden sm:inline ${activeLeaderboard === 'form' ? 'text-primary' : 'text-muted-foreground'}`}>Forma</span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value={activeLeaderboard} className="space-y-0">
                    {loading ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-12 text-center"
                      >
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                        <p className="text-muted-foreground">Caricamento classifica...</p>
                      </motion.div>
                    ) : error ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-12 text-center"
                      >
                        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
                        <p className="text-destructive font-semibold mb-2">Errore di caricamento</p>
                        <p className="text-muted-foreground mb-4">{error}</p>
                        <button
                          onClick={() => loadLeaderboard(activeLeaderboard, user.teams?.[0]?.id)}
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
                            className="flex items-center justify-between p-5 bg-secondary/40 rounded-xl transition-all duration-300 border border-border/50 relative overflow-hidden"
                          >
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
                            <div className="flex items-center gap-5 flex-1">
                              <motion.div
                                transition={{ duration: 0.5 }}
                                className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center font-display font-bold text-xl shadow-glow"
                              >
                                {getMedalIcon(index) || (
                                  <span className="text-primary-foreground">{index + 1}</span>
                                )}
                              </motion.div>
                              <div className="flex-1">
                                <p className="font-display text-xl font-bold text-foreground mb-1">
                                  {player.playerName}
                                </p>
                                {/* Stats Summary */}
                                <div className="flex items-center gap-3 sm:gap-4 text-sm">
                                  <span className="flex items-center gap-1">
                                    <span className="text-muted-foreground text-xs uppercase tracking-wide">PG</span>
                                    <span className="font-bold text-foreground">{player.totalMatches || 0}</span>
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <span className="text-muted-foreground text-xs uppercase tracking-wide">G</span>
                                    <span className="font-bold text-primary">{player.totalGoals || 0}</span>
                                  </span>
                                  <span className="flex items-center gap-1">
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
                            <div className="text-right flex items-center gap-4">
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
