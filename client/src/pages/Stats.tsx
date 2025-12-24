import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store/store';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlayerRadarChart } from '@/components/PlayerRadarChart';
import { StatsChart } from '@/components/StatsChart';
// import { PlayerCardDisplay } from '@/components/PlayerCardDisplay';
import { PlayerCard } from '@/types/playerCard';
// import { calculateOverallRating } from '@/utils/playerCardCalculations';

// Temporary fallback function - calcolo semplice media per Stats
const calculateOverallRating = (attributes: any): number => {
  if (!attributes) return 0;
  const values = [
    attributes.tir || 0, attributes.pas || 0, attributes.dri || 0,
    attributes.fin || 0, attributes.vis || 0, attributes.res || 0,
    attributes.for || 0, attributes.con || 0, attributes.int || 0,
    attributes.prt || 0
  ].filter(v => v > 0);
  if (values.length === 0) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
};
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Users, Trophy, Star, Award } from 'lucide-react';

interface PlayerStats {
  userId: string;
  name: string;
  averageRating: number;
  goals: number;
  assists: number;
  appearances: number;
  finishing: number;
  playmaking: number;
  consistency: number;
  form: number;
  overall: number;
}

const Stats = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();
  const [allPlayers, setAllPlayers] = useState<PlayerStats[]>([]);
  const [selectedPlayer1, setSelectedPlayer1] = useState<string>('');
  const [selectedPlayer2, setSelectedPlayer2] = useState<string>('');
  const [comparisonMode, setComparisonMode] = useState(false);
  const [playerCards, setPlayerCards] = useState<PlayerCard[]>([]);
  const [selectedCardPlayer1, setSelectedCardPlayer1] = useState<string>('');
  const [selectedCardPlayer2, setSelectedCardPlayer2] = useState<string>('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const matches = JSON.parse(localStorage.getItem('matches') || '[]');
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const playerStatsMap = new Map<string, any>();

    // Only use completed matches from user's team for stats
    const teamMatches = matches.filter((m: any) => m.teamId === user.teamId);
    const completedMatches = teamMatches.filter((m: any) => m.status === 'completed');

    // Calculate stats for each player
    completedMatches.forEach((match: any) => {
      match.finalRatings?.forEach((rating: any) => {
        if (!playerStatsMap.has(rating.userId)) {
          playerStatsMap.set(rating.userId, {
            userId: rating.userId,
            totalRating: 0,
            goals: 0,
            assists: 0,
            appearances: 0,
            ratings: [],
          });
        }
        const playerData = playerStatsMap.get(rating.userId);
        playerData.totalRating += rating.rating;
        playerData.goals += rating.goals || 0;
        playerData.assists += rating.assists || 0;
        playerData.appearances += 1;
        playerData.ratings.push(rating.rating);
      });
    });

    // Calculate derived stats - only for team members
    const players: PlayerStats[] = [];
    const teammates = users.filter((u: any) => u.teamId === user.teamId);
    playerStatsMap.forEach((data, userId) => {
      const playerUser = teammates.find((u: any) => u.id === userId);
      if (!playerUser) return;

      const averageRating = data.totalRating / data.appearances;
      const goalsPerGame = data.goals / data.appearances;
      const assistsPerGame = data.assists / data.appearances;

      // Calculate consistency (inverse of standard deviation, normalized to 0-100)
      const variance = data.ratings.reduce((sum: number, rating: number) =>
        sum + Math.pow(rating - averageRating, 2), 0) / data.ratings.length;
      const stdDev = Math.sqrt(variance);
      const consistency = Math.max(0, Math.min(100, (10 - stdDev) * 10));

      // Form based on last 5 matches
      const recentRatings = data.ratings.slice(-5);
      const recentAverage = recentRatings.reduce((sum: number, r: number) => sum + r, 0) / recentRatings.length;
      const form = (recentAverage / 10) * 100;

      // Finishing based on goals per game (normalized)
      const finishing = Math.min(100, goalsPerGame * 50);

      // Playmaking based on assists per game (normalized)
      const playmaking = Math.min(100, assistsPerGame * 50);

      // Overall rating
      const overall = (averageRating / 10) * 100;

      players.push({
        userId,
        name: playerUser.name,
        averageRating,
        goals: data.goals,
        assists: data.assists,
        appearances: data.appearances,
        finishing,
        playmaking,
        consistency,
        form,
        overall,
      });
    });

    players.sort((a, b) => b.averageRating - a.averageRating);
    setAllPlayers(players);
    if (players.length > 0 && !selectedPlayer1) {
      setSelectedPlayer1(players[0].userId);
    }

    // Load player cards
    const cards = JSON.parse(localStorage.getItem('playerCards') || '[]') as PlayerCard[];
    const teamCards = cards.filter((c) => c.teamId === user.teamId && c.isComplete);
    setPlayerCards(teamCards);
    if (teamCards.length > 0 && !selectedCardPlayer1) {
      setSelectedCardPlayer1(teamCards[0].playerId);
    }
  }, [user, navigate]);

  if (!user) return null;

  const getRadarData = (player: PlayerStats) => [
    { attribute: 'Generale', value: player.overall, fullMark: 100 },
    { attribute: 'Finalizzazione', value: player.finishing, fullMark: 100 },
    { attribute: 'Regia', value: player.playmaking, fullMark: 100 },
    { attribute: 'Costanza', value: player.consistency, fullMark: 100 },
    { attribute: 'Forma', value: player.form, fullMark: 100 },
  ];

  const player1 = allPlayers.find(p => p.userId === selectedPlayer1);
  const player2 = allPlayers.find(p => p.userId === selectedPlayer2);

  const card1 = playerCards.find(c => c.playerId === selectedCardPlayer1);
  const card2 = playerCards.find(c => c.playerId === selectedCardPlayer2);

  const users = JSON.parse(localStorage.getItem('users') || '[]');
  const getPlayerName = (playerId: string) => {
    return users.find((u: any) => u.id === playerId)?.name || 'Unknown';
  };

  return (
    <DashboardLayout>
      <div className="pb-24 lg:pb-8">
        <div className="p-6 lg:p-8 space-y-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
              <BarChart3 className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-4xl font-bold text-foreground">Statistiche Avanzate</h1>
              <p className="text-muted-foreground">Analizza e confronta le prestazioni dei giocatori</p>
            </div>
          </motion.div>

          {/* Tabs */}
          <Tabs defaultValue="performance" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="performance" className="flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                Prestazioni Partite
              </TabsTrigger>
              <TabsTrigger value="cards" className="flex items-center gap-2">
                <Star className="w-4 h-4" />
                Player Cards
              </TabsTrigger>
            </TabsList>

            {/* Performance Tab */}
            <TabsContent value="performance" className="space-y-8">

              {/* Player Selection */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="bg-card/80 backdrop-blur-sm border-border shadow-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 font-display">
                      <Users className="w-6 h-6 text-primary" />
                      Seleziona Giocatori
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Giocatore 1</label>
                        <Select value={selectedPlayer1} onValueChange={setSelectedPlayer1}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona giocatore" />
                          </SelectTrigger>
                          <SelectContent>
                            {allPlayers.map(player => (
                              <SelectItem key={player.userId} value={player.userId}>
                                {player.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Giocatore 2 (Confronto)</label>
                        <Select value={selectedPlayer2 || undefined} onValueChange={(value) => {
                          setSelectedPlayer2(value);
                          setComparisonMode(!!value);
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona per confrontare" />
                          </SelectTrigger>
                          <SelectContent>
                            {allPlayers.filter(p => p.userId !== selectedPlayer1).map(player => (
                              <SelectItem key={player.userId} value={player.userId}>
                                {player.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Radar Charts */}
              {player1 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className={`grid grid-cols-1 ${comparisonMode && player2 ? 'lg:grid-cols-2' : ''} gap-6`}
                >
                  <PlayerRadarChart
                    data={getRadarData(player1)}
                    playerName={player1.name}
                    color="hsl(var(--primary))"
                  />
                  {comparisonMode && player2 && (
                    <PlayerRadarChart
                      data={getRadarData(player2)}
                      playerName={player2.name}
                      color="hsl(var(--accent))"
                    />
                  )}
                </motion.div>
              )}

              {/* Rankings */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="bg-card/80 backdrop-blur-sm border-border shadow-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 font-display">
                      <Trophy className="w-6 h-6 text-primary" />
                      Classifiche Dettagliate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {/* Top Finishers */}
                      <div className="space-y-3">
                        <h4 className="font-display font-bold text-foreground flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-accent" />
                          Miglior Finalizzatore
                        </h4>
                        <div className="space-y-2">
                          {[...allPlayers].sort((a, b) => b.finishing - a.finishing).slice(0, 5).map((player, idx) => (
                            <motion.div
                              key={player.userId}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className="flex items-center justify-between p-3 bg-secondary/40 rounded-lg border border-border/50"
                            >
                              <div className="flex items-center gap-3">
                                <span className="font-display font-bold text-lg text-primary">{idx + 1}</span>
                                <span className="text-foreground font-medium">{player.name}</span>
                              </div>
                              <span className="text-foreground font-bold">{player.finishing.toFixed(0)}</span>
                            </motion.div>
                          ))}
                        </div>
                      </div>

                      {/* Top Playmakers */}
                      <div className="space-y-3">
                        <h4 className="font-display font-bold text-foreground flex items-center gap-2">
                          <Users className="w-4 h-4 text-blue-400" />
                          Miglior Playmaker
                        </h4>
                        <div className="space-y-2">
                          {[...allPlayers].sort((a, b) => b.playmaking - a.playmaking).slice(0, 5).map((player, idx) => (
                            <motion.div
                              key={player.userId}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className="flex items-center justify-between p-3 bg-secondary/40 rounded-lg border border-border/50"
                            >
                              <div className="flex items-center gap-3">
                                <span className="font-display font-bold text-lg text-primary">{idx + 1}</span>
                                <span className="text-foreground font-medium">{player.name}</span>
                              </div>
                              <span className="text-foreground font-bold">{player.playmaking.toFixed(0)}</span>
                            </motion.div>
                          ))}
                        </div>
                      </div>

                      {/* Most Consistent */}
                      <div className="space-y-3">
                        <h4 className="font-display font-bold text-foreground flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-green-400" />
                          Più Costante
                        </h4>
                        <div className="space-y-2">
                          {[...allPlayers].sort((a, b) => b.consistency - a.consistency).slice(0, 5).map((player, idx) => (
                            <motion.div
                              key={player.userId}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className="flex items-center justify-between p-3 bg-secondary/40 rounded-lg border border-border/50"
                            >
                              <div className="flex items-center gap-3">
                                <span className="font-display font-bold text-lg text-primary">{idx + 1}</span>
                                <span className="text-foreground font-medium">{player.name}</span>
                              </div>
                              <span className="text-foreground font-bold">{player.consistency.toFixed(0)}</span>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Player Cards Tab */}
            <TabsContent value="cards" className="space-y-8">
              {playerCards.length === 0 ? (
                <Card className="bg-card/80 backdrop-blur-sm border-border shadow-card">
                  <CardContent className="p-12 text-center">
                    <Star className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="font-display text-2xl font-bold text-foreground mb-2">
                      Nessuna Player Card Completata
                    </h3>
                    <p className="text-muted-foreground">
                      Vai alla sezione Player Cards per creare e votare le carte dei giocatori
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Card Selection */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <Card className="bg-card/80 backdrop-blur-sm border-border shadow-card">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3 font-display">
                          <Star className="w-6 h-6 text-primary" />
                          Confronta Player Cards
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Player Card 1</label>
                            <Select value={selectedCardPlayer1} onValueChange={setSelectedCardPlayer1}>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleziona giocatore" />
                              </SelectTrigger>
                              <SelectContent>
                                {playerCards.map(card => (
                                  <SelectItem key={card.playerId} value={card.playerId}>
                                    {getPlayerName(card.playerId)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Player Card 2 (Confronto)</label>
                            <Select value={selectedCardPlayer2 || undefined} onValueChange={setSelectedCardPlayer2}>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleziona per confrontare" />
                              </SelectTrigger>
                              <SelectContent>
                                {playerCards.filter(c => c.playerId !== selectedCardPlayer1).map(card => (
                                  <SelectItem key={card.playerId} value={card.playerId}>
                                    {getPlayerName(card.playerId)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Player Cards Display */}
                  aaaa
                  {card1 && card1.finalAttributes && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className={`grid grid-cols-1 ${selectedCardPlayer2 && card2 ? 'lg:grid-cols-2' : ''} gap-6`}
                    >
                      {/* <PlayerCardDisplay
                        playerName={getPlayerName(card1.playerId)}
                        attributes={card1.finalAttributes}
                      />
                      {selectedCardPlayer2 && card2 && card2.finalAttributes && (
                        <PlayerCardDisplay
                          playerName={getPlayerName(card2.playerId)}
                          attributes={card2.finalAttributes}
                        />
                      )} */}
                    </motion.div>
                  )}

                  {/* Top Rated Cards */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <Card className="bg-card/80 backdrop-blur-sm border-border shadow-card">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3 font-display">
                          <Award className="w-6 h-6 text-primary" />
                          Top Player Cards
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {[...playerCards]
                            .filter(c => c.finalAttributes)
                            .sort((a, b) => {
                              const ratingA = calculateOverallRating(a.finalAttributes!);
                              const ratingB = calculateOverallRating(b.finalAttributes!);
                              return ratingB - ratingA;
                            })
                            .slice(0, 5)
                            .map((card, idx) => {
                              const overall = calculateOverallRating(card.finalAttributes!);
                              const getOverallColor = (rating: number) => {
                                if (rating >= 85) return "text-green-500";
                                if (rating >= 75) return "text-yellow-500";
                                if (rating >= 65) return "text-orange-500";
                                return "text-red-500";
                              };

                              return (
                                <motion.div
                                  key={card.playerId}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: idx * 0.05 }}
                                  className="flex items-center justify-between p-4 bg-secondary/40 rounded-lg border border-border/50"
                                >
                                  <div className="flex items-center gap-4">
                                    <span className="font-display font-bold text-2xl text-primary">{idx + 1}</span>
                                    <div>
                                      <div className="text-foreground font-bold text-lg">
                                        {getPlayerName(card.playerId)}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {card.finalAttributes!.position} • {card.finalAttributes!.preferredRole}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className={`font-display font-bold text-3xl ${getOverallColor(overall)}`}>
                                      {overall}
                                    </div>
                                    <div className="text-xs text-muted-foreground">TOT</div>
                                  </div>
                                </motion.div>
                              );
                            })}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Stats;
