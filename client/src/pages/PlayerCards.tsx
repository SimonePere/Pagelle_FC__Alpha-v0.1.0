import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/redux/store/store';
import {
  fetchPlayerCardSessions,
  createPlayerCardSession,
  submitPlayerCardVote,
  fetchTeamMembers,
  selectPlayerCardSessions,
  selectActivePlayerCardSessions,
  selectPlayerCardDashboardStats,
  selectTeamMembers,
  selectIsLoadingTeamMembers
} from '@/redux/slices/votingSlice';
import { PlayerCardVote } from '@/components/voting';
import { PlayerCardNavigator } from '@/components/PlayerCardNavigator';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { motion } from "framer-motion";
import { Users, CheckCircle2, Clock, Star, X, Info } from "lucide-react";
import { toast } from "sonner";
import { apiCall } from "@/lib/api";
import { calculateAge } from "@/utils/playerCardCalculations";

export default function PlayerCards() {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { isLoading, isLoadingSessions, isCreatingSession } = useSelector((state: RootState) => state.voting);

  // Redux selectors
  const playerCardSessions = useSelector(selectPlayerCardSessions);
  const activePlayerCardSessions = useSelector(selectActivePlayerCardSessions);
  const dashboardStats = useSelector(selectPlayerCardDashboardStats);
  const teamMembers = useSelector(selectTeamMembers);
  const isLoadingTeamMembers = useSelector(selectIsLoadingTeamMembers);

  // Local state
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [showVoteForm, setShowVoteForm] = useState(false);

  // Carica team members quando il componente si monta
  useEffect(() => {
    if (user?.teams?.[0]?.id && teamMembers.length === 0) {
      dispatch(fetchTeamMembers(user.teams[0].id));
    }
  }, [user, teamMembers.length, dispatch]);

  // Usa team members reali invece di fake players  
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
    // Load player card sessions from API
    dispatch(fetchPlayerCardSessions({}));
  }, [user, navigate, dispatch]);

  // Crea una nuova sessione PlayerCard per un giocatore con AUTO-APERTURA
  const handleCreatePlayerCardSession = async (playerId: string) => {
    const targetPlayer = allPlayers.find(p => p.id === playerId);
    if (!targetPlayer) return;

    try {
      const response = await dispatch(createPlayerCardSession({
        targetPlayerId: targetPlayer.id,
        title: `Valuta ${targetPlayer.name}`,
        description: `Esprimi la tua valutazione sulle abilità di ${targetPlayer.name}`,
        teamId: user?.teams?.[0]?.id
      })).unwrap();
      toast.success(`Sessione di valutazione per ${targetPlayer.name} creata!`);

      // 🟢 AUTO-APERTURA form voto (COME MATCH PATTERN)
      if (response.votingSession && response.autoOpenVoteForm) {
        setSelectedSession(response.votingSession.id);
        setShowVoteForm(true);

        toast.success(`Form di voto aperto automaticamente!`);
      }

      // Ricarica le sessioni
      dispatch(fetchPlayerCardSessions({}));
    } catch (error) {
      toast.error('Errore durante la creazione della sessione');
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
      // 🐛 DEBUG: Verifica contenuto COMPLETO della risposta  


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
      toast.error('Errore nel caricamento dei risultati');
      return null;
    }
  };

  // Gestisce la chiusura del form di voto
  const handleCloseVoteForm = () => {
    setShowVoteForm(false);
    setSelectedSession(null);
    // Ricarica le sessioni per aggiornare lo stato
    dispatch(fetchPlayerCardSessions({}));
  };

  // Trova il nome del giocatore dalla sessione  
  const getPlayerNameFromSession = (sessionId: string): string => {
    const session = playerCardSessions.find(s => s.id === sessionId);
    if (!session) return 'Giocatore Sconosciuto';

    // Gestisce sia string che oggetto per targetId
    const targetIdValue = session.targetId as any;
    if (!targetIdValue) return 'Giocatore Sconosciuto';

    // Se targetId è un oggetto (popolato dal backend), usa direttamente il name
    if (typeof targetIdValue === 'object' && targetIdValue.name) {
      return targetIdValue.name;
    }

    // Fallback: cerca nei team members
    const targetIdString = typeof targetIdValue === 'object' ? (targetIdValue._id || targetIdValue.id) : targetIdValue;
    const player = teamMembers.find(member => member.id === targetIdString);
    return player?.name || 'Giocatore Sconosciuto';
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

  return (
    <DashboardLayout>
      <div className="pb-24 lg:pb-8">
        <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
          {/* Loading state - aspetta che teamMembers sia caricato */}
          {isLoadingTeamMembers && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground">Caricamento team members...</p>
              </div>
            </div>
          )}





          {/* Content - mostra solo dopo aver caricato teamMembers */}
          {!isLoadingTeamMembers &&
            (
              <>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative overflow-hidden rounded-2xl bg-card/80 backdrop-blur-sm border-border shadow-card p-8"
                >
                  <div className="relative z-10">
                    <div className="flex items-center justify-between">
                      <h1 className="font-display text-4xl font-bold text-foreground flex items-center gap-3">
                        <Users className="w-8 h-8 text-primary" />
                        Player Cards
                      </h1>
                      {!showVoteForm && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="p-2 rounded-full hover:bg-primary/10 transition-colors">
                              <Info className="w-5 h-5 text-primary cursor-pointer" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80" side="bottom" align="end">
                            <div className="space-y-2">
                              <h4 className="font-medium text-foreground">Come Funziona</h4>
                              <p className="text-sm text-muted-foreground">
                                Ogni membro del team valuta gli attributi di tutti i compagni.
                                Quando tutti hanno votato, la carta finale viene calcolata automaticamente come media dei voti ricevuti.
                              </p>
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  </div>
                  <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl"></div>

                </motion.div>

                {/* Loading State */}
                {isLoadingSessions && (
                  <div className="text-center py-8">
                    <div className="text-muted-foreground">Caricamento sessioni PlayerCard...</div>
                  </div>
                )}

                {/* Vote Form */}
                {(() => {

                  return null;
                })()}
                {showVoteForm && selectedSession && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6 mt-6"
                  >
                    {/* Header con Nome Dinamico */}
                    <Card className="border-primary/30 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5">
                      <div className="p-4 border-b border-primary/20">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">

                            <div >
                              <h2 className="text-xl font-bold text-foreground">
                                Stai valutando: {getPlayerNameFromSession(selectedSession)}
                              </h2>
                              <p className="text-sm text-muted-foreground">
                                Sii onesto, è un tuo compagno di squadra! Valuta con sincerità le sue skills 🤝
                              </p>
                            </div>
                          </div>

                        </div>
                      </div>
                    </Card>

                    <PlayerCardVote
                      sessionId={selectedSession}
                    />
                  </motion.div>
                )}

                {/* PlayerCardNavigator - Sostituisce la Grid */}
                {(() => {
                  return null;
                })()}
                {!showVoteForm && allPlayers.length > 0 && (
                  <div className="space-y-6 mt-6">
                    {/* Dashboard Stats - Opzione A: Compatte Inline */}
                    <div className="grid grid-cols-4 gap-2">
                      <div className="text-center p-3 bg-secondary/50 rounded-lg">
                        <div className="text-2xl font-bold text-primary">{dashboardStats.totalPlayerCardSessions}</div>
                        <div className="text-xs text-muted-foreground">Totali</div>
                      </div>
                      <div className="text-center p-3 bg-green-500/10 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{dashboardStats.activePlayerCardSessions}</div>
                        <div className="text-xs text-muted-foreground">Attive</div>
                      </div>
                      <div className="text-center p-3 bg-yellow-500/10 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-600">{dashboardStats.pendingPlayerCardVotes}</div>
                        <div className="text-xs text-muted-foreground">In Attesa</div>
                      </div>
                      <div className="text-center p-3 bg-blue-500/10 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{dashboardStats.completedPlayerCardSessions}</div>
                        <div className="text-xs text-muted-foreground">Complete</div>
                      </div>
                    </div>


                    <PlayerCardNavigator
                      players={allPlayers}
                      sessions={mappedSessions}
                      onCreateSession={handleCreatePlayerCardSession}
                      onVote={handleOpenVoteForm}
                      onLoadResults={handleLoadResults}
                      initialPlayerId={user.id}
                    />
                  </div>
                )}
              </>)} {/* Chiusura del blocco condizionale !isLoadingTeamMembers */}
        </div>
      </div>
    </DashboardLayout>
  );
};
