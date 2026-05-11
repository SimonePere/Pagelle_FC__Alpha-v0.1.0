import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../redux/store/store';
import {
  fetchUserVotingSessions,
  selectActiveVotingSessions,
  selectPendingVoteSessions,
  selectVotingDashboardStats
} from '../redux/slices/votingSlice';
import { fetchTeamMatches } from '../redux/slices/matchSlice';
import { VotingSession } from '../types/voting';
import { motion } from 'framer-motion';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card, CardContent } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import {
  Vote as VotingIcon,
  CheckCircle2,
  Users,
  Calendar,
  Activity,
  Archive,
  AlertCircle,
  Info
} from 'lucide-react';
import { PlayerCardVote } from '../components/voting/index';
import { MatchRatingVote } from '../components/voting/index';
import { VoteCard } from '../components/VoteCard';

const VoteDashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-card/80 backdrop-blur-sm border-border shadow-card p-5 sm:p-6 lg:p-8">
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-9 w-44" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
      </div>

      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={`vote-skeleton-${index}`} className="bg-card/80 backdrop-blur-sm border-border shadow-card">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-3 flex-1">
                  <Skeleton className="h-7 w-44" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-24" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-10" />
                </div>
                <Skeleton className="h-2 w-full" />
              </div>

              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

// Giocatori astenuti da votazione helper
const isUserAbstained = (session: VotingSession, userId: string): boolean => {
  if (!userId || !session.abstainedUsers?.length) return false;
  return session.abstainedUsers.some(abstained => abstained.userId === userId);
};

const Vote: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);

  const {
    sessions,
    isLoading,
    error
  } = useSelector((state: RootState) => state.voting);

  // 🎯 Otteniamo anche i matches per il lookup
  const { matches } = useSelector((state: RootState) => state.matches);

  const activeSessions = useSelector(selectActiveVotingSessions);
  const pendingSessions = useSelector(selectPendingVoteSessions);
  const stats = useSelector(selectVotingDashboardStats);



  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();

  // Stati per gestire la votazione attiva
  const [selectedSession, setSelectedSession] = useState<VotingSession | null>(null);
  const [viewMode, setViewMode] = useState<'dashboard' | 'voting'>('dashboard');
  const [autoSessionHandled, setAutoSessionHandled] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // 🌐 Carica TUTTE le sessioni di votazione dell'utente
    dispatch(fetchUserVotingSessions({
      page: 1,
      limit: 50
    }));

    // 🎯 Carica anche le partite per il lookup dei dati reali
    if (user.teams?.length) {
      const teamId = user.teams[0].id;
      dispatch(fetchTeamMatches(teamId));
    }
  }, [user, navigate, dispatch]);

  // 🎯 Auto-selezione sessione da location.state (navigazione da Home)
  useEffect(() => {
    if (autoSessionHandled || isLoading) return;
    const autoSessionId = (location.state as { autoSessionId?: string } | null)?.autoSessionId;
    if (autoSessionId && pendingSessions.length > 0) {
      const session = pendingSessions.find(s => s.id === autoSessionId);
      if (session) {
        setSelectedSession(session);
        setViewMode('voting');
        setAutoSessionHandled(true);
      }
    }
  }, [location.state, pendingSessions, isLoading, autoSessionHandled]);

  const getSessionStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500 text-green-50';
      case 'completed': return 'bg-blue-500 text-blue-50';
      case 'cancelled': return 'bg-red-500 text-red-50';
      default: return 'bg-gray-500 text-gray-50';
    }
  };

  const handleEnterSession = (session: VotingSession) => {

    setSelectedSession(session);
    setViewMode('voting');
  };

  // 🎯 Converte VotingSession in formato match per VoteCard
  const mapSessionToMatch = (session: VotingSession) => {
    // 🎯 Trova la partita reale usando targetId
    const realMatch = matches?.find(match => match.id === session.targetId);

    if (realMatch) {
      // Usa i dati della partita vera, ma lo status viene dalla session (fonte di verità per la votazione)
      const mappedStatus = session.status === 'completed' ? 'completed' as const :
        realMatch.status === 'cancelled' ? 'draft' as const :
          realMatch.status === 'active' ? 'active' as const :
            realMatch.status === 'completed' ? 'completed' as const : 'draft' as const;
      return {
        id: realMatch.id,
        date: realMatch.date,
        status: mappedStatus,
        teamMemberIds: (realMatch.teamMemberIds && realMatch.teamMemberIds.length > 0)
          ? realMatch.teamMemberIds
          : Array.from({ length: session.eligibleVotersCount }, (_, i) => `voter-${i}`)
      };
    } else {
      console.warn('⚠️ Partita non trovata, uso dati fallback:', session.targetId);
      // Fallback con dati della sessione
      return {
        id: session.id,
        date: session.createdAt || new Date().toISOString(),
        status: session.status === 'active' ? 'active' as const :
          session.status === 'completed' ? 'completed' as const : 'draft' as const,
        teamMemberIds: Array.from({ length: session.eligibleVotersCount }, (_, i) => `voter-${i}`)
      };
    }
  };

  // 🗳️ Handler per click info sulla sessione
  const handleSessionInfo = (session: VotingSession) => {
    // Future: navigazione a pagina dettaglio sessione
  };

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="pb-4 lg:pb-8">

        <div className="p-4 pt-2 lg:p-8 space-y-5 lg:space-y-8 max-w-7xl mx-auto">

          {/* Se siamo in modalità votazione, mostra il componente specifico */}
          {viewMode === 'voting' && selectedSession ? (
            <div className="space-y-6">
              {/* 🟢 IMPLEMENTATI */}
              {selectedSession.type === 'player_card_rating' && (
                <PlayerCardVote
                  sessionId={selectedSession.id}
                />
              )}

              {selectedSession.type === 'match_rating' && (
                <MatchRatingVote
                  sessionId={selectedSession.id}
                  startInEditMode={selectedSession.hasVoted}
                  onVoteComplete={() => {
                    setViewMode('dashboard');
                    setSelectedSession(null);
                  }}
                />
              )}

              {/* Default fallback per tipi non implementati */}
              {!['player_card_rating', 'match_rating'].includes(selectedSession.type) && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Tipo di votazione non disponibile</AlertTitle>
                  <AlertDescription>
                    Il tipo di votazione "{selectedSession.type}" non è ancora implementato.
                    Feature in arrivo!
                    <Button
                      variant="outline"
                      onClick={() => setViewMode('dashboard')}
                      className="mt-2"
                    >
                      🔙 Torna al Dashboard
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            // Dashboard mode - IDENTICO AL TEMPLATE FUNZIONANTE
            <>
              {/* Loading state - identico a PlayerCards */}
              {isLoading && (
                <VoteDashboardSkeleton />
              )}

              {/* Content - mostra solo dopo aver caricato - IDENTICO TEMPLATE PLAYERCARDS */}
              {!isLoading &&
                (
                  <>
                    {/* Header */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="relative overflow-hidden rounded-2xl bg-card/80 backdrop-blur-sm border-border shadow-card p-5 sm:p-6 lg:p-8"
                    >
                      <div className="relative z-10">
                        <div className="flex items-center justify-between gap-4">
                          <h1 className="font-display text-3xl sm:text-4xl leading-none font-bold text-foreground flex items-center gap-2 sm:gap-3">
                            <VotingIcon className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
                            Votazioni
                          </h1>
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                aria-label="Informazioni votazioni"
                                className="p-2 rounded-full hover:bg-primary/10 transition-colors"
                              >
                                <Info className="w-5 h-5 text-primary cursor-pointer" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80" side="bottom" align="end">
                              <div className="space-y-2">
                                <h4 className="font-medium text-foreground">Come Funziona</h4>
                                <p className="text-sm text-muted-foreground">
                                  Vota le prestazioni dei tuoi compagni di squadra.
                                </p>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                      <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl"></div>
                    </motion.div>

                    {/* Sessioni di Votazione - Visualizzazione diretta senza tabs - Visualizzazione diretta senza tabs */}
                    <div className="space-y-4">
                      {/* Use all sessions to avoid duplication from selectors */}
                      {sessions.length === 0 ? (
                        <Card className="bg-card/80 backdrop-blur-sm border-border shadow-card">
                          <CardContent className="p-8 text-center">
                            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                            <h3 className="font-display text-xl font-bold text-foreground mb-2">
                              Nessuna votazione disponibile 🗳️
                            </h3>
                            <p className="text-muted-foreground">
                              Al momento non ci sono sessioni di votazione attive.
                            </p>
                          </CardContent>
                        </Card>
                      ) : (
                        sessions.map((session, index) => {
                          const isAbstained = isUserAbstained(session, user?.id || '');
                          const mappedMatch = mapSessionToMatch(session);
                          const realMatch = matches?.find(match => match.id === session.targetId);

                          // Calcolo corretto della percentuale voti
                          const totalMembers = mappedMatch.teamMemberIds.length;
                          const votesReceived = Math.round((session.participationRate || 0) / 100 * session.eligibleVotersCount);
                          const correctProgress = totalMembers > 0 ? Math.round((votesReceived / totalMembers) * 100) : 0;

                          return (
                            <VoteCard
                              key={session.id}
                              match={mappedMatch}
                              voting={{
                                isVotable: session.status === 'active',           // Manteniamo sempre true se active
                                hasVoted: session.hasVoted || false,              // Stato votazione normale
                                isAbstained: isAbstained,                         // NUOVO FLAG
                                votingDeadline: session.deadline,
                                votingProgress: correctProgress
                              }}
                              index={index}
                              onClick={() => handleSessionInfo(session)}
                              onVoteClick={isAbstained ? undefined : () => handleEnterSession(session)} // MODIFICATO
                            />
                          );
                        })
                      )}
                    </div>
                  </>
                )} {/* Chiusura del blocco condizionale !isLoading - IDENTICO A PLAYERCARDS */}
            </>
          )} {/* Chiusura del blocco viewMode dashboard */}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Vote;