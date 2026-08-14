/**
 * EditTeamMemberModal — Pannello di modifica per un singolo membro del team.
 *
 * Scope attuale (v1):
 *  - Per i GUEST: toggle del flag `canPromoteToPlayer`. Quando è OFF (default),
 *    il guest non vede mai le CTA "Registrati" e i flussi backend di
 *    auto-promozione (/auth/promote-guest-by-invite-token, /auth/promote-guest-by-id)
 *    rispondono 403. Quando è ON, il guest può completare la registrazione
 *    e diventare utente registrato (role: player). L'operazione di
 *    registrazione è IRREVERSIBILE.
 *  - Per i PLAYER registrati: nessuna opzione disponibile al momento.
 *
 * UX: il toggle modifica solo lo stato locale; la chiamata API parte solo
 * alla pressione esplicita del bottone "Salva" (giallo accent), per evitare
 * salvataggi accidentali. Il bottone è disabilitato finché non c'è una
 * modifica reale rispetto allo stato attuale del backend.
 *
 * Permessi: visibile solo a team-admin / admin globale (gating in pagina Team).
 */

import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Lock, Unlock, Info, ShieldCheck, AlertTriangle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AppDispatch } from '@/redux/store/store';
import { setGuestPromotionAllowed, removeMemberAvatar } from '@/redux/slices/teamSlice';
import { RoleBadge, type MemberRole } from './RoleBadge';

export interface EditableMember {
    id: string;
    name: string;
    email?: string;
    avatarUrl?: string;
    isGuest?: boolean;
    canPromoteToPlayer?: boolean;
    /** Ruolo già risolto dal chiamante (admin | guest | player) */
    role: MemberRole;
}

interface EditTeamMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    teamId: string;
    member: EditableMember | null;
}

export default function EditTeamMemberModal({
    isOpen,
    onClose,
    teamId,
    member,
}: EditTeamMemberModalProps) {
    const dispatch = useDispatch<AppDispatch>();
    const { toast } = useToast();

    // Snapshot del valore "attuale" lato server (al momento dell'apertura).
    // Il bottone Salva si abilita solo quando `allowed` differisce da questo.
    const [baseline, setBaseline] = useState<boolean>(false);
    const [allowed, setAllowed] = useState<boolean>(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isRemovingAvatar, setIsRemovingAvatar] = useState(false);

    useEffect(() => {
        if (isOpen && member) {
            const current = !!member.canPromoteToPlayer;
            setBaseline(current);
            setAllowed(current);
            setIsSaving(false);
        }
    }, [isOpen, member]);

    if (!member) return null;

    const initials =
        member.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || '?';

    const isDirty = allowed !== baseline;

    const handleRemoveAvatar = async () => {
        if (!confirm(`Rimuovere la foto di ${member.name}?`)) return;
        setIsRemovingAvatar(true);
        try {
            const result = await dispatch(removeMemberAvatar({ teamId, userId: member.id }));
            if (removeMemberAvatar.rejected.match(result)) {
                throw new Error((result.payload as string) || 'Errore rimozione foto');
            }
            toast({
                title: 'Foto rimossa',
                description: `La foto di ${member.name} è stata rimossa.`,
            });
            onClose();
        } catch (e: any) {
            toast({
                title: 'Operazione non riuscita',
                description: e?.message || 'Riprova più tardi.',
                variant: 'destructive',
            });
        } finally {
            setIsRemovingAvatar(false);
        }
    };

    const handleSave = async () => {
        if (!member.isGuest || !isDirty) return;
        setIsSaving(true);
        try {
            const result = await dispatch(
                setGuestPromotionAllowed({
                    teamId,
                    guestId: member.id,
                    allowed,
                })
            );
            if (setGuestPromotionAllowed.rejected.match(result)) {
                throw new Error((result.payload as string) || 'Errore aggiornamento');
            }
            toast({
                title: allowed ? 'Registrazione abilitata' : 'Registrazione bloccata',
                description: allowed
                    ? `${member.name} potrà ora completare la registrazione e diventare un giocatore ufficiale.`
                    : `${member.name} non vedrà più le opzioni per registrarsi.`,
            });
            onClose();
        } catch (e: any) {
            toast({
                title: 'Operazione non riuscita',
                description: e?.message || 'Riprova più tardi.',
                variant: 'destructive',
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && !isSaving && onClose()}>
            <DialogContent
                className="w-[calc(100%-2rem)] max-w-sm rounded-xl p-0 gap-0 max-h-[90vh] overflow-y-auto"
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                <DialogHeader className="px-4 pt-4 pb-2">
                    <DialogTitle className="flex items-center gap-2 text-base">
                        <ShieldCheck className="w-4 h-4 text-primary" />
                        Modifica membro
                    </DialogTitle>
                </DialogHeader>

                <div className="px-4 pb-3 space-y-3">
                    {/* Header membro compatto */}
                    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/40 border border-border/50">
                        <Avatar className="w-9 h-9">
                            <AvatarImage src={member.avatarUrl} alt={member.name} />
                            <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                            <div className="font-semibold text-sm text-foreground flex items-center gap-2 flex-wrap">
                                <span className="truncate">{member.name}</span>
                                <RoleBadge role={member.role} />
                            </div>
                            {member.email && (
                                <div className="text-[11px] text-muted-foreground truncate">{member.email}</div>
                            )}
                        </div>
                        {member.avatarUrl && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-[11px] text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                                onClick={handleRemoveAvatar}
                                disabled={isRemovingAvatar}
                            >
                                {isRemovingAvatar ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                    <><Trash2 className="w-3 h-3 mr-1" /> Rimuovi foto</>
                                )}
                            </Button>
                        )}
                    </div>

                    {/* Sezione opzioni */}
                    {member.isGuest ? (
                        <>
                            <div className="rounded-lg border border-border/60 p-3 space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2 min-w-0">
                                        {allowed ? (
                                            <Unlock className="w-4 h-4 text-emerald-500 shrink-0" />
                                        ) : (
                                            <Lock className="w-4 h-4 text-amber-500 shrink-0" />
                                        )}
                                        <div className="min-w-0">
                                            <div className="font-medium text-sm text-foreground">
                                                Consenti registrazione
                                            </div>
                                            <p className="text-[11px] text-muted-foreground">
                                                {allowed ? (
                                                    <span className="text-emerald-600 font-medium">Abilitato</span>
                                                ) : (
                                                    <span className="text-amber-600 font-medium">Bloccato</span>
                                                )}
                                                {isDirty && (
                                                    <span className="text-muted-foreground"> · non ancora salvato</span>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={allowed}
                                        onCheckedChange={setAllowed}
                                        disabled={isSaving}
                                        aria-label="Consenti registrazione guest"
                                    />
                                </div>

                                <div className="text-[11px] text-muted-foreground leading-relaxed border-t border-border/40 pt-2 space-y-1.5">
                                    <p className="flex items-start gap-1.5">
                                        <Info className="w-3 h-3 mt-0.5 shrink-0" />
                                        <span>
                                            Quando è <strong>bloccato</strong>: il guest non vede
                                            le CTA "Registrati" e il server rifiuta ogni tentativo
                                            di registrazione.
                                        </span>
                                    </p>
                                    <p className="flex items-start gap-1.5">
                                        <Info className="w-3 h-3 mt-0.5 shrink-0" />
                                        <span>
                                            Quando è <strong>abilitato</strong>: il guest può
                                            impostare email/password e diventare un giocatore
                                            ufficiale del team, mantenendo lo storico voti.
                                        </span>
                                    </p>
                                </div>
                            </div>

                            {isDirty && allowed && (
                                <div className="flex items-start gap-2 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-md p-2">
                                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                    <span>
                                        Operazione <strong>irreversibile</strong> una volta che il
                                        guest si sarà registrato. Puoi revocare l'autorizzazione
                                        finché non lo fa.
                                    </span>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex items-start gap-2 text-[12px] text-muted-foreground bg-secondary/30 border border-border/50 rounded-md p-3">
                            <Info className="w-4 h-4 mt-0.5 shrink-0" />
                            <span>
                                Per i giocatori già registrati al momento non ci sono impostazioni
                                modificabili. Nuove opzioni arriveranno nelle prossime versioni.
                            </span>
                        </div>
                    )}
                </div>

                <DialogFooter className="px-4 py-3 flex-row gap-2 border-t">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1 h-9 text-sm"
                        onClick={onClose}
                        disabled={isSaving}
                    >
                        Annulla
                    </Button>
                    {member.isGuest && (
                        <Button
                            type="button"
                            size="sm"
                            disabled={!isDirty || isSaving}
                            onClick={handleSave}
                            className="flex-1 h-9 text-sm bg-accent text-accent-foreground hover:bg-accent/90"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                    Salvataggio...
                                </>
                            ) : (
                                'Salva'
                            )}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
