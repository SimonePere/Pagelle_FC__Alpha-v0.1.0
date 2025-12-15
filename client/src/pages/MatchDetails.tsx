import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { current } from '@reduxjs/toolkit';
import { RootState, AppDispatch } from '@/redux/store/store';
import { fetchMatchById, updateMatch, deleteMatch } from '@/redux/slices/matchSlice';
import { fetchMatchVotingData, clearMatchVotingData } from '@/redux/slices/votingSlice';
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import MatchDetailsCard from '@/components/MatchDetailsCard';

export default function MatchDetails() {
  const { matchId } = useParams();
  const { user } = useSelector((state: RootState) => state.auth);
  const { isLoading, error, matches } = useSelector((state: RootState) => state.matches);

  // 🗳️ Voting data selector 
  const { matchVoting } = useSelector((state: RootState) => state.voting);

  // 🎯 NUOVO APPROCCIO - Prendi match dall'array matches (come MatchGrid)
  const currentMatch = matches?.find?.(match => match?.id === matchId) || null;

  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { toast } = useToast();

  // SAFETY CHECK: Se il currentMatch ha un ID diverso da quello richiesto, forza un nuovo fetch
  useEffect(() => {
    if (currentMatch && currentMatch.id !== matchId) {
      dispatch(fetchMatchById(matchId));
    }
  }, [currentMatch, matchId, dispatch]);

  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    date: '',
    opponent: '',
    weather: '',
    notes: '',
    playersCount: 11 as 5 | 8 | 11,
    selectedPlayers: [] as string[]
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (matchId) {
      console.log('📡 MatchDetails -> fetchMatchById:', matchId);
      dispatch(fetchMatchById(matchId));
    }
  }, [matchId, user, navigate, dispatch]);

  // 🆕 Fetch voting data quando ho votingSession ID
  useEffect(() => {
    if (currentMatch?.votingSession?.id) {
      const sessionId = currentMatch.votingSession.id;
      console.log('📡 MatchDetails -> fetchMatchVotingData:', sessionId);
      dispatch(fetchMatchVotingData(sessionId));
    }

    // 🧹 Clear voting data quando cambio match o non ho session
    if (currentMatch && !currentMatch.votingSession?.id) {
      dispatch(clearMatchVotingData());
    }
  }, [currentMatch?.votingSession?.id, dispatch]);

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
    setEditForm({
      date: currentMatch.date.split('T')[0],
      opponent: currentMatch.field, // field è il nuovo nome per opponent
      weather: '', // Non più presente, lasciamo vuoto
      notes: currentMatch.notes || '',
      playersCount: currentMatch.playersCount || 11,
      selectedPlayers: currentMatch.teamMemberIds || []
    });
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    try {
      await dispatch(updateMatch({
        matchId: currentMatch.id,
        matchData: {
          date: editForm.date,
          field: editForm.opponent,
          playersCount: editForm.playersCount,
          notes: editForm.notes,
          teamMemberIds: editForm.selectedPlayers
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

  return (
    <DashboardLayout>
      <div className="pb-24 lg:pb-8">
        <div className="p-6 lg:p-8 space-y-8 max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4"
          >
            <Button
              variant="secondary"
              onClick={() => navigate('/history')}
              className="border-2 border-border hover:bg-secondary/80"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Torna allo Storico
            </Button>


          </motion.div>


          {/* per ora commentato quello che doveva essere il titolo della pagina, perche troppo grosso e invadente.
toglie importanza al contenuto dettagliato della partita */}

          {/* <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl bg-card/80 backdrop-blur-sm border-border shadow-card p-8"
          >
            <div className="relative z-10">
              <h1 className="font-display text-4xl font-bold text-foreground flex items-center gap-3">
                <Search className="w-8 h-8 text-primary" />
                Dettagli Partita
              </h1>
              <p className="text-muted-foreground text-lg mt-4">
                Visualizza i dettagli completi della partita selezionata.
              </p>
            </div>
            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl"></div>
          </motion.div> */}




          {/* Match Info Card */}
          {/* <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-card/80 backdrop-blur-sm border-border shadow-card">
              <CardHeader className="border-b border-border">
                <CardTitle className="flex items-center gap-3 font-display text-2xl">
                  <FileText className="w-6 h-6 text-primary" />
                  Informazioni Partita
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <div className="flex flex-wrap gap-4 text-muted-foreground">
                      <span className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {new Date(currentMatchData.date).toLocaleDateString('it-IT')}
                      </span>
                      <span className="flex items-center gap-2">
                        <CloudRain className="w-4 h-4" />
                        {currentMatchData.weather || 'N/A'}
                      </span>
                      <span className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        {currentMatchData.teamMemberIds.length} Giocatori
                      </span>
                    </div>
                    {currentMatchData.notes && (
                      <div className="mt-4 p-3 bg-secondary/40 rounded-lg border border-border/50">
                        <div className="flex items-start gap-2 text-sm">
                          <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
                          <p className="text-muted-foreground">{currentMatchData.notes}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  {currentMatchData.status !== 'completed' && (
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleEditMatch}
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
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div> */}

          {/* Match Details Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <MatchDetailsCard
              match={currentMatch}
              voting={{
                isVotable: true,
                hasVoted: false,
                votingProgress: 65,
                votingDeadline: '2025-12-20T23:59:59Z'
              }}
              // 🆕 Voting data from Redux
              calculation={matchVoting.calculation}
              submissions={matchVoting.submissions}
              isVotingLoading={matchVoting.isLoading}
              votingError={matchVoting.error}
              index={0}
              onClick={(match) => console.log('🎯 MatchDetails -> Card clicked:', match?.id)}
              onVoteClick={(match) => console.log('🗳️ MatchDetails -> Vote clicked:', match?.id)}
            />
          </motion.div>


        </div>
      </div>


    </DashboardLayout>
  );
}