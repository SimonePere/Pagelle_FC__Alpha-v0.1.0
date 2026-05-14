/**
 * ManagePlayersModal — Gestione roster di un match già creato.
 *
 * Permette ad admin globali e admin del team di:
 *  - rimuovere giocatori dal roster (NON cancella l'utente)
 *  - aggiungere membri del Team che non sono ancora nel roster
 *  - creare nuovi guest player (vengono aggiunti anche al Team)
 *
 * Vincolo backend (riflesso in UI): roster modificabile solo se
 * match.status ∈ {draft, active} AND nessuna VoteSubmission attiva.
 */

import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Lock, UserPlus, UserMinus, UserPlus2, Search, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AppDispatch, RootState } from '@/redux/store/store';
import {
    addRegisteredPlayerToMatch,
    addGuestPlayerToMatch,
    removePlayerFromMatch,
    fetchRosterEditable,
    refreshCurrentMatchSilent
} from '@/redux/slices/matchSlice';
import { fetchTeamById } from '@/redux/slices/teamSlice';

interface RosterMember {
    _id?: string;
    id?: string;
    name?: string;
    email?: string;
    isGuest?: boolean;
    profile?: { position?: string };
}

interface ManagePlayersModalProps {
    isOpen: boolean;
    onClose: () => void;
    matchId: string;
    teamId: string;
    /** Roster attuale del match (popolato, da currentMatch.teamMembers) */
    rosterMembers: RosterMember[];
}

const idOf = (m: RosterMember) => String(m._id || m.id || '');

export default function ManagePlayersModal({
    isOpen,
    onClose,
    matchId,
    teamId,
    rosterMembers
}: ManagePlayersModalProps) {
    const dispatch = useDispatch<AppDispatch>();
    const { toast } = useToast();

    const { currentTeam } = useSelector((state: RootState) => state.teams);
    const { rosterEditable, isRosterMutating, currentMatch: authoritativeMatch } = useSelector(
        (state: RootState) => state.matches
    );

    // 🛡️ SINGLE SOURCE OF TRUTH per il roster:
    //    leggiamo da `state.matches.currentMatch` (aggiornato in modo autoritativo
    //    da refreshCurrentMatchSilent + optimistic updates), con fallback al prop
    //    `rosterMembers` per il primo render. Così evitiamo race con il polling
    //    `fetchTeamMatches` che riscrive solo l'array `state.matches.matches`.
    const liveRoster: RosterMember[] = useMemo(() => {
        const fromStore =
            (authoritativeMatch as any)?.id === matchId
                ? ((authoritativeMatch as any)?.teamMembers as RosterMember[] | undefined)
                : undefined;
        return fromStore && fromStore.length > 0 ? fromStore : rosterMembers;
    }, [authoritativeMatch, matchId, rosterMembers]);

    // 🔒 Vincolo minimo: una partita deve avere almeno 2 giocatori
    const MIN_PLAYERS = 2;
    const atMinimum = liveRoster.length <= MIN_PLAYERS;

    const [search, setSearch] = useState('');
    const [guestName, setGuestName] = useState('');
    const [guestPosition, setGuestPosition] = useState<'POR' | 'DIF' | 'CEN' | 'ATT' | ''>('');
    const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
    const [confirmAddId, setConfirmAddId] = useState<string | null>(null);

    // Carica stato editabilità + team (per la lista candidati).
    // ⚠️ Niente `currentTeam` né `rosterEditable` nelle deps: cambierebbero
    //    ad ogni fulfilled e rilancerebbero l'effect → loop infinito.
    useEffect(() => {
        if (!isOpen || !matchId) return;
        dispatch(fetchRosterEditable(matchId));
        if (teamId) {
            const sameTeam = (currentTeam as any)?._id === teamId;
            if (!sameTeam) dispatch(fetchTeamById(teamId));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, matchId, teamId, dispatch]);

    // Reset stato locale all'apertura
    useEffect(() => {
        if (!isOpen) {
            setSearch('');
            setGuestName('');
            setGuestPosition('');
            setConfirmRemoveId(null);
            setConfirmAddId(null);
        }
    }, [isOpen]);

    const editable = rosterEditable?.editable !== false; // default true finché non sappiamo
    const lockReason = rosterEditable?.reason || null;

    // ID già presenti nel roster
    const rosterIds = useMemo(
        () => new Set(liveRoster.map(idOf)),
        [liveRoster]
    );

    // Candidati = membri del team NON ancora nel roster, filtrati per ricerca
    const candidates = useMemo(() => {
        const members = ((currentTeam as any)?.memberIds || []) as RosterMember[];
        const q = search.trim().toLowerCase();
        return members
            .filter((m) => !rosterIds.has(idOf(m)))
            .filter((m) => {
                if (!q) return true;
                return (
                    (m.name || '').toLowerCase().includes(q) ||
                    (m.email || '').toLowerCase().includes(q)
                );
            });
    }, [currentTeam, rosterIds, search]);

    const handleAddRegistered = async (userId: string) => {
        // Recupera l'oggetto utente popolato per l'update ottimistico immediato.
        // ⚠️ Deep clone obbligatorio: senza, Immer/RTK condividerebbe la reference
        //    con `state.teams.currentTeam.memberIds` e potrebbe sporcarla,
        //    rendendo i candidati incoerenti dopo cicli add→remove ripetuti.
        const members = ((currentTeam as any)?.memberIds || []) as RosterMember[];
        const found = members.find((m) => idOf(m) === userId);
        const userObj = found ? JSON.parse(JSON.stringify(found)) : undefined;
        try {
            await dispatch(
                addRegisteredPlayerToMatch({ matchId, userId, userObj })
            ).unwrap();
            toast({ title: 'Giocatore aggiunto al roster' });
            setConfirmAddId(null);
            // Refetch team per garantire candidati sempre coerenti
            if (teamId) dispatch(fetchTeamById(teamId));
        } catch (err: any) {
            // Rollback: il backend non ha applicato la modifica, ripristina lo stato vero
            dispatch(refreshCurrentMatchSilent(matchId));
            toast({
                title: 'Errore',
                description: err || 'Impossibile aggiungere il giocatore',
                variant: 'destructive'
            });
        }
    };

    const handleAddGuest = async () => {
        const name = guestName.trim();
        if (!name) return;
        try {
            await dispatch(
                addGuestPlayerToMatch({
                    matchId,
                    name,
                    position: guestPosition || undefined
                })
            ).unwrap();
            toast({ title: `Guest "${name}" aggiunto al roster` });
            setGuestName('');
            setGuestPosition('');
            // Refetch team: il guest viene aggiunto anche a Team.memberIds lato server
            if (teamId) dispatch(fetchTeamById(teamId));
        } catch (err: any) {
            dispatch(refreshCurrentMatchSilent(matchId));
            toast({
                title: 'Errore',
                description: err || 'Impossibile creare il guest',
                variant: 'destructive'
            });
        }
    };

    const handleRemove = async (playerId: string) => {
        // 🔒 Guard difensivo: blocca la rimozione se siamo già al minimo
        if (atMinimum) {
            toast({
                title: 'Roster al minimo',
                description: `Una partita deve avere almeno ${MIN_PLAYERS} giocatori.`,
                variant: 'destructive'
            });
            setConfirmRemoveId(null);
            return;
        }
        try {
            await dispatch(removePlayerFromMatch({ matchId, playerId })).unwrap();
            toast({ title: 'Giocatore rimosso dal roster' });
            setConfirmRemoveId(null);
            // Refetch team per garantire candidati sempre coerenti
            if (teamId) dispatch(fetchTeamById(teamId));
        } catch (err: any) {
            // Rollback: ripristina lo stato vero dal backend
            dispatch(refreshCurrentMatchSilent(matchId));
            toast({
                title: 'Errore',
                description: err || 'Impossibile rimuovere il giocatore',
                variant: 'destructive'
            });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent
                className="w-[calc(100%-2rem)] max-w-md rounded-xl p-0 gap-0 max-h-[90vh] flex flex-col"
                // 📵 Evita che Radix sposti il focus sul primo input (campo Cerca)
                //    all'apertura: su mobile farebbe spuntare la tastiera.
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                <DialogHeader className="px-4 pt-4 pb-2 border-b">
                    <DialogTitle className="flex items-center gap-2 text-base">
                        <UserPlus className="w-4 h-4" />
                        Gestisci giocatori
                    </DialogTitle>
                </DialogHeader>

                <div className="overflow-y-auto px-4 py-3 space-y-4 flex-1">
                    {/* Banner di lock */}
                    {!editable && (
                        <Alert variant="destructive" className="py-2">
                            <Lock className="w-4 h-4" />
                            <AlertDescription className="text-xs">
                                {lockReason || 'Roster non modificabile'}
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* === Sezione 1: Roster attuale === */}
                    <section>
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-semibold">Roster attuale</h4>
                            <Badge variant="secondary" className="text-xs">
                                {liveRoster.length} giocatori
                            </Badge>
                        </div>
                        {atMinimum && editable && (
                            <p className="text-[11px] text-muted-foreground italic mb-1.5 px-0.5">
                                Minimo {MIN_PLAYERS} giocatori per partita: aggiungine altri prima di rimuovere.
                            </p>
                        )}
                        <ul className="space-y-1.5">
                            {liveRoster.map((m) => {
                                const id = idOf(m);
                                const isConfirming = confirmRemoveId === id;
                                return (
                                    <li
                                        key={id}
                                        className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-md bg-secondary/40 border border-border/40"
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="text-sm truncate">{m.name || 'Senza nome'}</span>
                                            {m.isGuest && (
                                                <Badge
                                                    variant="outline"
                                                    className="text-[10px] h-4 px-1 bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/40"
                                                >
                                                    Guest
                                                </Badge>
                                            )}
                                            {m.profile?.position && (
                                                <Badge variant="secondary" className="text-[10px] h-4 px-1">
                                                    {m.profile.position}
                                                </Badge>
                                            )}
                                        </div>
                                        {isConfirming ? (
                                            <div className="flex gap-1">
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    className="h-7 px-2 text-xs"
                                                    disabled={isRosterMutating}
                                                    onClick={() => handleRemove(id)}
                                                >
                                                    {isRosterMutating ? (
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                    ) : (
                                                        'Conferma'
                                                    )}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-7 px-2 text-xs"
                                                    onClick={() => setConfirmRemoveId(null)}
                                                >
                                                    Annulla
                                                </Button>
                                            </div>
                                        ) : (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 disabled:opacity-40"
                                                disabled={!editable || isRosterMutating || atMinimum}
                                                title={
                                                    atMinimum
                                                        ? `Minimo ${MIN_PLAYERS} giocatori per partita`
                                                        : 'Rimuovi giocatore'
                                                }
                                                onClick={() => {
                                                    setConfirmAddId(null);
                                                    setConfirmRemoveId(id);
                                                }}
                                                aria-label="Rimuovi giocatore"
                                            >
                                                <UserMinus className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </li>
                                );
                            })}
                            {liveRoster.length === 0 && (
                                <li className="text-xs text-muted-foreground italic px-2 py-1">
                                    Nessun giocatore nel roster.
                                </li>
                            )}
                        </ul>
                    </section>

                    {/* === Sezione 2: Aggiungi membri del team === */}
                    <section>
                        <h4 className="text-sm font-semibold mb-2">Aggiungi membri del team</h4>
                        <div className="relative mb-2">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <Input
                                placeholder="Cerca per nome o email…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="h-9 pl-8 text-sm"
                                disabled={!editable}
                            />
                        </div>
                        <ul className="space-y-1.5 max-h-44 overflow-y-auto">
                            {candidates.map((m) => {
                                const id = idOf(m);
                                const isConfirming = confirmAddId === id;
                                return (
                                    <li
                                        key={id}
                                        className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-md border border-border/40"
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="text-sm truncate">{m.name || 'Senza nome'}</span>
                                            {m.isGuest && (
                                                <Badge
                                                    variant="outline"
                                                    className="text-[10px] h-4 px-1 bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/40"
                                                >
                                                    Guest
                                                </Badge>
                                            )}
                                        </div>
                                        {isConfirming ? (
                                            <div className="flex gap-1">
                                                <Button
                                                    size="sm"
                                                    className="h-7 px-2 text-xs"
                                                    disabled={isRosterMutating}
                                                    onClick={() => handleAddRegistered(id)}
                                                >
                                                    {isRosterMutating ? (
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                    ) : (
                                                        'Conferma'
                                                    )}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-7 px-2 text-xs"
                                                    onClick={() => setConfirmAddId(null)}
                                                >
                                                    Annulla
                                                </Button>
                                            </div>
                                        ) : (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-7 px-2 text-xs"
                                                disabled={!editable || isRosterMutating}
                                                onClick={() => {
                                                    setConfirmRemoveId(null);
                                                    setConfirmAddId(id);
                                                }}
                                            >
                                                <UserPlus className="w-3 h-3 mr-1" />
                                                Aggiungi
                                            </Button>
                                        )}
                                    </li>
                                );
                            })}
                            {candidates.length === 0 && (
                                <li className="text-xs text-muted-foreground italic px-2 py-1">
                                    {search
                                        ? 'Nessun membro corrisponde alla ricerca.'
                                        : 'Tutti i membri del team sono già nel roster.'}
                                </li>
                            )}
                        </ul>
                    </section>

                    {/* === Sezione 3: Crea nuovo guest === */}
                    <section>
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                            <UserPlus2 className="w-3.5 h-3.5" />
                            Crea nuovo guest
                        </h4>
                        <div className="space-y-2">
                            <Input
                                placeholder="Nickname guest"
                                value={guestName}
                                onChange={(e) => setGuestName(e.target.value)}
                                className="h-9 text-sm"
                                disabled={!editable}
                                maxLength={50}
                            />
                            <div className="flex gap-2">
                                <Select
                                    value={guestPosition}
                                    onValueChange={(v) => setGuestPosition(v as any)}
                                    disabled={!editable}
                                >
                                    <SelectTrigger className="h-9 text-sm flex-1">
                                        <SelectValue placeholder="Ruolo (opz.)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="POR">Portiere</SelectItem>
                                        <SelectItem value="DIF">Difensore</SelectItem>
                                        <SelectItem value="CEN">Centrocampista</SelectItem>
                                        <SelectItem value="ATT">Attaccante</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button
                                    size="sm"
                                    className="h-9 text-sm"
                                    disabled={!editable || !guestName.trim() || isRosterMutating}
                                    onClick={handleAddGuest}
                                >
                                    {isRosterMutating ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <>
                                            <UserPlus className="w-3.5 h-3.5 mr-1" />
                                            Crea
                                        </>
                                    )}
                                </Button>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                                Il guest verrà aggiunto al team e diventerà riusabile nelle prossime partite.
                            </p>
                        </div>
                    </section>
                </div>

                <DialogFooter className="px-4 py-3 border-t">
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-9 text-sm"
                        onClick={onClose}
                    >
                        Chiudi
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
