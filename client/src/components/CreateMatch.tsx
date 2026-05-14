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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
    Calendar, MapPin, Users, ChevronRight, ChevronLeft, Check, UserMinus, Trophy, UserCheck, UserX, UserPlus, Copy, ExternalLink
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

    // Dialog aggiungi ospite
    const [guestDialogOpen, setGuestDialogOpen] = useState(false);
    const [guestName, setGuestName] = useState('');
    const [guestPosition, setGuestPosition] = useState<'POR' | 'DIF' | 'CEN' | 'ATT' | ''>('');

    // Modale invite link post-creazione
    const [inviteLinksOpen, setInviteLinksOpen] = useState(false);
    const [inviteLinks, setInviteLinks] = useState<Array<{ name: string; inviteToken: string; inviteUrl: string }>>([]);

    // Step 1 — Dati partita
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [field, setField] = useState('');
    const [playersCount, setPlayersCount] = useState<PlayersCount>(8);
    const [guestPlayers, setGuestPlayers] = useState<Array<{ name: string; position?: 'POR' | 'DIF' | 'CEN' | 'ATT' }>>([]);

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
    // Astensioni ospiti — chiave = indice nell'array guestPlayers (gli ospiti non hanno ancora un userId)
    const [abstainedGuests, setAbstainedGuests] = useState<Record<number, boolean>>({});

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
    // Conteggio reale votanti includendo ospiti (e astensioni ospiti)
    const abstainedGuestsCount = guestPlayers.reduce((acc, _, i) => acc + (abstainedGuests[i] ? 1 : 0), 0);
    const totalVoters = (presentCount + guestPlayers.length) - (abstainedCount + abstainedGuestsCount);

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
            // Esclude gli ospiti contrassegnati come "non voteranno":
            // non vengono creati lato server (quindi nessun invito generato).
            const votingGuestPlayers = guestPlayers.filter((_, i) => !abstainedGuests[i]);

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
                guestPlayers: votingGuestPlayers,
            };

            const result = await dispatch(createMatch(matchData));

            if (createMatch.fulfilled.match(result)) {
                const guests = result.payload.guestPlayers;
                if (guests && guests.length > 0) {
                    setInviteLinks(guests);
                    setInviteLinksOpen(true);
                    // la navigate avviene dopo che l'utente chiude il modale
                } else {
                    toast({
                        title: 'Partita creata',
                        description: 'Puoi invitare il gruppo a votare dopo la partita.',
                    });
                    navigate('/vote');
                }
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

    // ─── GESTIONE OSPITI ─────────────────────────────────────
    const handleAddGuest = () => {
        if (!guestName.trim()) return;
        setGuestPlayers(prev => [
            ...prev,
            { name: guestName.trim(), position: guestPosition || undefined }
        ]);
        setGuestName('');
        setGuestPosition('');
        setGuestDialogOpen(false);
    };

    const handleRemoveGuest = (index: number) => {
        setGuestPlayers(prev => prev.filter((_, i) => i !== index));
        // Rimuovi e re-indicizza le astensioni ospite
        setAbstainedGuests(prev => {
            const next: Record<number, boolean> = {};
            Object.entries(prev).forEach(([k, v]) => {
                const i = Number(k);
                if (i < index) next[i] = v;
                else if (i > index) next[i - 1] = v;
            });
            return next;
        });
    };

    const copyInviteLink = async (
        url: string,
        ev?: React.MouseEvent<HTMLButtonElement>
    ) => {
        // 1) Clipboard API moderna (richiede HTTPS / contesto sicuro)
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(url);
                toast({ title: 'Link copiato!', description: url });
                return;
            }
        } catch {
            // continua con il fallback
        }

        // 2) Fallback: textarea + execCommand.
        //    IMPORTANTE: il textarea va inserito DENTRO il dialog (dentro il focus trap di Radix),
        //    altrimenti focus()/select() falliscono silenziosamente e copy ritorna stringa vuota.
        try {
            const host =
                (ev?.currentTarget as HTMLElement | undefined) ||
                (document.activeElement as HTMLElement | null) ||
                document.body;
            const container = host.parentElement || document.body;

            const textarea = document.createElement('textarea');
            textarea.value = url;
            textarea.setAttribute('readonly', '');
            // Stili per evitare scroll/zoom su mobile, ma deve restare focusable
            textarea.style.position = 'absolute';
            textarea.style.left = '-9999px';
            textarea.style.top = '0';
            textarea.style.opacity = '0';
            textarea.style.pointerEvents = 'none';
            container.appendChild(textarea);

            // iOS richiede contentEditable + range per consentire selezione
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            if (isIOS) {
                textarea.contentEditable = 'true';
                const range = document.createRange();
                range.selectNodeContents(textarea);
                const selection = window.getSelection();
                selection?.removeAllRanges();
                selection?.addRange(range);
                textarea.setSelectionRange(0, url.length);
            } else {
                textarea.focus();
                textarea.select();
                textarea.setSelectionRange(0, url.length);
            }

            const ok = document.execCommand('copy');
            container.removeChild(textarea);

            if (ok) {
                toast({ title: 'Link copiato!', description: url });
                return;
            }
            throw new Error('execCommand copy returned false');
        } catch {
            // 3) Ultimo fallback: prompt per copia manuale
            toast({
                title: 'Copia non disponibile',
                description: 'Copia manualmente il link qui sotto.',
                variant: 'destructive',
            });
            try { window.prompt('Copia il link di invito:', url); } catch { /* ignore */ }
        }
    };

    // ─── STEP NAVIGATION GUARDS ──────────────────────────────
    const canContinueStep1 = true; // campo opzionale
    const canContinueStep2 = presentCount >= 2;
    // Step 3: validato dinamicamente nel render perché dipende anche dagli ospiti astenuti.

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

            {/* Chip toggle giocatori regolari */}
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

                {/* Chip ospiti — sempre selezionati, non de-selezionabili */}
                {guestPlayers.map((guest, i) => (
                    <div key={`guest-${i}`} className="flex items-center gap-1">
                        <span className="px-3 py-1.5 rounded-full text-sm font-medium border bg-violet-500/15 border-violet-500/40 text-violet-700 dark:text-violet-300">
                            {guest.name}
                        </span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border-violet-400/50 text-violet-600 dark:text-violet-300">Ospite</Badge>
                        <button
                            type="button"
                            onClick={() => handleRemoveGuest(i)}
                            className="text-muted-foreground hover:text-destructive text-xs ml-0.5"
                            aria-label="Rimuovi ospite"
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>

            {/* Bottone aggiungi ospite */}
            <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full text-xs gap-1.5 border-dashed"
                onClick={() => setGuestDialogOpen(true)}
            >
                <UserPlus className="h-3.5 w-3.5" />
                Aggiungi giocatore ospite
            </Button>

            {/* Counter */}
            <div className="text-center">
                <Badge variant="secondary" className="text-xs px-2.5 py-0.5">
                    {presentCount + guestPlayers.length} su {playersList.length + guestPlayers.length} convocati
                </Badge>
            </div>
        </div>
    );

    // ─── STEP 3: ASTENSIONI ────────────────────────────────────
    const renderStep3 = () => {
        const presentPlayersList = playersList.filter(p => presentPlayers[p.id]);
        const totalAbstainedCount = abstainedCount + abstainedGuestsCount;
        const totalParticipants = presentPlayersList.length + guestPlayers.length;
        const votersCountStep3 = totalParticipants - totalAbstainedCount;
        const tooFewVoters = votersCountStep3 < 2;

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
                        className={`flex-1 text-xs gap-1.5 ${totalAbstainedCount === 0 ? 'border-green-500/50 text-green-700 dark:text-green-400' : ''}`}
                        onClick={() => { resetAbstentions(); setAbstainedGuests({}); }}
                    >
                        <UserCheck className="h-3.5 w-3.5" />
                        Tutti votano
                    </Button>
                </div>

                {/* Chip toggle astensioni — membri team */}
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
                    {/* Chip toggle astensioni — ospiti */}
                    {guestPlayers.map((guest, i) => {
                        const isAbstained = !!abstainedGuests[i];
                        return (
                            <button
                                key={`guest-${i}`}
                                type="button"
                                onClick={() => setAbstainedGuests({ ...abstainedGuests, [i]: !isAbstained })}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${isAbstained
                                    ? 'bg-orange-500/15 border-orange-500/40 text-orange-700 dark:text-orange-400'
                                    : 'bg-violet-500/15 border-violet-500/40 text-violet-700 dark:text-violet-300'
                                    }`}
                                title="Ospite"
                            >
                                {guest.name} <span className="opacity-70 text-[10px]">ospite</span>
                            </button>
                        );
                    })}
                </div>

                {/* Counter */}
                <div className="text-center">
                    <Badge variant="secondary" className="text-xs px-2.5 py-0.5">
                        {totalAbstainedCount === 0
                            ? `Tutti i ${totalParticipants} partecipanti voteranno`
                            : `${totalAbstainedCount} astenuti · ${totalParticipants - totalAbstainedCount} voteranno`
                        }
                    </Badge>
                </div>

                {/* Messaggio validazione minimo votanti */}
                {tooFewVoters && (
                    <p className="text-sm text-red-500 text-center font-medium">
                        Servono almeno 2 votanti per creare la partita
                    </p>
                )}
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
                            disabled={presentCount < 2 || totalVoters < 2 || creatingMatch}
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
                                    disabled={presentCount < 2 || totalVoters < 2 || creatingMatch}
                                >
                                    <Trophy className="w-4 h-4 mr-2" />
                                    {creatingMatch ? 'Creando...' : 'Crea Partita'}
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Dialog — Aggiungi ospite */}
            <Dialog open={guestDialogOpen} onOpenChange={setGuestDialogOpen}>
                <DialogContent
                    className="w-[calc(100%-2rem)] max-w-xs rounded-xl p-0 gap-0"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                >
                    <DialogHeader className="px-4 pt-4 pb-2">
                        <DialogTitle className="text-base">Aggiungi giocatore ospite</DialogTitle>
                    </DialogHeader>
                    <div className="px-4 pb-2 space-y-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="guest-name" className="text-sm">Nome *</Label>
                            <Input
                                id="guest-name"
                                value={guestName}
                                onChange={(e) => setGuestName(e.target.value)}
                                placeholder="Es. Marco"
                                className="h-10 text-sm"
                                onKeyDown={(e) => e.key === 'Enter' && handleAddGuest()}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-sm">Posizione (opzionale)</Label>
                            <Select value={guestPosition} onValueChange={(v) => setGuestPosition(v as any)}>
                                <SelectTrigger className="h-10 text-sm">
                                    <SelectValue placeholder="Seleziona posizione" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="POR">Portiere</SelectItem>
                                    <SelectItem value="DIF">Difensore</SelectItem>
                                    <SelectItem value="CEN">Centrocampista</SelectItem>
                                    <SelectItem value="ATT">Attaccante</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter className="px-4 py-3 flex-row gap-2 border-t">
                        <Button variant="outline" size="sm" className="flex-1 h-9 text-sm" onClick={() => setGuestDialogOpen(false)}>Annulla</Button>
                        <Button size="sm" className="flex-1 h-9 text-sm" onClick={handleAddGuest} disabled={!guestName.trim()}>Aggiungi</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog — Invite links */}
            <Dialog open={inviteLinksOpen} onOpenChange={(open) => { if (!open) navigate('/vote'); setInviteLinksOpen(open); }}
            >
                <DialogContent
                    className=" rounded-xl p-0 gap-0"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                >
                    <DialogHeader className="px-4 pt-4 pb-2">
                        <DialogTitle className="text-base">Partita creata! 🎉</DialogTitle>
                    </DialogHeader>
                    <div className="px-4 pb-2 space-y-2">
                        <p className="text-sm text-muted-foreground">Condividi questi link con i giocatori ospiti:</p>
                        {inviteLinks.map((guest, i) => {
                            // Costruisci link assoluto come in MatchDetailsCard
                            const fullUrl = guest.inviteToken
                                ? `${window.location.origin}/join?token=${guest.inviteToken}`
                                : (guest.inviteUrl?.startsWith('http')
                                    ? guest.inviteUrl
                                    : `${window.location.origin}${guest.inviteUrl}`);
                            return (
                                <div key={i} className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30 min-w-0 overflow-hidden w-full">
                                    <div className="flex-1 min-w-0 overflow-hidden">
                                        <p className="text-sm font-medium truncate">{guest.name}</p>
                                        <p className="text-xs text-muted-foreground truncate block max-w-full">{fullUrl}</p>
                                    </div>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 shrink-0"
                                        onClick={(e) => copyInviteLink(fullUrl, e)}
                                        title="Copia link"
                                    >
                                        <Copy className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
                    <DialogFooter className="px-4 py-3 border-t">
                        <Button size="sm" className="w-full h-9 text-sm" onClick={() => { setInviteLinksOpen(false); navigate('/vote'); }}>
                            Vai alle Votazioni
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default CreateMatch;
