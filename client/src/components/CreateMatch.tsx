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
                {/* Data + Formato affiancati */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                        <Label htmlFor="date" className="flex items-center gap-1.5 text-sm">
                            <Calendar className="h-3.5 w-3.5 text-primary" />
                            Data
                        </Label>
                        <Input
                            id="date"
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="h-11 text-sm"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="flex items-center gap-1.5 text-sm">
                            <Users className="h-3.5 w-3.5 text-primary" />
                            Formato
                        </Label>
                        <Select value={playersCount.toString()} onValueChange={(v) => setPlayersCount(Number(v) as PlayersCount)}>
                            <SelectTrigger className="h-11 text-sm">
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

                <div className="space-y-2">
                    <Label htmlFor="field" className="flex items-center gap-1.5 text-sm">
                        <MapPin className="h-3.5 w-3.5 text-primary" />
                        Campo
                    </Label>
                    <Input
                        id="field"
                        type="text"
                        placeholder="Es. Sporting Mazzola Beinasco"
                        value={field}
                        onChange={(e) => setField(e.target.value)}
                        className="h-11 text-sm"
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
                    Tutti
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={`flex-1 text-xs gap-1.5 ${presentCount === 0 ? 'border-red-500/50 text-red-700 dark:text-red-400' : ''}`}
                    onClick={setAllAbsent}
                >
                    <UserX className="h-3.5 w-3.5" />
                    Nessuno
                </Button>
            </div>

            {/* Messaggio validazione */}
            {presentCount < 2 && (
                <p className="text-sm text-red-500 text-center font-medium">
                    Servono almeno 2 partecipanti per continuare
                </p>
            )}

            {/* Chip toggle giocatori */}
            <div className="flex flex-wrap gap-2">
                {playersList.map((player) => {
                    const isPresent = presentPlayers[player.id];
                    return (
                        <button
                            key={player.id}
                            type="button"
                            onClick={() => setPresentPlayers({ ...presentPlayers, [player.id]: !isPresent })}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${isPresent
                                ? 'bg-green-500/15 border-green-500/40 text-green-700 dark:text-green-400'
                                : 'bg-muted/40 border-transparent text-muted-foreground line-through opacity-50'
                                }`}
                        >
                            {player.name}
                        </button>
                    );
                })}
            </div>

            {/* Counter */}
            <div className="text-center">
                <Badge variant="secondary" className="text-xs px-2.5 py-0.5">
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
                        Di solito votano tutti. <br />
                        Seleziona chi preferisce non votare (opzionale).
                    </p>
                </div>

                {/* Quick actions */}
                <div className="flex gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={`flex-1 text-xs gap-1.5 ${abstainedCount === 0 ? 'border-green-500/50 text-green-700 dark:text-green-400' : ''}`}
                        onClick={resetAbstentions}
                    >
                        <UserCheck className="h-3.5 w-3.5" />
                        Tutti votano
                    </Button>
                    {/* <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={`flex-1 text-xs gap-1.5 ${abstainedCount === presentPlayersList.length ? 'border-orange-500/50 text-orange-700 dark:text-orange-400' : ''}`}
                        onClick={() => setAbstainedPlayers(Object.fromEntries(presentPlayersList.map(p => [p.id, true])))}
                    >
                        <UserMinus className="h-3.5 w-3.5" />
                        Nessuno vota
                    </Button> */}
                </div>

                {/* Chip toggle astensioni */}
                <div className="flex flex-wrap gap-2">
                    {presentPlayersList.map((player) => {
                        const isAbstained = abstainedPlayers[player.id];
                        return (
                            <button
                                key={player.id}
                                type="button"
                                onClick={() => setAbstainedPlayers({ ...abstainedPlayers, [player.id]: !isAbstained })}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${isAbstained
                                    ? 'bg-orange-500/15 border-orange-500/40 text-orange-700 dark:text-orange-400'
                                    : 'bg-green-500/15 border-green-500/40 text-green-700 dark:text-green-400'
                                    }`}
                            >
                                {player.name}
                            </button>
                        );
                    })}
                </div>

                {/* Counter */}
                <div className="text-center">
                    <Badge variant="secondary" className="text-xs px-2.5 py-0.5">
                        {abstainedCount === 0
                            ? `Tutti i ${presentPlayersList.length} partecipanti voteranno`
                            : `${abstainedCount} astenuti · ${presentPlayersList.length - abstainedCount} voteranno`
                        }
                    </Badge>
                </div>
            </div>
        );
    };

    // ─── STEPPER INDICATOR ─────────────────────────────────────
    const renderStepper = () => (
        <div className="flex items-center justify-center gap-1.5 mb-3">
            {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center gap-1.5">
                    <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${s === step
                            ? 'bg-primary text-primary-foreground'
                            : s < step
                                ? 'bg-green-500 text-white'
                                : 'bg-muted text-muted-foreground'
                            }`}
                    >
                        {s < step ? <Check className="w-3.5 h-3.5" /> : s}
                    </div>
                    {s < 3 && <div className={`w-4 h-px ${s < step ? 'bg-green-500' : 'bg-muted'}`} />}
                </div>
            ))}
        </div>
    );

    // ─── FOOTER STICKY ─────────────────────────────────────────
    const renderFooter = () => {
        const canContinue = step === 1 ? canContinueStep1 : step === 2 ? canContinueStep2 : true;

        return (
            <div className="fixed bottom-16 left-0 right-0 bg-background/95 backdrop-blur-sm border-t p-4 z-[60] lg:bottom-0">
                {/* Riepilogo numerico */}
                {/* <div className="flex justify-center gap-4 mb-3 text-xs">
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
                </div> */}

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
    const canContinueStep = step === 1 ? canContinueStep1 : step === 2 ? canContinueStep2 : true;

    return (
        <div className="min-h-screen pb-24">
            <div className="pt-2 px-4 pb-4 max-w-lg mx-auto">
                {renderStepper()}

                <Card>
                    <CardContent className="p-4 space-y-4">
                        {step === 1 && renderStep1()}
                        {step === 2 && renderStep2()}
                        {step === 3 && renderStep3()}

                        {/* Navigation buttons — dentro la card */}
                        <div className="flex gap-3 pt-2">
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
                                    disabled={!canContinueStep}
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
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default CreateMatch;
