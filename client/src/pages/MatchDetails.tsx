import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { current } from '@reduxjs/toolkit';
import { RootState, AppDispatch } from '@/redux/store/store';
import { fetchMatchById, updateMatch, deleteMatch } from '@/redux/slices/matchSlice';
import { fetchMatchVotingData, clearMatchVotingData, reactivateVoter, fetchUserVotingSessions } from '@/redux/slices/votingSlice';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Calendar, CloudRain, Trophy, Target, Users, ArrowLeft,
  CheckCircle, Clock, Trash2, AlertCircle, Award, FileText, Edit, Search
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Match, User } from '@/types/match';
import { useToast } from '@/hooks/use-toast';
import EditModal from '@/components/EditModal';
import MatchDetailsCard from '@/components/MatchDetailsCard';
import useEnrichedMatches from '@/hooks/useEnrichedMatches';

export default function MatchDetails() {
  const { matchId } = useParams();
  const { user } = useSelector((state: RootState) => state.auth);
  const { isLoading, error, matches } = useSelector((state: RootState) => state.matches);

  // 🗳️ Voting data selector 
  const { matchVoting, sessions } = useSelector((state: RootState) => state.voting);

  // 🎯 ENRICHED MATCHES - Con dati astenuti integrati + refresh function
  const { matches: enrichedMatches, refreshData } = useEnrichedMatches();
  const currentMatch = enrichedMatches?.find?.(match => match?.id === matchId) || null;

  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Utility function per status label
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Completata';
      case 'active': return 'In Corso';
      case 'draft': return 'Creata';
      default: return status;
    }
  };

  // SAFETY CHECK: Se il currentMatch ha un ID diverso da quello richiesto, forza un nuovo fetch
  useEffect(() => {
    if (currentMatch && currentMatch.id !== matchId) {
      dispatch(fetchMatchById(matchId));
    }
  }, [currentMatch, matchId, dispatch]);

  const [showEditDialog, setShowEditDialog] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (matchId) {
      dispatch(fetchMatchById(matchId));
    }
    // Assicura che le voting sessions siano caricate per trovare la session del match
    dispatch(fetchUserVotingSessions({ page: 1, limit: 50 }));
  }, [matchId, user, navigate, dispatch]);

  // 🆕 Trova la voting session per questo match direttamente dalle sessions Redux
  const matchVotingSession = sessions.find((s: any) => s.targetId === matchId);

  useEffect(() => {
    if (matchVotingSession?.id) {
      dispatch(fetchMatchVotingData(matchVotingSession.id));
    } else if (matchId) {
      dispatch(clearMatchVotingData());
    }
  }, [matchVotingSession?.id, matchId, dispatch]);

  if (!user) return null;

  // Handle loading state - SEMPLIFICATO
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8">
          <div className="space-y-6">
            <div className="animate-pulse">
              <div className="h-8 bg-secondary/40 rounded-lg mb-4"></div>
              <div className="h-32 bg-secondary/40 rounded-lg mb-4"></div>
              <div className="h-64 bg-secondary/40 rounded-lg"></div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Se non ho i dati E non è in loading, mostra errore
  if (!currentMatch && !isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Match non trovato</AlertTitle>
            <AlertDescription>
              Impossibile caricare i dettagli della partita (ID: {matchId})
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  // Se ho currentMatch ma ID diverso, ancora loading 
  if (currentMatch && currentMatch.id !== matchId) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8">
          <div className="space-y-6">
            <div className="animate-pulse">
              <div className="h-8 bg-secondary/40 rounded-lg mb-4"></div>
              <div className="h-32 bg-secondary/40 rounded-lg mb-4"></div>
              <div className="h-64 bg-secondary/40 rounded-lg"></div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Handle error state
  if (error) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8">
          <Alert className="border-destructive bg-destructive/10">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Errore</AlertTitle>
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  const handleEditMatch = () => {
    setShowEditDialog(true);
  };

  const handleModalSave = async (data: any) => {
    try {
      await dispatch(updateMatch({
        matchId: currentMatch.id,
        matchData: {
          date: data.date,
          field: data.field,
          playersCount: data.playersCount,
          notes: data.notes
        }
      })).unwrap();

      toast({
        title: 'Match aggiornato!',
        description: 'Le modifiche sono state salvate con successo.'
      });
      setShowEditDialog(false);
    } catch (error) {
      toast({
        title: 'Errore',
        description: 'Non è stato possibile salvare le modifiche.',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteMatch = async () => {
    if (window.confirm('Sei sicuro di voler eliminare questa partita?')) {
      try {
        await dispatch(deleteMatch(currentMatch.id)).unwrap();

        toast({
          title: 'Match eliminato!',
          description: 'La partita è stata cancellata con successo.'
        });
        navigate('/');
      } catch (error) {
        toast({
          title: 'Errore',
          description: 'Non è stato possibile eliminare la partita.',
          variant: 'destructive'
        });
      }
    }
  };

  // 🔄 RIATTIVAZIONE UTENTE ASTENUTO
  const handleReactivateUser = async (userId: string) => {
    if (window.confirm('Sei sicuro di voler riattivare questo utente per la votazione di questa partita?')) {


      if (!userId || !currentMatch?.id) return;

      // 🚫 CONTROLLO: Non permettere riattivazione se match è completato
      if (currentMatch.status === 'completed') {
        toast({
          title: 'Operazione non permessa',
          description: 'Non è possibile riattivare utenti per partite già completate.',
          variant: 'destructive'
        });
        return;
      }

      try {
        await dispatch(reactivateVoter({
          matchId: currentMatch.id,
          userId
        })).unwrap();

        toast({
          title: 'Utente riattivato!',
          description: 'L\'utente può ora votare per questa partita.'
        });


        // 🔄 REFRESH GLOBALE - Sincronizza tutti i dati app-wide
        refreshData(); // Ricarica matches, users, sessions, playerCards

        // FALLBACK specifico per match corrente (se refreshData fallisce)
        dispatch(fetchMatchById(currentMatch.id));

        // Se abbiamo una voting session, ricarica anche i dati del voto
        if (currentMatch?.votingSession?.id) {
          dispatch(fetchMatchVotingData(currentMatch.votingSession.id));
        }

      } catch (error) {
        console.error('Errore riattivazione utente:', error);
        toast({
          title: 'Errore',
          description: 'Non è stato possibile riattivare l\'utente.',
          variant: 'destructive'
        });
      }
    }
  };

  return (
    <DashboardLayout>
      <div className="pb-24 lg:pb-8">
        <div className="p-6 lg:p-8 space-y-8 max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            {/* 🔙 Solo icona per mobile, testo nascosto */}
            <Button
              variant="secondary"
              onClick={() => navigate('/history')}
              className="border-2 border-border hover:bg-secondary/80"
              size="sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="sr-only">Torna allo Storico</span>
            </Button>

            {/* 🔧 Pulsanti Azione - Icona + Testo sempre visibili */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleEditMatch}
              className="border-2 border-border hover:bg-secondary/80"
            >
              <Edit className="w-4 h-4 mr-2" />
              Modifica
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteMatch}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Elimina
            </Button>

          </motion.div>

          {/* Messaggio informativo per partite non completate */}
          {currentMatch.status !== 'completed' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              <Alert className="bg-blue-50/50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
                <FileText className="h-4 w-4" />
                <AlertTitle>Dati in fase di completamento</AlertTitle>
                <AlertDescription>
                  Questa partita è in stato "{getStatusLabel(currentMatch.status)}".
                  Alcuni dati potrebbero essere ancora incompleti o in aggiornamento.
                </AlertDescription>
              </Alert>
            </motion.div>
          )}



          {/* Match Details Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <MatchDetailsCard
              match={{
                ...currentMatch,
                field: currentMatch.field || '', // 🔧 Assicura che field sia sempre string
                status: currentMatch.status as 'draft' | 'active' | 'completed' | 'cancelled', // 🔧 Type assertion per status
                // 🎯 Aggiungo dati astenuti per badge integrato
                hasAbstained: currentMatch.hasAbstained,
                abstainedNames: currentMatch.abstainedNames,
                abstainedUsers: currentMatch.abstainedUsers,
              }}
              voting={{
                isVotable: true,
                hasVoted: false,
                votingProgress: 65,
                votingDeadline: '2025-12-20T23:59:59Z'
              }}
              showActionButtons={false}
              onEditMatch={handleEditMatch}
              onDeleteMatch={handleDeleteMatch}
              // 🆕 Voting data from Redux
              calculation={matchVoting.calculation}
              submissions={matchVoting.submissions}
              isVotingLoading={matchVoting.isLoading}
              votingError={matchVoting.error}
              index={0}
              onClick={() => { }}
              onVoteClick={() => { }}
            />
          </motion.div>


        </div>
      </div>

      {/* EditModal per modificare match */}
      <EditModal
        isOpen={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        type='match'
        data={{
          field: currentMatch?.field || '',
          date: currentMatch?.date?.split('T')[0] || '',
          playersCount: currentMatch?.playersCount || 8,
          notes: currentMatch?.notes || '',
          // 🆕 Dati utenti astenuti
          abstainedUsers: currentMatch?.abstainedUsers || [],
          abstainedNames: currentMatch?.abstainedNames || [],
          hasAbstained: currentMatch?.hasAbstained || false,
          matchId: currentMatch?.id, // Serve per API riattivazione
          status: currentMatch?.status // 🆕 Status per controllo riattivazione
        }}
        onSave={handleModalSave}
        onReactivateUser={handleReactivateUser} // 🆕 Handler riattivazione
      />
    </DashboardLayout>
  );
}