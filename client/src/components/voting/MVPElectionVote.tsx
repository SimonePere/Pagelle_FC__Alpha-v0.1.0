/**
 * 🏆 MVP ELECTION VOTE COMPONENT
 * Componente per eleggere il MVP (Most Valuable Player) della partita
 * Interfaccia a candidati con votazione semplice
 */

import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/redux/store/store';
import { 
  submitVote, 
  updateDraftVote, 
  clearDraftVote,
  selectDraftVote 
} from '@/redux/slices/votingSlice';
import type { VotingSession, MVPElectionVote as MVPElectionVoteType } from '@/types/voting';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { ArrowLeft, Trophy, Star, User } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface VoteComponentProps {
  votingSession: VotingSession;
  onComplete: () => void;
  onCancel: () => void;
}

// 🧪 MOCK DATA - Candidati per elezione MVP
const mockCandidates = [
  {
    id: 'player_001',
    name: 'Mario Rossi',
    position: 'Attaccante',
    stats: {
      goals: 2,
      assists: 1,
      rating: 8.5,
      minutes: 90
    }
  },
  {
    id: 'player_002', 
    name: 'Luca Bianchi',
    position: 'Centrocampista',
    stats: {
      goals: 0,
      assists: 3,
      rating: 8.2,
      minutes: 75
    }
  },
  {
    id: 'player_003',
    name: 'Giuseppe Verdi',
    position: 'Difensore',
    stats: {
      goals: 1,
      assists: 0,
      rating: 8.0,
      minutes: 90
    }
  },
  {
    id: 'player_004',
    name: 'Antonio Neri',
    position: 'Portiere',
    stats: {
      goals: 0,
      assists: 0,
      rating: 7.8,
      saves: 5,
      minutes: 90
    }
  }
];

export default function MVPElectionVote({ votingSession, onComplete, onCancel }: VoteComponentProps) {
  const dispatch = useDispatch<AppDispatch>();
  
  // Redux state
  const { isSubmittingVote, submitError } = useSelector((state: RootState) => state.voting);
  const draftVote = useSelector(selectDraftVote(votingSession.id));
  
  // Local state
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [validationError, setValidationError] = useState<string>('');

  // Initialize from draft
  useEffect(() => {
    if (draftVote) {
      const draft = draftVote as Partial<MVPElectionVoteType>;
      setSelectedPlayerId(draft.selectedPlayerId || '');
      setReason(draft.reason || '');
    }
  }, [draftVote]);

  // Auto-save draft ogni 2 secondi
  useEffect(() => {
    if (selectedPlayerId || reason) {
      const saveTimer = setTimeout(() => {
        dispatch(updateDraftVote({
          sessionId: votingSession.id,
          draftVote: {
            selectedPlayerId: selectedPlayerId || undefined,
            reason: reason || undefined
          } as Partial<MVPElectionVoteType>
        }));
      }, 2000);

      return () => clearTimeout(saveTimer);
    }
  }, [selectedPlayerId, reason, dispatch, votingSession.id]);

  const handlePlayerSelect = (playerId: string) => {
    setSelectedPlayerId(playerId);
    setValidationError('');
  };

  const handleReasonChange = (value: string) => {
    setReason(value);
    if (value.length > 500) {
      setValidationError('La motivazione non può superare i 500 caratteri');
    } else {
      setValidationError('');
    }
  };

  const validateVote = (): boolean => {
    if (!selectedPlayerId) {
      setValidationError('Devi selezionare un giocatore per il MVP');
      return false;
    }
    
    if (reason.length > 500) {
      setValidationError('La motivazione non può superare i 500 caratteri');
      return false;
    }

    setValidationError('');
    return true;
  };

  const handleSubmit = async () => {
    if (!validateVote()) {
      return;
    }

    try {
      const voteData: MVPElectionVoteType = {
        selectedPlayerId,
        reason: reason || undefined
      };
      const result = await dispatch(submitVote({
        sessionId: votingSession.id,
        voteData: {
          vote: voteData,
          deviceInfo: {
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
          }
        }
      }));

      if (submitVote.fulfilled.match(result)) {
        // Clear draft on success
        dispatch(clearDraftVote(votingSession.id));
        
        toast({
          title: "Voto inviato!",
          description: `Hai votato ${mockCandidates.find(c => c.id === selectedPlayerId)?.name} come MVP`,
          variant: "default",
        });

        setTimeout(() => {
          onComplete();
        }, 1500);
      } else {
        throw new Error(result.payload as string);
      }
    } catch (error: any) {
      console.error('❌ Errore invio voto MVP:', error);
      
      toast({
        title: "Errore",
        description: error.message || "Errore nell'invio del voto",
        variant: "destructive",
      });
    }
  };

  const selectedCandidate = mockCandidates.find(c => c.id === selectedPlayerId);

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Indietro
        </Button>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <h1 className="text-xl font-bold">{votingSession.title}</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            {votingSession.description}
          </p>
        </div>
      </div>

      {/* Progress Info */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Progresso votazione</span>
          <span>{votingSession.submissionsCount}/{votingSession.eligibleVotersCount} voti raccolti</span>
        </div>
        <div className="w-full bg-secondary rounded-full h-2 mt-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-500"
            style={{ 
              width: `${Math.round((votingSession.submissionsCount / votingSession.eligibleVotersCount) * 100)}%` 
            }}
          />
        </div>
      </div>

      {/* Error Alert */}
      {(validationError || submitError) && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Errore</AlertTitle>
          <AlertDescription>
            {validationError || submitError}
          </AlertDescription>
        </Alert>
      )}

      {/* Candidates Grid */}
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        {mockCandidates.map((candidate) => (
          <Card 
            key={candidate.id}
            className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
              selectedPlayerId === candidate.id 
                ? 'ring-2 ring-primary bg-primary/5' 
                : 'hover:ring-1 hover:ring-border'
            }`}
            onClick={() => handlePlayerSelect(candidate.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="w-12 h-12">
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <User className="w-6 h-6 text-muted-foreground" />
                  </div>
                </Avatar>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{candidate.name}</h3>
                    {selectedPlayerId === candidate.id && (
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {candidate.position}
                  </Badge>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="text-center p-2 bg-muted/50 rounded">
                  <div className="font-semibold">{candidate.stats.goals}</div>
                  <div className="text-xs text-muted-foreground">Gol</div>
                </div>
                <div className="text-center p-2 bg-muted/50 rounded">
                  <div className="font-semibold">{candidate.stats.assists}</div>
                  <div className="text-xs text-muted-foreground">Assist</div>
                </div>
                <div className="text-center p-2 bg-muted/50 rounded">
                  <div className="font-semibold">{candidate.stats.rating}</div>
                  <div className="text-xs text-muted-foreground">Voto</div>
                </div>
              </div>

              {/* Special stats for goalkeeper */}
              {candidate.stats.saves !== undefined && (
                <div className="mt-2 text-center p-2 bg-muted/50 rounded text-sm">
                  <div className="font-semibold">{candidate.stats.saves}</div>
                  <div className="text-xs text-muted-foreground">Parate</div>
                </div>
              )}

              <div className="mt-3 text-xs text-muted-foreground text-center">
                {candidate.stats.minutes}' giocati
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Selected Candidate Preview */}
      {selectedCandidate && (
        <Card className="mb-6 bg-primary/5 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500" />
              MVP selezionato
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Avatar className="w-8 h-8">
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
              </Avatar>
              <div>
                <div className="font-medium">{selectedCandidate.name}</div>
                <div className="text-sm text-muted-foreground">
                  {selectedCandidate.position} • Voto {selectedCandidate.stats.rating}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reason Input */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm">
            Motivazione (opzionale)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Scrivi perché hai scelto questo giocatore come MVP..."
            value={reason}
            onChange={(e) => handleReasonChange(e.target.value)}
            className="min-h-[100px] resize-none"
            maxLength={500}
          />
          <div className="text-right text-xs text-muted-foreground mt-2">
            {reason.length}/500 caratteri
          </div>
        </CardContent>
      </Card>

      {/* Submit Section */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onCancel}
          className="flex-1"
          disabled={isSubmittingVote}
        >
          Annulla
        </Button>
        
        <Button
          onClick={handleSubmit}
          className="flex-1"
          disabled={!selectedPlayerId || isSubmittingVote}
        >
          {isSubmittingVote ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
              Invio in corso...
            </div>
          ) : (
            <>
              <Trophy className="w-4 h-4 mr-2" />
              Conferma Voto MVP
            </>
          )}
        </Button>
      </div>

      {/* Footer Info */}
      <div className="mt-6 p-4 bg-muted/50 rounded-lg">
        <div className="text-sm text-muted-foreground text-center">
          {votingSession.isAnonymous ? (
            <>🔒 Votazione anonima • Il tuo voto non sarà visibile pubblicamente</>
          ) : (
            <>👤 Votazione pubblica • Il tuo voto sarà visibile agli altri membri</>
          )}
        </div>
      </div>
    </div>
  );
}