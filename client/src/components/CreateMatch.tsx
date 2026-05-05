/**
 * 
 *
 * Flusso a 3 step:
 *   1. Dati partita (data, campo, formato)
 *   2. Partecipanti (chi giocherà — default tutti convocati)
 *   3. Astensioni (chi non voterà — default nessuno)
 *
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/redux/store/store';
import { AppDispatch } from '@/redux/store/store';
import { fetchTeamById } from '@/redux/slices/teamSlice';
import { createMatch } from '@/redux/slices/matchSlice';
import { CreateMatchRequest } from '@/types/api';
import { User, PlayersCount } from '@/types/match';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
    Calendar, MapPin, Users, ChevronRight, ChevronLeft, Check, UserMinus, Trophy, UserCheck, UserX
} from 'lucide-react';
import { getForecastForDate, isWithinForecastWindow, WeatherSnapshot } from '@/lib/weather';

// ─── MOCK DATA (fallback se non loggati) ─────────────────────
const MOCK_PLAYERS = [
    { id: '1', name: 'Marco Rossi' },
    { id: '2', name: 'Luca Bianchi' },
    { id: '3', name: 'Paolo Verdi' },
    { id: '4', name: 'Andrea Neri' },
    { id: '5', name: 'Gianni Blu' },
    { id: '6', name: 'Davide Gialli' },
    { id: '7', name: 'Stefano Viola' },
    { id: '8', name: 'Roberto Arancio' },
];

// ─── COMPONENTE ──────────────────────────────────────────────
const CreateMatch: React.FC = () => {
    const { user } = useSelector((state: RootState) => state.auth);
    const { currentTeam } = useSelector((state: RootState) => state.teams);
    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();
    const { toast } = useToast();

    // Step state
    const [step, setStep] = useState(1);
    const [creatingMatch, setCreatingMatch] = useState(false);

    // Step 1 — Dati partita
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [field, setField] = useState('');
    const [playersCount, setPlayersCount] = useState<PlayersCount>(8);

    // Meteo
    const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
    const [weatherLoading, setWeatherLoading] = useState(false);

    // Players loaded from team
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const useMock = !user || !currentTeam;

    // Step 2 — Partecipanti (default: tutti convocati)
    const [presentPlayers, setPresentPlayers] = useState<Record<string, boolean>>({});

    // Step 3 — Astensioni
    const [showAbstentions, setShowAbstentions] = useState(false);
    const [abstainedPlayers, setAbstainedPlayers] = useState<Record<string, boolean>>({});

    // ─── WEATHER FORECAST ─────────────────────────────────────
    useEffect(() => {
        const fetchWeather = async () => {
            if (!isWithinForecastWindow(date)) {
                setWeather(null);
                return;
            }
            setWeatherLoading(true);
            // Usa il campo come città, fallback "Torino"
            const city = field.trim() || 'Torino';
            const result = await getForecastForDate(city, date);
            setWeather(result);
            setWeatherLoading(false);
        };
        fetchWeather();
    }, [date, field]);

    // ─── LOAD TEAM MEMBERS (real API) ────────────────────────
    useEffect(() => {
        if (user?.teams?.length) {
            const teamId = user.teams[0].id;
            dispatch(fetchTeamById(teamId));
        }
    }, [user, dispatch]);

    useEffect(() => {
        if (currentTeam?.memberIds) {
            const convertedUsers: User[] = currentTeam.memberIds.map(member => ({
                id: member._id || member.id || '',
                name: member.name || '',
                email: member.email || '',
                teamId: member.teamIds?.[0] || (member.teams && member.teams[0]?.id) || '',
                teams: member.teams || []
            }));
            setAllUsers(convertedUsers);
            setPresentPlayers(Object.fromEntries(convertedUsers.map(u => [u.id, true])));
            setAbstainedPlayers(Object.fromEntries(convertedUsers.map(u => [u.id, false])));
        } else if (useMock) {
            // Fallback mock per visualizzazione test
            setAllUsers(MOCK_PLAYERS.map(p => ({ ...p, email: '', teamId: '', teams: [] })));
            setPresentPlayers(Object.fromEntries(MOCK_PLAYERS.map(p => [p.id, true])));
            setAbstainedPlayers(Object.fromEntries(MOCK_PLAYERS.map(p => [p.id, false])));
        }
    }, [currentTeam, useMock]);

    // Computed
    const playersList = allUsers.length > 0 ? allUsers : MOCK_PLAYERS.map(p => ({ ...p, email: '', teamId: '', teams: [] as any[] }));
    const presentCount = Object.values(presentPlayers).filter(Boolean).length;
    const abstainedCount = Object.entries(abstainedPlayers).filter(([id, v]) => v && presentPlayers[id]).length;
    const votersCount = presentCount - abstainedCount;

    // Quick actions
    const setAllPresent = () => setPresentPlayers(Object.fromEntries(playersList.map(p => [p.id, true])));
    const setAllAbsent = () => setPresentPlayers(Object.fromEntries(playersList.map(p => [p.id, false])));
    const resetAbstentions = () => setAbstainedPlayers(Object.fromEntries(playersList.map(p => [p.id, false])));

    // ─── SUBMIT (real API) ───────────────────────────────────
    const handleCreate = async () => {
        const selectedPlayerIds = Object.entries(presentPlayers).filter(([, v]) => v).map(([id]) => id);
        const abstainedIds = Object.entries(abstainedPlayers).filter(([id, v]) => v && presentPlayers[id]).map(([id]) => id);

        // Se non c'è connessione reale, mostra toast mock
        if (useMock) {
            toast({
                title: 'Partita creata',
                description: `${selectedPlayerIds.length} partecipanti, ${abstainedIds.length} astensioni. (demo)`,
            });
            return;
        }

        setCreatingMatch(true);
        try {
            const matchData: CreateMatchRequest = {
                teamId: (currentTeam as any).id || '',
                date,
                field: field.trim(),
                playersCount,
                teamMemberIds: selectedPlayerIds,
                abstainedMembers: abstainedIds.map(userId => ({
                    userId,
                    abstainedBy: user?.id || ''
                })),
            };

            const result = await dispatch(createMatch(matchData));

            if (createMatch.fulfilled.match(result)) {
                toast({
                    title: 'Partita creata',
                    description: 'Puoi invitare il gruppo a votare dopo la partita.',
                });
                navigate('/vote');
            } else {
                throw new Error(result.payload as string || 'Errore nella creazione');
            }
        } catch (error: any) {
            toast({
                title: 'Errore',
                description: error.message || 'Impossibile creare la partita.',
                variant: 'destructive'
            });
        } finally {
            setCreatingMatch(false);
        }
    };

    // ─── STEP NAVIGATION GUARDS ──────────────────────────────
    const canContinueStep1 = true; // campo opzionale
    const canContinueStep2 = presentCount >= 2;

    // ─── STEP 1: DATI PARTITA ──────────────────────────────────
    const renderStep1 = () => (
        <div className="space-y-5">
            <div className="text-center space-y-1">
                <h2 className="text-xl font-bold">Nuova Partita</h2>
                <p className="text-sm text-muted-foreground">Inserisci i dati della prossima partita</p>
            </div>

            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="date" className="flex items-center gap-2 text-base">
                        <Calendar className="h-4 w-4 text-primary" />
                        Data
                    </Label>
                    <Input
                        id="date"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="h-12 text-base"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="field" className="flex items-center gap-2 text-base">
                        <MapPin className="h-4 w-4 text-primary" />
                        Campo
                    </Label>
                    <Input
                        id="field"
                        type="text"
                        placeholder="Es. Sporting Mazzola Beinasco"
                        value={field}
                        onChange={(e) => setField(e.target.value)}
                        className="h-12 text-base"
                    />
                </div>

                {/* Meteo preview */}
                {(weather || weatherLoading) && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border">
                        {weatherLoading ? (
                            <p className="text-sm text-muted-foreground">Caricamento meteo...</p>
                        ) : weather ? (
                            <div className="flex items-center gap-2">
                                <span className="text-lg">{weather.icon}</span>
                                <div>
                                    <p className="text-sm font-medium">{weather.description}, {weather.temperatureC}°C</p>
                                    <p className="text-xs text-muted-foreground">Previsione meteo per la partita</p>
                                </div>
                            </div>
                        ) : null}
                    </div>
                )}

                <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-base">
                        <Users className="h-4 w-4 text-primary" />
                        Formato
                    </Label>
                    <Select value={playersCount.toString()} onValueChange={(v) => setPlayersCount(Number(v) as PlayersCount)}>
                        <SelectTrigger className="h-12 text-base">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="5">5 vs 5</SelectItem>
                            <SelectItem value="8">8 vs 8</SelectItem>
                            <SelectItem value="11">11 vs 11</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    );

    // ─── STEP 2: PARTECIPANTI ──────────────────────────────────
    const renderStep2 = () => (
        <div className="space-y-4">
            <div className="text-center space-y-1">
                <h2 className="text-xl font-bold">Chi giocherà?</h2>
                <p className="text-sm text-muted-foreground">
                    Tutti convocati di default. Escludi chi non ci sarà.
                </p>
            </div>

            {/* Quick actions */}
            <div className="flex gap-2">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={`flex-1 text-xs gap-1.5 ${presentCount === playersList.length ? 'border-green-500/50 text-green-700 dark:text-green-400' : ''}`}
                    onClick={setAllPresent}
                >
                    <UserCheck className="h-3.5 w-3.5" />
                    Tutti convocati
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={`flex-1 text-xs gap-1.5 ${presentCount === 0 ? 'border-red-500/50 text-red-700 dark:text-red-400' : ''}`}
                    onClick={setAllAbsent}
                >
                    <UserX className="h-3.5 w-3.5" />
                    Nessuno convocato
                </Button>
            </div>

            {/* Messaggio validazione */}
            {presentCount < 2 && (
                <p className="text-sm text-red-500 text-center font-medium">
                    Servono almeno 2 partecipanti per continuare
                </p>
            )}

            {/* Lista giocatori con Switch grandi */}
            <div className="space-y-1">
                {playersList.map((player) => (
                    <div
                        key={player.id}
                        className={`flex items-center justify-between p-3 rounded-lg transition-colors ${presentPlayers[player.id]
                            ? 'bg-green-500/10 border border-green-500/20'
                            : 'bg-muted/30 border border-transparent opacity-60'
                            }`}
                    >
                        <span className={`text-base font-medium ${!presentPlayers[player.id] ? 'line-through text-muted-foreground' : ''}`}>
                            {player.name}
                        </span>
                        <Switch
                            checked={presentPlayers[player.id] || false}
                            onCheckedChange={(checked) =>
                                setPresentPlayers({ ...presentPlayers, [player.id]: checked })
                            }
                        />
                    </div>
                ))}
            </div>

            {/* Counter */}
            <div className="text-center">
                <Badge variant="secondary" className="text-sm px-3 py-1">
                    {presentCount} su {playersList.length} convocati
                </Badge>
            </div>
        </div>
    );

    // ─── STEP 3: ASTENSIONI ────────────────────────────────────
    const renderStep3 = () => {
        const presentPlayersList = playersList.filter(p => presentPlayers[p.id]);

        return (
            <div className="space-y-4">
                <div className="text-center space-y-1">
                    <h2 className="text-xl font-bold">Chi non voterà?</h2>
                    <p className="text-sm text-muted-foreground">
                        Di solito votano tutti. Imposta eccezioni solo se necessario.
                    </p>
                </div>

                {/* Toggle principale */}
                <Card className={`border-2 transition-colors ${!showAbstentions ? 'border-green-500/30 bg-green-500/5' : 'border-orange-500/30 bg-orange-500/5'}`}>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <p className="font-medium text-base flex items-center gap-2">
                                    {!showAbstentions
                                        ? <><UserCheck className="h-4 w-4 text-green-600" /> Tutti voteranno</>
                                        : <><UserMinus className="h-4 w-4 text-orange-500" /> Ci sono astensioni</>
                                    }
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {!showAbstentions
                                        ? `Tutti i ${presentCount} partecipanti potranno votare`
                                        : 'Seleziona chi parteciperà ma non voterà'
                                    }
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant={showAbstentions ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => {
                                    setShowAbstentions(!showAbstentions);
                                    if (showAbstentions) resetAbstentions();
                                }}
                            >
                                {showAbstentions ? 'Annulla' : 'Imposta'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Lista astensioni (condizionale) */}
                {showAbstentions && (
                    <div className="space-y-1">
                        <div className="flex gap-2 mb-2">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-xs"
                                onClick={resetAbstentions}
                            >
                                Resetta astensioni
                            </Button>
                        </div>
                        {presentPlayersList.map((player) => (
                            <div
                                key={player.id}
                                className={`flex items-center justify-between p-3 rounded-lg transition-colors ${abstainedPlayers[player.id]
                                    ? 'bg-orange-500/10 border border-orange-500/20'
                                    : 'bg-background border border-border'
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    {abstainedPlayers[player.id] && <UserMinus className="h-4 w-4 text-orange-500" />}
                                    <span className={`text-base ${abstainedPlayers[player.id] ? 'text-orange-700 dark:text-orange-300' : ''}`}>
                                        {player.name}
                                    </span>
                                </div>
                                <Switch
                                    checked={abstainedPlayers[player.id] || false}
                                    onCheckedChange={(checked) =>
                                        setAbstainedPlayers({ ...abstainedPlayers, [player.id]: checked })
                                    }
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    // ─── STEPPER INDICATOR ─────────────────────────────────────
    const renderStepper = () => (
        <div className="flex items-center justify-center gap-2 mb-4">
            {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center gap-2">
                    <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${s === step
                            ? 'bg-primary text-primary-foreground'
                            : s < step
                                ? 'bg-green-500 text-white'
                                : 'bg-muted text-muted-foreground'
                            }`}
                    >
                        {s < step ? <Check className="w-4 h-4" /> : s}
                    </div>
                    {s < 3 && <div className={`w-8 h-0.5 ${s < step ? 'bg-green-500' : 'bg-muted'}`} />}
                </div>
            ))}
        </div>
    );

    // ─── FOOTER STICKY ─────────────────────────────────────────
    const renderFooter = () => {
        const canContinue = step === 1 ? canContinueStep1 : step === 2 ? canContinueStep2 : true;

        return (
            <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t p-4 z-50">
                {/* Riepilogo numerico */}
                <div className="flex justify-center gap-4 mb-3 text-xs">
                    <div className="text-center">
                        <p className="font-bold text-lg text-green-600">{presentCount}</p>
                        <p className="text-muted-foreground">Convocati</p>
                    </div>
                    <div className="text-center">
                        <p className="font-bold text-lg text-orange-500">{abstainedCount}</p>
                        <p className="text-muted-foreground">Non votano</p>
                    </div>
                    <div className="text-center">
                        <p className="font-bold text-lg text-primary">{votersCount}</p>
                        <p className="text-muted-foreground">Votanti</p>
                    </div>
                </div>

                {/* Navigation buttons */}
                <div className="flex gap-3 max-w-lg mx-auto">
                    {step > 1 && (
                        <Button
                            type="button"
                            variant="outline"
                            className="flex-1 h-12 text-base"
                            onClick={() => setStep(step - 1)}
                        >
                            <ChevronLeft className="w-4 h-4 mr-1" /> Indietro
                        </Button>
                    )}
                    {step < 3 ? (
                        <Button
                            type="button"
                            className="flex-1 h-12 text-base"
                            onClick={() => setStep(step + 1)}
                            disabled={!canContinue}
                        >
                            Continua <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            className="flex-1 h-12 text-base bg-primary hover:bg-primary/90 text-primary-foreground"
                            onClick={handleCreate}
                            disabled={presentCount < 2 || creatingMatch}
                        >
                            <Trophy className="w-4 h-4 mr-2" />
                            {creatingMatch ? 'Creando...' : 'Crea Partita'}
                        </Button>
                    )}
                </div>
            </div>
        );
    };

    // ─── RENDER ────────────────────────────────────────────────
    return (
        <div className="min-h-screen pb-40">
            <div className="p-4 max-w-lg mx-auto">
                {renderStepper()}

                <Card>
                    <CardContent className="p-4">
                        {step === 1 && renderStep1()}
                        {step === 2 && renderStep2()}
                        {step === 3 && renderStep3()}
                    </CardContent>
                </Card>
            </div>

            {renderFooter()}
        </div>
    );
};

export default CreateMatch;
