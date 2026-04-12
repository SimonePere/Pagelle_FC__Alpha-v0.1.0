import React, { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../hooks/redux hooks/redux hooks';
import { submitVote } from '../../redux/slices/votingSlice';
import { fetchMatchById } from '../../redux/slices/matchSlice';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Slider } from '../ui/slider';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Loader2, Send, Trophy, User, Timer, MapPin, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import type { MatchPlayerRatingVote as MatchPlayerRatingVoteType, PlayerMatchBadge } from '../../types/voting';
import { RootState } from '@/redux/store/store';

interface MatchPlayerRatingVoteProps {
  sessionId: string;
}

interface PlayerRating {
  rating: number;        // 1-10
  comments?: string;
  goals?: number;        // Gol segnati
  assists?: number;      // Assist forniti
  badges?: PlayerMatchBadge[];  // Badge assegnati
}

interface Player {
  id: string;
  name: string;
}

// Definizioni badge disponibili
const badgeDefinitions: Record<PlayerMatchBadge, { label: string; icon: string; color: string; description: string }> = {
  'gol_piu_bello': {
    label: 'Gol Più Bello',
    icon: '🌟',
    color: 'bg-purple-500',
    description: 'Gol più spettacolare della partita'
  },
  'maratoneta': {
    label: 'Maratoneta',
    icon: '🏃',
    color: 'bg-orange-500',
    description: 'Maggior distanza percorsa'
  },
  'assist_man': {
    label: 'Assist Man',
    icon: '🎯',
    color: 'bg-cyan-500',
    description: 'Miglior assistente della partita'
  },
  'goleador': {
    label: 'Goleador',
    icon: '👑',
    color: 'bg-yellow-500',
    description: 'Miglior marcatore'
  },
  'muro_difensivo': {
    label: 'Muro Difensivo',
    icon: '🛡️',
    color: 'bg-blue-500',
    description: 'Miglior difensore della partita'
  },
  'mvp': {
    label: 'MVP',
    icon: '⭐',
    color: 'bg-gold-500',
    description: 'Most Valuable Player'
  },
  'uomo_partita': {
    label: 'Uomo Partita',
    icon: '🏆',
    color: 'bg-emerald-500',
    description: 'Uomo della partita'
  }
};

const getRatingColor = (rating: number) => {
  if (rating >= 8) return 'bg-green-500';
  if (rating >= 6) return 'bg-yellow-500';
  if (rating >= 4) return 'bg-orange-500';
  return 'bg-red-500';
};

const getRatingLabel = (rating: number) => {
  if (rating >= 9) return 'Eccezionale';
  if (rating >= 8) return 'Ottimo';
  if (rating >= 7) return 'Buono';
  if (rating >= 6) return 'Sufficiente';
  if (rating >= 4) return 'Insufficiente';
  return 'Scarso';
};

export function MatchPlayerRatingVote({ sessionId }: MatchPlayerRatingVoteProps) {
  const dispatch = useAppDispatch();
  const session = useAppSelector(state =>
    state.voting.sessions.find(s => s.id === sessionId)
  );
  const isSubmitting = useAppSelector(state => state.voting.isSubmittingVote);
  const { user } = useAppSelector((state: RootState) => state.auth);

  const voterId = user?.id || user?._id || null;
  // Lista utenti astenuti della sessione: questi player possono ricevere
  // goals/assists anche da altri votanti.
  const abstainedUserIds = session?.abstainedUsers?.map(a => a.userId) || [];
  // Flag utile per eventuali regole UI dedicate agli utenti astenuti.
  const isCurrentUserAbstained = voterId ? abstainedUserIds.includes(voterId) : false;

  // Recupero i dati del match collegato alla sessione di voto
  const currentMatch = useAppSelector(state => state.matches.currentMatch);
  const matchLoading = useAppSelector(state => state.matches.isLoading);

  // Estraggo i giocatori dal match
  const matchPlayers: Player[] = currentMatch?.teamMembers?.map((member: any) => ({
    id: member.id,
    name: member.displayName || member.name
  })) || [];

  // Carico il match quando il componente si monta
  useEffect(() => {
    if (session?.targetId && (!currentMatch || currentMatch.id !== session.targetId)) {
      dispatch(fetchMatchById(session.targetId));
    }
  }, [session?.targetId, currentMatch?.id, dispatch]);

  // Stati per i voti dei giocatori
  const [playerRatings, setPlayerRatings] = useState<{ [playerId: string]: PlayerRating }>({});

  // Inizializza i rating quando i giocatori del match sono disponibili
  useEffect(() => {
    if (matchPlayers.length > 0) {
      const initialRatings: { [playerId: string]: PlayerRating } = {};
      matchPlayers.forEach(player => {
        initialRatings[player.id] = {
          rating: 6, // Voto base sufficiente
          comments: '',
          goals: 0,
          assists: 0,
          badges: []
        };
      });
      setPlayerRatings(initialRatings);
    }
  }, [matchPlayers.length]);

  const [matchComments, setMatchComments] = useState('');

  // Calcolo statistiche generali
  const averageRating = Object.keys(playerRatings).length > 0
    ? Object.values(playerRatings).reduce((sum, p) => sum + p.rating, 0) / Object.keys(playerRatings).length
    : 6;
  const topRated = Object.entries(playerRatings).sort(([, a], [, b]) => b.rating - a.rating).slice(0, 3);
  const ratedPlayersCount = Object.values(playerRatings).filter(p => p.rating !== 6).length;

  const canEditPlayerStats = (playerId: string) => {
    if (!voterId) return false;
    // Business rule:
    // - ogni utente può impostare goals/assists per se stesso
    // - se un giocatore è astenuto, anche gli altri possono impostargli goals/assists
    return playerId === voterId || abstainedUserIds.includes(playerId);
  };

  const handlePlayerRatingChange = (playerId: string, rating: number) => {
    setPlayerRatings(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        rating
      }
    }));
  };

  const handlePlayerCommentChange = (playerId: string, comments: string) => {
    setPlayerRatings(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        comments
      }
    }));
  };

  const handleGoalsChange = (playerId: string, goals: number) => {
    if (!canEditPlayerStats(playerId)) return;
    setPlayerRatings(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        goals: Math.max(0, goals) // Non negativi
      }
    }));
  };

  const handleAssistsChange = (playerId: string, assists: number) => {
    if (!canEditPlayerStats(playerId)) return;
    setPlayerRatings(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        assists: Math.max(0, assists) // Non negativi
      }
    }));
  };

  const toggleBadge = (playerId: string, badge: PlayerMatchBadge) => {
    setPlayerRatings(prev => {
      const currentBadges = prev[playerId]?.badges || [];
      const hasBadge = currentBadges.includes(badge);

      return {
        ...prev,
        [playerId]: {
          ...prev[playerId],
          badges: hasBadge
            ? currentBadges.filter(b => b !== badge)
            : [...currentBadges, badge]
        }
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session) {
      toast.error('Sessione di votazione non trovata');
      return;
    }

    // Validazione - almeno 1 giocatore deve essere valutato diversamente da 6 (per test)
    if (ratedPlayersCount < 1) {
      toast.error('Valuta almeno 1 giocatore con un voto diverso da 6.0');
      return;
    }

    const vote: MatchPlayerRatingVoteType = {
      playerRatings,
      matchComments: matchComments.trim()
    };

    try {
      await dispatch(submitVote({
        sessionId,
        voteData: {
          vote: vote,
          deviceInfo: {
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
          }
        }
      })).unwrap();
      toast.success(`Valutazioni per ${session.title} inviate!`);
    } catch (error) {
      toast.error('Errore durante l\'invio delle valutazioni');
      console.error('Errore invio valutazioni:', error);
    }
  };

  if (!session) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Sessione di votazione non trovata
          </p>
        </CardContent>
      </Card>
    );
  }

  // Loading del match
  if (matchLoading || matchPlayers.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Caricamento giocatori...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (session.hasVoted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-green-600" />
            Valutazione Completata
          </CardTitle>
          <CardDescription>
            Hai già valutato i giocatori per {session.title}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header della sessione */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                {session.title}
              </CardTitle>
              <CardDescription className="mt-1">
                {session.description}
              </CardDescription>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge variant="outline" className="text-xs">
                Media: {averageRating.toFixed(1)}/10
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Valutati: {ratedPlayersCount}/{matchPlayers.length}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Form valutazione */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Lista giocatori */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Valutazione Giocatori</h3>

          {matchPlayers.map(player => {
            const rating = playerRatings[player.id]?.rating || 6;
            const comments = playerRatings[player.id]?.comments || '';
            const statsEditable = canEditPlayerStats(player.id);


            return (
              <Card key={player.id} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Header giocatore */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="font-semibold">{player.name}</h4>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`${getRatingColor(rating)} text-white font-mono`}
                        >
                          {rating.toFixed(2)}/10
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {getRatingLabel(rating)}
                        </Badge>
                      </div>
                    </div>

                    {/* Slider voto */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Voto Performance</Label>
                      <Slider
                        value={[rating]}
                        onValueChange={(value) => handlePlayerRatingChange(player.id, value[0])}
                        max={10}
                        min={1}
                        step={0.25}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Disastroso (1.0)</span>
                        <span>Sufficiente (6.0)</span>
                        <span>Eccellente (10.0)</span>
                      </div>
                    </div>

                    {/*
                      Statistiche partita (Gol/Assist):
                      i controlli sono visibili solo quando statsEditable=true,
                      quindi per il votante stesso o per i giocatori astenuti.
                    */}
                    <div className={`grid grid-cols-2 gap-4 ${statsEditable ? 'visible' : 'hidden'}`}>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-1">
                          ⚽ Gol
                        </Label>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleGoalsChange(player.id, (playerRatings[player.id]?.goals || 0) - 1)}
                          >
                            -
                          </Button>
                          <Badge variant="outline" className="w-12 text-center font-mono">
                            {playerRatings[player.id]?.goals || 0}
                          </Badge>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleGoalsChange(player.id, (playerRatings[player.id]?.goals || 0) + 1)}
                          >
                            +
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-1">
                          🏆 Assist
                        </Label>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleAssistsChange(player.id, (playerRatings[player.id]?.assists || 0) - 1)}
                          >
                            -
                          </Button>
                          <Badge variant="outline" className="w-12 text-center font-mono">
                            {playerRatings[player.id]?.assists || 0}
                          </Badge>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleAssistsChange(player.id, (playerRatings[player.id]?.assists || 0) + 1)}
                          >
                            +
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Badge assegnabili */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">🏆 Assegna Badge (opzionale)</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(badgeDefinitions).map(([badgeKey, badgeInfo]) => {
                          const badge = badgeKey as PlayerMatchBadge;
                          const isSelected = playerRatings[player.id]?.badges?.includes(badge) || false;

                          return (
                            <Button
                              key={badge}
                              type="button"
                              variant={isSelected ? "default" : "outline"}
                              size="sm"
                              className={`text-xs h-auto py-2 px-2 ${isSelected ? badgeInfo.color : ''}`}
                              onClick={() => toggleBadge(player.id, badge)}
                              title={badgeInfo.description}
                            >
                              <span className="mr-1">{badgeInfo.icon}</span>
                              {badgeInfo.label}
                            </Button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Commenti giocatore */}
                    <div className="space-y-2">
                      <Label htmlFor={`comments-${player.id}`} className="text-sm font-medium">
                        Note specifiche (opzionale)
                      </Label>
                      <Textarea
                        id={`comments-${player.id}`}
                        placeholder="Gol, assist, errori, highlights..."
                        value={comments}
                        onChange={(e) => handlePlayerCommentChange(player.id, e.target.value)}
                        rows={2}
                        className="resize-none text-sm"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Commenti generali partita */}
        <Card>
          <CardHeader>
            <Label htmlFor="match-comments" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Commenti Generali sulla Partita (opzionale)
            </Label>
          </CardHeader>
          <CardContent>
            <Textarea
              id="match-comments"
              placeholder="Tattica, modulo, momenti chiave della partita, analisi generale..."
              value={matchComments}
              onChange={(e) => setMatchComments(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </CardContent>
        </Card>

        {/* Top performers e submit */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Top 3 */}
              <div className="text-sm">
                <h4 className="font-medium mb-2">Top 3 Performance:</h4>
                <div className="flex gap-2">
                  {topRated.slice(0, 3).map(([playerId, rating], index) => {
                    const player = matchPlayers.find(p => p.id === playerId);
                    return (
                      <Badge key={playerId} variant="outline" className="text-xs">
                        #{index + 1} {player?.name} ({rating.rating}/10)
                      </Badge>
                    );
                  })}
                </div>
              </div>

              {/* Submit */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
                <div className="text-sm text-muted-foreground space-y-1">
                  <div className="flex gap-4">
                    <p>Media squadra: <strong>{averageRating.toFixed(1)}/10</strong></p>
                    <p>⚽ Gol totali: <strong>{Object.values(playerRatings).reduce((sum, p) => sum + (p.goals || 0), 0)}</strong></p>
                    <p>🏆 Assist totali: <strong>{Object.values(playerRatings).reduce((sum, p) => sum + (p.assists || 0), 0)}</strong></p>
                  </div>
                  <p className="text-xs">
                    Valutati {ratedPlayersCount}/{matchPlayers.length} giocatori • Badge assegnati: {Object.values(playerRatings).reduce((sum, p) => sum + (p.badges?.length || 0), 0)}
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting || ratedPlayersCount < 1}
                  className="w-full sm:w-auto"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Invio in corso...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Invia Valutazioni
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}