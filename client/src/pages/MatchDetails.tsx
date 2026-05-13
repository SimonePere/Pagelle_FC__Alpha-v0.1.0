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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Calendar, CloudRain, Trophy, Target, Users,
  CheckCircle, Clock, Trash2, AlertCircle, Award, Search, Copy
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Match, User } from '@/types/match';
import { useToast } from '@/hooks/use-toast';
import EditModal from '@/components/EditModal';
import MatchDetailsCard from '@/components/MatchDetailsCard';
import useEnrichedMatches from '@/hooks/useEnrichedMatches';
import { isAdmin } from '@/utils/permissions';
import { api } from '@/lib/api';

export default function MatchDetails() {
  const { matchId } = useParams();
  const { user, isGuest } = useSelector((state: RootState) => state.auth);
  const { isLoading, error, matches } = useSelector((state: RootState) => state.matches);

  // 🗳️ Voting data selector 
  const { matchVoting, sessions } = useSelector((state: RootState) => state.voting);

  // 🎯 ENRICHED MATCHES - Con dati astenuti integrati + refresh function
  const { matches: enrichedMatches, refreshData, abstainedInfoLoading } = useEnrichedMatches();
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (matchId) {
      dispatch(fetchMatchById(matchId));
    }
    // Carica sessions solo per utenti full (i guest usano il session ID dalla risposta match)
    if (!isGuest) {
      dispatch(fetchUserVotingSessions({ page: 1, limit: 50 }));
    }
  }, [matchId, user, navigate, dispatch, isGuest]);

  // 🆕 Usa votingSession.id direttamente dal match (funziona per guest e full)
  // Fallback: cerca nelle sessions Redux già caricate (utenti full)
  const matchVotingSessionId = currentMatch?.votingSession?.id
    || sessions.find((s: any) => s.targetId === matchId)?.id;

  // 🔒 Status sessione voto STABILE: prendiamo da Redux sessions[] (più affidabile
  //    perché aggiornato da fetchUserVotingSessions e non oscilla con l'enrichment).
  //    Fallback su currentMatch.votingSession.status.
  const matchVotingSessionStatus =
    sessions.find((s: any) => s.targetId === matchId)?.status
    || currentMatch?.votingSession?.status
    || null;

  useEffect(() => {
    if (matchVotingSessionId) {
      dispatch(fetchMatchVotingData(matchVotingSessionId));
    } else if (matchId) {
      dispatch(clearMatchVotingData());
    }
  }, [matchVotingSessionId, matchId, dispatch]);

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

  const handleDeleteMatch = () => {
    setShowDeleteDialog(true);
  };

  const confirmDeleteMatch = async () => {
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
    setShowDeleteDialog(false);
  };

  // 🔒 FORCE-CLOSE VOTAZIONE (solo admin)
  //    Chiama POST /voting-sessions/:id/force-close.
  //    Il backend astiene d'ufficio i pending (reason='deadline_expired')
  //    e completa la sessione (completionType='manual'). Se nessuno ha votato
  //    la sessione viene cancellata.
  //    Throw in caso di errore: così EditModal sa che non deve resettare lo stato.
  const handleForceCloseSession = async () => {
    if (!matchVotingSessionId) throw new Error('Nessuna sessione di voto');
    try {
      const res: any = await api.post(`/voting-sessions/${matchVotingSessionId}/force-close`);

      if (res?.action === 'cancelled_no_votes') {
        toast({
          title: 'Votazione annullata',
          description: 'Nessuno aveva votato: la sessione è stata cancellata.'
        });
      } else if (res?.action === 'noop_already_closed') {
        toast({
          title: 'Già chiusa',
          description: 'Questa votazione era già stata completata.'
        });
      } else {
        const pending = res?.pendingAbstained ?? 0;
        toast({
          title: 'Votazione chiusa!',
          description: pending > 0
            ? `${pending} utente/i astenuti d'ufficio. Medie ufficiali calcolate.`
            : 'Medie ufficiali calcolate e salvate.'
        });
      }

      // Refresh dati app + match corrente + voting data
      refreshData();
      dispatch(fetchMatchById(currentMatch.id));
      dispatch(fetchMatchVotingData(matchVotingSessionId));
    } catch (error: any) {
      console.error('Errore force-close votazione:', error);
      toast({
        title: 'Errore',
        description: error?.response?.data?.error || 'Impossibile chiudere la votazione.',
        variant: 'destructive'
      });
      throw error;
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
              showActionButtons={isAdmin(user)}
              onEditMatch={handleEditMatch}
              onDeleteMatch={handleDeleteMatch}
              // 🆕 Voting data from Redux
              calculation={matchVoting.calculation}
              submissions={matchVoting.submissions}
              isVotingLoading={matchVoting.isLoading}
              votingError={matchVoting.error}
              isAbstainedInfoLoading={abstainedInfoLoading}
              index={0}
              onClick={() => { }}
              onVoteClick={() => { }}
            />
          </motion.div>


        </div>
      </div>

      {/* Dialog conferma eliminazione */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent
          className="w-[calc(100%-2rem)] max-w-xs rounded-xl p-0 gap-0"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Trash2 className="w-4 h-4 text-destructive" />
              Elimina Partita
            </DialogTitle>
          </DialogHeader>
          <div className="px-4 pb-3">
            <p className="text-sm text-muted-foreground">Sei sicuro di voler eliminare questa partita? L'operazione non è reversibile.</p>
          </div>
          <DialogFooter className="px-4 py-3 flex-row gap-2 border-t">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-9 text-sm"
              onClick={() => setShowDeleteDialog(false)}
            >
              Annulla
            </Button>
            <Button
              size="sm"
              className="flex-1 h-9 text-sm bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={confirmDeleteMatch}
            >
              Elimina
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
        onForceCloseSession={isAdmin(user) ? handleForceCloseSession : undefined}
        canForceCloseSession={!!matchVotingSessionId && matchVotingSessionStatus === 'active'}
      />
    </DashboardLayout>
  );
}