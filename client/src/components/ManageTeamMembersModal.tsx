/**
 * ManageTeamMembersModal — Gestione amministrativa dei membri del team.
 *
 * Scope attuale (v1):
 *  - Lista dei guest associati al team con toggle del flag `canPromoteToPlayer`,
 *    che abilita/disabilita la possibilità per il guest di auto-promuoversi a
 *    utente registrato (role: player) tramite i flussi /auth/promote-guest-by-invite-token
 *    e /auth/promote-guest-by-id. Default lato BE: false.
 *
 * Roadmap:
 *  - eliminazione utente (registrato o guest) dall'app.
 *
 * Permessi: aperto solo a team-admin del team o admin globale (gating in pagina).
 */

import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { UserCog, Search, Loader2, Info, Lock, Unlock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AppDispatch, RootState } from '@/redux/store/store';
import {
    fetchTeamGuests,
    setGuestPromotionAllowed,
    TeamGuest,
} from '@/redux/slices/teamSlice';

interface ManageTeamMembersModalProps {
    isOpen: boolean;
    onClose: () => void;
    teamId: string;
}

export default function ManageTeamMembersModal({
    isOpen,
    onClose,
    teamId,
}: ManageTeamMembersModalProps) {
    const dispatch = useDispatch<AppDispatch>();
    const { toast } = useToast();

    const [guests, setGuests] = useState<TeamGuest[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState('');
    // ID dei guest sui quali è in corso un toggle (per disabilitare lo switch)
    const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

    // Carica i guest del team all'apertura
    useEffect(() => {
        if (!isOpen || !teamId) return;
        let cancelled = false;
        setIsLoading(true);
        dispatch(fetchTeamGuests(teamId))
            .unwrap()
            .then((data) => {
                if (!cancelled) setGuests(data);
            })
            .catch((err) => {
                if (!cancelled) {
                    toast({
                        title: 'Errore',
                        description: typeof err === 'string' ? err : 'Impossibile caricare i guest del team',
                        variant: 'destructive',
                    });
                }
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [isOpen, teamId, dispatch, toast]);

    // Reset stato locale alla chiusura
    useEffect(() => {
        if (!isOpen) {
            setSearch('');
            setPendingIds(new Set());
        }
    }, [isOpen]);

    const filteredGuests = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return guests;
        return guests.filter((g) => g.name?.toLowerCase().includes(q));
    }, [guests, search]);

    const handleToggle = async (guest: TeamGuest, allowed: boolean) => {
        if (pendingIds.has(guest.id)) return;

        // Optimistic update locale
        setPendingIds((prev) => new Set(prev).add(guest.id));
        setGuests((prev) =>
            prev.map((g) => (g.id === guest.id ? { ...g, canPromoteToPlayer: allowed } : g))
        );

        try {
            await dispatch(setGuestPromotionAllowed({ teamId, guestId: guest.id, allowed })).unwrap();
            toast({
                title: allowed ? 'Registrazione abilitata' : 'Registrazione disabilitata',
                description: allowed
                    ? `${guest.name} potrà ora registrarsi come utente del team.`
                    : `${guest.name} non vedrà più l'opzione di registrazione.`,
            });
        } catch (err) {
            // Rollback in caso di errore
            setGuests((prev) =>
                prev.map((g) => (g.id === guest.id ? { ...g, canPromoteToPlayer: !allowed } : g))
            );
            toast({
                title: 'Errore',
                description: typeof err === 'string' ? err : 'Impossibile aggiornare il permesso',
                variant: 'destructive',
            });
        } finally {
            setPendingIds((prev) => {
                const next = new Set(prev);
                next.delete(guest.id);
                return next;
            });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserCog className="w-5 h-5 text-primary" />
                        Gestisci membri del team
                    </DialogTitle>
                </DialogHeader>

                <Alert className="bg-muted/50 border-border/50">
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                        Per ogni ospite, decidi se può <strong>registrarsi</strong> come utente effettivo
                        del team. Quando disabilitato, il guest non vedrà mai l'opzione di registrazione,
                        né nella sua pagina di accesso né dentro l'app.
                    </AlertDescription>
                </Alert>

                {/* Ricerca */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Cerca ospite per nome..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>

                {/* Lista guest */}
                <div className="space-y-2 min-h-[120px]">
                    <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        <span>Ospiti del team</span>
                        <span>{filteredGuests.length}</span>
                    </div>

                    {isLoading && (
                        <div className="flex items-center justify-center py-8 text-muted-foreground text-sm gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" /> Caricamento ospiti...
                        </div>
                    )}

                    {!isLoading && filteredGuests.length === 0 && (
                        <div className="py-8 text-center text-sm text-muted-foreground">
                            {guests.length === 0
                                ? 'Nessun ospite presente nel team.'
                                : 'Nessun ospite corrisponde alla ricerca.'}
                        </div>
                    )}

                    {!isLoading &&
                        filteredGuests.map((g) => {
                            const isPending = pendingIds.has(g.id);
                            const allowed = g.canPromoteToPlayer;
                            return (
                                <div
                                    key={g.id}
                                    className="flex items-center justify-between gap-3 p-3 bg-secondary/40 rounded-lg border border-border/50"
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-semibold text-foreground truncate">
                                                {g.name}
                                            </span>
                                            <Badge variant="outline" className="text-[10px] uppercase">
                                                Ospite
                                            </Badge>
                                            {g.position && (
                                                <Badge variant="secondary" className="text-[10px]">
                                                    {g.position}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                            {allowed ? (
                                                <>
                                                    <Unlock className="w-3 h-3 text-green-600 dark:text-green-400" />
                                                    <span>Può registrarsi come utente del team</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Lock className="w-3 h-3 text-orange-600 dark:text-orange-400" />
                                                    <span>Resta solo come ospite (no registrazione)</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <Switch
                                        checked={allowed}
                                        disabled={isPending}
                                        onCheckedChange={(v) => handleToggle(g, v)}
                                        aria-label={`Consenti registrazione a ${g.name}`}
                                    />
                                </div>
                            );
                        })}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
                        Chiudi
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
