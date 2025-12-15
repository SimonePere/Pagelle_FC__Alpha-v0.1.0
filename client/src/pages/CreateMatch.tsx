import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store/store';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Calendar, MapPin, Trophy, FileText, Users } from 'lucide-react';
import { User, Match, PlayersCount } from '@/types/match';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/redux/store/store';
import { fetchTeamById } from '@/redux/slices/teamSlice';
import { createMatch } from '@/redux/slices/matchSlice';
import { CreateMatchRequest } from '@/types/api';

const CreateMatch = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const { currentTeam, isLoading } = useSelector((state: RootState) => state.teams);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [creatingMatch, setCreatingMatch] = useState(false);
  const [field, setField] = useState('');
  const [playersCount, setPlayersCount] = useState<PlayersCount>(8);
  const [notes, setNotes] = useState('');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);

  useEffect(() => {
    console.log('🔐 Controllo autenticazione utente...');

    if (!user || !user.teams?.length) {
      console.log('❌ Utente non autenticato o senza team');
      navigate('/login');
      return;
    }

    const loadTeamMembers = async () => {
      setLoadingMembers(true);
      try {
        const teamId = user.teams[0].id; // Primo team dell'utente
        console.log('📋 Caricando membri del team:', teamId);
        const result = await dispatch(fetchTeamById(teamId));
        console.log('✅ Team caricato con successo');
      } catch (error) {
        console.error('❌ Errore nel caricamento team:', error);
        toast({
          title: 'Errore',
          description: 'Impossibile caricare i membri del team.',
          variant: 'destructive'
        });
      } finally {
        setLoadingMembers(false);
      }
    };

    loadTeamMembers();
  }, [user, navigate, dispatch, toast]);

  // Secondo useEffect per gestire la risposta del team dal backend
  useEffect(() => {
    if (currentTeam?.memberIds) {
      console.log(`👥 Convertendo ${currentTeam.memberIds.length} membri del team per la UI`);

      // Redux Toolkit usa Immer che crea "draft" objects
      // Convertiamo i draft a oggetti normali con tutte le proprietà richieste
      const convertedUsers: User[] = currentTeam.memberIds.map(member => ({
        id: member._id || member.id || '',
        name: member.name || '',
        email: member.email || '',
        teamId: member.teamId || (member.teams && member.teams[0]?.id) || '',
        teams: member.teams || []
      }));

      setAllUsers(convertedUsers);

      // Estraiamo gli ID dei membri per la selezione
      setSelectedPlayers(convertedUsers.map(user => user.id).filter(Boolean));

      console.log('✅ Membri pronti per la selezione:', convertedUsers.map(u => u.name).join(', '));
    }
  }, [currentTeam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !currentTeam) {
      console.log('❌ Utente o team mancanti');
      return;
    }

    // Validazioni frontend
    if (!field.trim()) {
      toast({
        title: 'Errore',
        description: 'Inserisci il nome del campo.',
        variant: 'destructive'
      });
      return;
    }

    if (selectedPlayers.length < 2) {
      toast({
        title: 'Errore',
        description: 'Devi selezionare almeno 2 giocatori.',
        variant: 'destructive'
      });
      return;
    }

    setCreatingMatch(true);

    try {
      console.log('🏈 Creando match via API...');

      // Prepara i dati per l'API backend
      const matchData: CreateMatchRequest = {
        teamId: (currentTeam as any).id || '',
        date,
        field: field.trim(),
        playersCount,
        notes: notes.trim() || undefined,
        teamMemberIds: selectedPlayers
      };

      console.log('📤 Dati inviati al backend:', matchData);

      // Chiama l'API tramite Redux
      const result = await dispatch(createMatch(matchData));

      if (createMatch.fulfilled.match(result)) {
        console.log('✅ Match creato con successo!');

        toast({
          title: 'Partita creata! 🎉',
          description: 'Ora puoi valutare i tuoi compagni di squadra.',
        });

        navigate('/vote');
      } else {
        throw new Error(result.payload as string || 'Errore nella creazione');
      }

    } catch (error: any) {
      console.error('❌ Errore creazione match:', error);

      toast({
        title: 'Errore',
        description: error.message || 'Impossibile creare la partita.',
        variant: 'destructive'
      });
    } finally {
      setCreatingMatch(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="container max-w-4xl py-4 lg:py-8 px-4 lg:px-8">
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-3xl">
              <Trophy className="text-primary" />
              Crea Nuova Partita
            </CardTitle>
            <CardDescription>
              Configura i dettagli della partita per {user?.teamName || 'la tua squadra'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="date" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Data
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="field" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Campo
                  </Label>
                  <Input
                    id="field"
                    type="text"
                    placeholder="Nome del campo di gioco"
                    value={field}
                    onChange={(e) => setField(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="playersCount" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Numero Giocatori
                  </Label>
                  <Select value={playersCount.toString()} onValueChange={(value) => setPlayersCount(Number(value) as PlayersCount)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona numero giocatori" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 vs 5</SelectItem>
                      <SelectItem value="8">8 vs 8</SelectItem>
                      <SelectItem value="11">11 vs 11</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Note Aggiuntive
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Aggiungi note, commenti o dettagli sulla partita..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>

              {/* Player Selection */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-base">
                  <Users className="h-5 w-5" />
                  Seleziona Giocatori Partecipanti
                </Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Seleziona i giocatori che parteciperanno a questa partita
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-secondary/20 rounded-lg border border-border">
                  {allUsers.map((player) => (
                    <div key={player.id} className="flex items-center space-x-3 p-2 rounded hover:bg-secondary/40 transition-colors">
                      <Checkbox
                        id={`player-${player.id}`}
                        checked={selectedPlayers.includes(player.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedPlayers([...selectedPlayers, player.id]);
                          } else {
                            setSelectedPlayers(selectedPlayers.filter(id => id !== player.id));
                          }
                        }}
                      />
                      <Label
                        htmlFor={`player-${player.id}`}
                        className="flex-1 cursor-pointer font-medium"
                      >
                        {player.name}
                      </Label>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  {selectedPlayers.length} / {allUsers.length} giocatori selezionati
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate('/')}
                  className="flex-1"
                  disabled={creatingMatch}
                >
                  Annulla
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={creatingMatch || selectedPlayers.length < 2}
                >
                  {creatingMatch ? 'Creando...' : 'Crea Partita'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CreateMatch;
