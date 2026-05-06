import React, { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../hooks/redux hooks/redux hooks';
import { submitVote, fetchMyVote, updateVote, fetchUserVotingSessions } from '../../redux/slices/votingSlice';
import { fetchMatchById } from '../../redux/slices/matchSlice';
import { Button } from '../ui/button';
import { RatingSlider } from '../RatingSlider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Loader2, Send, Trophy, User, ChevronDown, Check } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import type { MatchPlayerRatingVote as MatchPlayerRatingVoteType, PlayerMatchBadge } from '../../types/voting';
import { RootState } from '@/redux/store/store';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface MatchPlayerRatingVoteProps {
  sessionId: string;
  startInEditMode?: boolean;
  onVoteComplete?: () => void;
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

const getQuickRatingTextColor = (rating: number) => {
  if (rating >= 7) return 'text-green-400';
  if (rating >= 6) return 'text-primary';
  if (rating >= 5) return 'text-yellow-400';
  return 'text-red-400';
};

const getQuickRatingContainerClasses = (rating: number) => {
  if (rating >= 7) {
    return 'border-green-400/35 bg-green-500/10 shadow-[0_0_20px_rgba(74,222,128,0.18)]';
  }
  if (rating >= 6) {
    return 'border-primary/35 bg-primary/10 shadow-[0_0_20px_rgba(245,158,11,0.18)]';
  }
  if (rating >= 5) {
    return 'border-yellow-400/35 bg-yellow-500/10 shadow-[0_0_20px_rgba(250,204,21,0.16)]';
  }
  return 'border-red-400/35 bg-red-500/10 shadow-[0_0_20px_rgba(248,113,113,0.16)]';
};

const getCompactDate = (date?: string) => {
  if (!date) return 'Data n/d';

  try {
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return 'Data n/d';
    return format(parsed, 'dd MMM', { locale: it });
  } catch {
    return 'Data n/d';
  }
};

export function MatchPlayerRatingVote({ sessionId, startInEditMode = false, onVoteComplete }: MatchPlayerRatingVoteProps) {
  const dispatch = useAppDispatch();
  const session = useAppSelector(state =>
    state.voting.sessions.find(s => s.id === sessionId)
  );
  const isSubmitting = useAppSelector(state => state.voting.isSubmittingVote);
  const { user } = useAppSelector((state: RootState) => state.auth);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoadingMyVote, setIsLoadingMyVote] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

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

  // Auto-enter edit mode se richiesto (click da VoteCard "Modifica Voto")
  useEffect(() => {
    if (startInEditMode && session?.hasVoted && !isEditMode && matchPlayers.length > 0) {
      handleEnterEditMode();
    }
  }, [startInEditMode, session?.hasVoted, matchPlayers.length]);

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
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [confirmedPlayerIds, setConfirmedPlayerIds] = useState<string[]>([]);

  useEffect(() => {
    setCurrentPlayerIndex(0);
    setConfirmedPlayerIds([]);
  }, [sessionId]);

  useEffect(() => {
    if (currentPlayerIndex >= matchPlayers.length) {
      setCurrentPlayerIndex(0);
    }
  }, [currentPlayerIndex, matchPlayers.length]);

  const fieldType = currentMatch?.playersCount || matchPlayers.length || 8;
  const matchTypeTitle = `CALCIO A ${fieldType}`;

  // Calcolo statistiche generali
  const averageRating = Object.keys(playerRatings).length > 0
    ? Object.values(playerRatings).reduce((sum, p) => sum + p.rating, 0) / Object.keys(playerRatings).length
    : 6;
  const ratedPlayersCount = Object.values(playerRatings).filter(p => p.rating !== 6).length;
  const currentPlayer = matchPlayers[currentPlayerIndex];
  const isLastPlayer = currentPlayerIndex === matchPlayers.length - 1;

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

  const handleEnterEditMode = async () => {
    setIsLoadingMyVote(true);
    try {
      const result = await dispatch(fetchMyVote(sessionId)).unwrap();
      const { voteData } = result.vote;

      // Pre-popola il form con i dati del voto esistente
      const restored: { [playerId: string]: PlayerRating } = {};

      voteData.playerRatings.forEach((pr: any) => {
        const playerBadges = voteData.badges
          ?.filter((b: any) => b.playerId === pr.playerId)
          .map((b: any) => {
            // Reverse mapping: database → frontend badge names
            const reverseMapping: Record<string, string> = {
              'gol_bello': 'gol_piu_bello',
              'difensore': 'muro_difensivo',
              'assist_man': 'assist_man',
              'mvp': 'mvp',
              'maratoneta': 'maratoneta',
              'goleador': 'goleador'
            };
            return (reverseMapping[b.badgeType] || b.badgeType) as PlayerMatchBadge;
          }) || [];

        restored[pr.playerId] = {
          rating: pr.rating,
          comments: pr.comment || '',
          goals: pr.goals || 0,
          assists: pr.assists || 0,
          badges: playerBadges
        };
      });

      // Per i giocatori senza voto esistente, inizializza a default
      matchPlayers.forEach(player => {
        if (!restored[player.id]) {
          restored[player.id] = { rating: 6, comments: '', goals: 0, assists: 0, badges: [] };
        }
      });

      setPlayerRatings(restored);
      setMatchComments(voteData.overallComment || '');
      setIsEditMode(true);
      toast.info('Modifica il tuo voto e reinvia');
    } catch (error) {
      toast.error('Errore nel recupero del voto');
      console.error('Errore fetch my vote:', error);
    } finally {
      setIsLoadingMyVote(false);
    }
  };

  // Calcola se l'utente è l'ultimo votante
  const activeVoters = (session?.eligibleVotersCount || 0) - (session?.abstainedUsers?.length || 0);
  const isLastVoter = !isEditMode && ((session?.submissionsCount || 0) + 1) >= activeVoters;

  const buildPayload = () => ({
    sessionId,
    voteData: {
      vote: {
        playerRatings,
        matchComments: matchComments.trim()
      } as MatchPlayerRatingVoteType,
      deviceInfo: {
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      }
    }
  });

  const executeSubmit = async () => {
    if (!session) return;

    const payload = buildPayload();

    try {
      if (isEditMode) {
        await dispatch(updateVote(payload)).unwrap();
        toast.success(`Valutazioni per ${session.title} aggiornate!`);
        setIsEditMode(false);
      } else {
        await dispatch(submitVote(payload)).unwrap();
        toast.success(`Valutazioni per ${session.title} inviate!`);
      }
      // Refresh sessioni e torna alla lista dopo 2 secondi
      dispatch(fetchUserVotingSessions({ page: 1, limit: 50 }));
      if (onVoteComplete) {
        setTimeout(() => onVoteComplete(), 2000);
      }
    } catch (error) {
      toast.error(isEditMode
        ? 'Errore durante l\'aggiornamento delle valutazioni'
        : 'Errore durante l\'invio delle valutazioni'
      );
      console.error('Errore invio valutazioni:', error);
    }
  };

  const handleFinalSubmit = async () => {
    if (!session) {
      toast.error('Sessione di votazione non trovata');
      return;
    }

    if (ratedPlayersCount < 1) {
      toast.error('Valuta almeno 1 giocatore con un voto diverso da 6.0');
      return;
    }

    // Se è l'ultimo votante, mostra dialog di conferma
    if (isLastVoter) {
      setShowConfirmDialog(true);
      return;
    }

    await executeSubmit();
  };

  const markCurrentPlayerAsConfirmed = () => {
    if (!currentPlayer) return;
    setConfirmedPlayerIds(prev => {
      if (prev.includes(currentPlayer.id)) return prev;
      return [...prev, currentPlayer.id];
    });
  };

  const handleConfirmCurrentPlayer = async () => {
    if (!currentPlayer) return;

    markCurrentPlayerAsConfirmed();

    if (isLastPlayer) {
      await handleFinalSubmit();
      return;
    }

    setCurrentPlayerIndex(prev => Math.min(prev + 1, matchPlayers.length - 1));
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

  if (session.hasVoted && !isEditMode) {
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
    <div className="space-y-3.5">
      {/* Header B: rail compatta senza card alta */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xl sm:text-2xl font-display font-bold tracking-tight text-foreground truncate leading-none">
            Votazione partita
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-[15px] sm:text-base font-semibold min-w-0">
          <span className="truncate text-foreground/85">{matchTypeTitle}</span>
          <span className="text-muted-foreground/90">|</span>
          <span className="text-foreground/75">{getCompactDate(currentMatch?.date)}</span>
          <span className="text-muted-foreground/90">|</span>
          <span className="truncate text-foreground/75">{currentMatch?.field || 'Campo n/d'}</span>
        </div>

        {/* Dettagli partita temporaneamente disattivati su richiesta UX */}
      </div>

      {/* Form valutazione */}
      <div className="space-y-3">
        {/* Stepper giocatori */}
        <div>
          <div className="w-full overflow-x-auto pb-0.5">
            <div className="mx-auto flex w-max items-center justify-center gap-1.5">
              {matchPlayers.map((player, index) => {
                const isCurrent = index === currentPlayerIndex;
                const isCompleted = confirmedPlayerIds.includes(player.id);

                return (
                  <div key={player.id} className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setCurrentPlayerIndex(index)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${isCurrent
                        ? 'bg-primary text-primary-foreground'
                        : isCompleted
                          ? 'bg-green-500 text-white'
                          : 'bg-muted text-muted-foreground'
                        }`}
                      aria-label={`Vai al giocatore ${index + 1}`}
                    >
                      {isCompleted ? <Check className="w-3.5 h-3.5" /> : index + 1}
                    </button>
                    {index < matchPlayers.length - 1 && (
                      <div className={`w-4 h-px ${confirmedPlayerIds.includes(player.id) ? 'bg-green-500' : 'bg-muted'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {currentPlayer && (
          <Card className="overflow-hidden">
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-4">
                {/* Header giocatore */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center font-bold">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="font-semibold">{currentPlayer.name}</h4>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <motion.div
                      key={`${currentPlayer.id}-${playerRatings[currentPlayer.id]?.rating || 6}`}
                      initial={{ scale: 1.18, y: 2 }}
                      animate={{ scale: 1, y: 0 }}
                      transition={{ type: 'spring', stiffness: 380, damping: 24 }}
                      className={`px-3 py-1 rounded-xl border ${getQuickRatingContainerClasses(playerRatings[currentPlayer.id]?.rating || 6)}`}
                    >
                      <span className={`text-4xl md:text-5xl leading-none tracking-tight font-display font-bold tabular-nums ${getQuickRatingTextColor(playerRatings[currentPlayer.id]?.rating || 6)}`}>
                        {(playerRatings[currentPlayer.id]?.rating || 6).toFixed(2)}
                      </span>
                    </motion.div>
                  </div>
                </div>

                {/* Slider voto */}
                <div className="space-y-4">
                  <RatingSlider
                    value={playerRatings[currentPlayer.id]?.rating || 6}
                    onChange={(value) => handlePlayerRatingChange(currentPlayer.id, value)}
                  />

                </div>

                {/*
                  Statistiche partita (Gol/Assist):
                  i controlli sono visibili solo quando statsEditable=true,
                  quindi per il votante stesso o per i giocatori astenuti.
                */}
                <div className={`grid grid-cols-2 gap-4 ${canEditPlayerStats(currentPlayer.id) ? 'visible' : 'hidden'}`}>
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
                        onClick={() => handleGoalsChange(currentPlayer.id, (playerRatings[currentPlayer.id]?.goals || 0) - 1)}
                      >
                        -
                      </Button>
                      <Badge variant="outline" className="w-12 text-center font-mono">
                        {playerRatings[currentPlayer.id]?.goals || 0}
                      </Badge>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleGoalsChange(currentPlayer.id, (playerRatings[currentPlayer.id]?.goals || 0) + 1)}
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
                        onClick={() => handleAssistsChange(currentPlayer.id, (playerRatings[currentPlayer.id]?.assists || 0) - 1)}
                      >
                        -
                      </Button>
                      <Badge variant="outline" className="w-12 text-center font-mono">
                        {playerRatings[currentPlayer.id]?.assists || 0}
                      </Badge>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleAssistsChange(currentPlayer.id, (playerRatings[currentPlayer.id]?.assists || 0) + 1)}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Dettagli badge opzionali */}
                <details className="group bg-transparent">
                  <summary className="cursor-pointer list-none select-none text-muted-foreground text-sm shrink-0 font-medium flex items-center gap-2">
                    <ChevronDown className="w-4 h-4 transition-transform duration-200 group-open:rotate-180" />
                    <span>Assegna badge</span>
                  </summary>

                  <div className="mt-3 space-y-2">

                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(badgeDefinitions).map(([badgeKey, badgeInfo]) => {
                        const badge = badgeKey as PlayerMatchBadge;
                        const isSelected = playerRatings[currentPlayer.id]?.badges?.includes(badge) || false;

                        return (
                          <Button
                            key={badge}
                            type="button"
                            variant={isSelected ? 'default' : 'outline'}
                            size="sm"
                            className={`text-xs h-auto py-2 px-2 ${isSelected ? badgeInfo.color : ''}`}
                            onClick={() => toggleBadge(currentPlayer.id, badge)}
                            title={badgeInfo.description}
                          >
                            <span className="mr-1">{badgeInfo.icon}</span>
                            {badgeInfo.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </details>

                <div className="border-t border-border/70 pt-4 space-y-3">
                  <p className="text-xs text-muted-foreground px-1">
                    {isLastPlayer
                      ? 'Confermi l\'ultimo voto e invii tutte le valutazioni in un unico invio.'
                      : `Confermi il voto di ${currentPlayer.name} e passi al prossimo giocatore da valutare.`}
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3">
                    {currentPlayerIndex > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full sm:w-auto"
                        onClick={() => setCurrentPlayerIndex(prev => Math.max(prev - 1, 0))}
                      >
                        Torna al precedente
                      </Button>
                    )}

                    <Button
                      type="button"
                      onClick={handleConfirmCurrentPlayer}
                      disabled={isSubmitting || isLoadingMyVote}
                      className="w-full sm:flex-1"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Invio in corso...
                        </>
                      ) : isLastPlayer ? (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          {isEditMode ? 'Conferma e aggiorna voti' : 'Conferma e invia voti'}
                        </>
                      ) : (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Conferma voto
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog conferma ultimo votante */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Sei l'ultimo a votare!</AlertDialogTitle>
            <AlertDialogDescription>
              Dopo il tuo invio la sessione si chiuderà automaticamente e non sarà più possibile modificare il voto. Sei sicuro di voler confermare?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Rivedi Voti</AlertDialogCancel>
            <AlertDialogAction onClick={() => executeSubmit()}>
              Conferma Invio
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}