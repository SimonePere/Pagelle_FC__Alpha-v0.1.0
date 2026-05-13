import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useToast } from '@/hooks/use-toast';
import { User, Lock, Calendar, Trophy, Check, X, Users, ShieldAlert } from 'lucide-react';

interface EditModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'user-profile' | 'user-password' | 'match';
    data?: any;
    onSave: (data: any) => Promise<{ success: boolean; error?: string } | void>;
    onReactivateUser?: (userId: string) => Promise<void>; // 🆕 Handler riattivazione
    // 🔒 Handler force-close votazione (admin only). Mostrato solo se passato
    //    e canForceCloseSession=true (sessione 'active').
    onForceCloseSession?: () => Promise<void>;
    canForceCloseSession?: boolean;
}

// 🗓️ Normalizza una data del backend nel formato YYYY-MM-DD usato dall'<input type="date">.
//    Funzione condivisa tra valore iniziale del form e snapshot per isDirty,
//    così non ci sono falsi positivi da formati diversi.
function normalizeMatchDate(rawDate: any): string {
    if (!rawDate) return '';
    try {
        // Già in formato YYYY-MM-DD
        if (typeof rawDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
            return rawDate;
        }
        // DD/MM/YYYY
        if (typeof rawDate === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(rawDate)) {
            const [day, month, year] = rawDate.split('/');
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        // Backend talvolta tronca "GMT" in "GM" → fix prima del parse
        if (typeof rawDate === 'string' && rawDate.includes('GM') && !rawDate.includes('GMT')) {
            const fixed = rawDate + 'T';
            const d = new Date(fixed);
            if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
        }
        // Parsing standard
        const d = new Date(rawDate);
        if (isNaN(d.getTime())) return '';
        return d.toISOString().split('T')[0];
    } catch {
        return '';
    }
}

const EditModal = ({ isOpen, onClose, type, data, onSave, onReactivateUser, onForceCloseSession, canForceCloseSession }: EditModalProps) => {
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    // 🔒 Stato per la conferma inline del force-close (no Dialog annidato per
    //    evitare flicker da unmount del parent durante refresh dati).
    const [forceCloseConfirm, setForceCloseConfirm] = useState(false);
    const [forceClosing, setForceClosing] = useState(false);

    // Form states - TODO: diversi per type
    const [formData, setFormData] = useState({});

    // Stati form specifici per tipo
    const [profileForm, setProfileForm] = useState({
        name: data?.name || '',
        email: data?.email || '',
        birthdate: data?.birthdate || ''
    });

    const [passwordForm, setPasswordForm] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [matchForm, setMatchForm] = useState({
        field: data?.field || '',
        date: normalizeMatchDate(data?.date),
        playersCount: data?.playersCount || 8,
        notes: data?.notes || ''
    });

    // 📸 Snapshot dei valori iniziali (catturato al primo render).
    //    Usato per calcolare se il form è "dirty" (cioè modificato dall'utente).
    //    Se nulla cambia rispetto a questo snapshot, il bottone Salva resta disabilitato.
    const [initialProfile] = useState({
        name: data?.name || '',
        email: data?.email || '',
        birthdate: data?.birthdate || ''
    });
    const [initialMatch] = useState(() => ({
        field: data?.field || '',
        date: normalizeMatchDate(data?.date),
        playersCount: data?.playersCount || 8,
        notes: data?.notes || ''
    }));

    // ✍️ Restituisce true se almeno un campo è stato modificato rispetto allo
    //    stato iniziale. Per password è sempre considerato dirty (la validazione
    //    completa la fa isPasswordFormValid).
    const isDirty = () => {
        if (type === 'user-profile') {
            return (
                profileForm.name !== initialProfile.name ||
                profileForm.email !== initialProfile.email ||
                profileForm.birthdate !== initialProfile.birthdate
            );
        }
        if (type === 'match') {
            // Tutti i confronti usano la STESSA normalizzazione (vedi initialMatch),
            //    quindi non ci sono falsi positivi da formati data diversi.
            return (
                matchForm.field !== initialMatch.field ||
                matchForm.date !== initialMatch.date ||
                Number(matchForm.playersCount) !== Number(initialMatch.playersCount) ||
                (matchForm.notes || '') !== (initialMatch.notes || '')
            );
        }
        // user-password: la validità è gestita altrove
        return true;
    };

    // Validazione real-time per form password
    const isPasswordFormValid = () => {
        if (type !== 'user-password') return true;

        const rules = getPasswordValidationRules();
        return (
            passwordForm.oldPassword.trim().length > 0 &&
            rules.minLength &&
            rules.hasUppercase &&
            rules.hasLowercase &&
            rules.hasNumber &&
            rules.hasSpecialChar &&
            rules.matches
        );
    };

    // Validazione regole password per indicatori visivi
    const getPasswordValidationRules = () => {
        const password = passwordForm.newPassword;
        return {
            minLength: password.length >= 6,
            hasUppercase: /[A-Z]/.test(password),
            hasLowercase: /[a-z]/.test(password),
            hasNumber: /\d/.test(password),
            hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
            matches: password.length > 0 && password === passwordForm.confirmPassword
        };
    };

    const handleSubmit = async () => {
        setLoading(true);

        try {
            let dataToSend;
            switch (type) {
                case 'user-profile':
                    dataToSend = profileForm;
                    break;
                case 'user-password':
                    // Dati già validati dal bottone disabilitato
                    dataToSend = {
                        currentPassword: passwordForm.oldPassword,
                        newPassword: passwordForm.newPassword
                    };
                    break;
                case 'match':
                    dataToSend = matchForm;
                    break;
                default:
                    dataToSend = {};
            }

            const result = await onSave(dataToSend);

            // Gestisce response dal parent
            if (result && result.success) {
                // Success: modal verrà chiuso dal parent se necessario
                return;
            }
            // Error handling completamente delegato al parent - no toast duplicati
        } catch (error: any) {
            toast({
                title: 'Errore',
                description: error.message || 'Errore nel salvataggio',
                variant: 'destructive'
            });
            // Modal rimane aperto per permettere correzioni
        } finally {
            setLoading(false);
        }
    };

    const renderForm = () => {
        switch (type) {
            case 'user-profile':
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nome</Label>
                            <Input
                                id="name"
                                value={profileForm.name}
                                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                                className="bg-secondary/40 border-border focus:border-primary"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={profileForm.email}
                                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                                className="bg-secondary/40 border-border focus:border-primary"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="birthdate">Data di Nascita</Label>
                            <Input
                                id="birthdate"
                                type="date"
                                value={profileForm.birthdate}
                                onChange={(e) => setProfileForm({ ...profileForm, birthdate: e.target.value })}
                                className="bg-secondary/40 border-border focus:border-primary"
                            />
                        </div>
                    </div>
                );

            case 'user-password':
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="oldPassword">Password Attuale</Label>
                            <Input
                                id="oldPassword"
                                type="password"
                                value={passwordForm.oldPassword}
                                onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                                className="bg-secondary/40 border-border focus:border-primary"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="newPassword">Nuova Password</Label>
                            <Input
                                id="newPassword"
                                type="password"
                                value={passwordForm.newPassword}
                                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                className="bg-secondary/40 border-border focus:border-primary"
                            />

                            {/* Regole Password - Visibili solo se l'utente sta digitando */}
                            {passwordForm.newPassword.length > 0 && (
                                <div className="mt-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                                    <p className="text-sm font-medium text-foreground mb-2">Requisiti Password:</p>
                                    <div className="space-y-1">
                                        {Object.entries({
                                            minLength: 'Almeno 6 caratteri',
                                            hasUppercase: 'Una lettera maiuscola',
                                            hasLowercase: 'Una lettera minuscola',
                                            hasNumber: 'Un numero',
                                            hasSpecialChar: 'Un carattere speciale (!@#$%^&*)'
                                        }).map(([rule, text]) => {
                                            const isValid = getPasswordValidationRules()[rule as keyof ReturnType<typeof getPasswordValidationRules>];
                                            return (
                                                <div key={rule} className="flex items-center gap-2">
                                                    {isValid ? (
                                                        <Check className="h-4 w-4 text-green-500" />
                                                    ) : (
                                                        <X className="h-4 w-4 text-red-500" />
                                                    )}
                                                    <span className={`text-xs ${isValid ? 'text-green-600' : 'text-muted-foreground'}`}>
                                                        {text}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Conferma Password</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                value={passwordForm.confirmPassword}
                                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                className="bg-secondary/40 border-border focus:border-primary"
                            />

                            {/* Indicatore conferma password */}
                            {passwordForm.confirmPassword.length > 0 && (
                                <div className="flex items-center gap-2 mt-2">
                                    {getPasswordValidationRules().matches ? (
                                        <>
                                            <Check className="h-4 w-4 text-green-500" />
                                            <span className="text-xs text-green-600">
                                                Le password corrispondono
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <X className="h-4 w-4 text-red-500" />
                                            <span className="text-xs text-red-500">
                                                Le password non corrispondono
                                            </span>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                );

            case 'match':
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="field">Campo/Luogo</Label>
                            <Input
                                id="field"
                                value={matchForm.field}
                                onChange={(e) => setMatchForm({ ...matchForm, field: e.target.value })}
                                className="bg-secondary/40 border-border focus:border-primary"
                                placeholder="Campo Sportivo XYZ"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="matchDate">Data</Label>
                            <Input
                                id="matchDate"
                                type="date"
                                value={matchForm.date}
                                onChange={(e) => setMatchForm({ ...matchForm, date: e.target.value })}
                                className="bg-secondary/40 border-border focus:border-primary"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="playersCount">Numero Giocatori</Label>
                            <select
                                id="playersCount"
                                value={matchForm.playersCount}
                                onChange={(e) => setMatchForm({ ...matchForm, playersCount: Number(e.target.value) })}
                                className="w-full h-10 px-3 py-2 bg-secondary/40 border border-border rounded-md focus:border-primary focus:outline-none"
                            >
                                <option value={5}>5 vs 5</option>
                                <option value={8}>8 vs 8</option>
                                <option value={11}>11 vs 11</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="notes">Note (opzionale)</Label>
                            <Input
                                id="notes"
                                value={matchForm.notes}
                                onChange={(e) => setMatchForm({ ...matchForm, notes: e.target.value })}
                                className="bg-secondary/40 border-border focus:border-primary"
                                placeholder="Note aggiuntive..."
                                maxLength={500}
                            />
                        </div>

                        {/* 🆕 Sezione Utenti Astenuti */}
                        {data?.hasAbstained && (
                            <div className="space-y-2 pt-2 border-t border-border/50">
                                <Label className="text-orange-700 dark:text-orange-400 font-medium flex items-center gap-2">
                                    <Users className="w-4 h-4" />
                                    Utenti Astenuti
                                </Label>
                                <div className="space-y-2">
                                    <p className="text-xs text-muted-foreground">
                                        Questi utenti si sono astenuti dal voto per questa partita:
                                    </p>
                                    <div className="space-y-2">
                                        {data.abstainedNames?.map((userName, index) => {
                                            const abstainedUser = data.abstainedUsers?.[index];
                                            const isCompleted = data.status === 'completed';

                                            return (
                                                <div key={abstainedUser?.userId || index} className="flex items-center justify-between p-2 bg-orange-50/50 dark:bg-orange-950/20 rounded-md border border-orange-200/50 dark:border-orange-800/50">
                                                    <span className="text-sm font-medium text-orange-700 dark:text-orange-400">
                                                        {userName}
                                                    </span>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        disabled={isCompleted}
                                                        className="h-7 px-3 text-xs border-orange-300 text-orange-700 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-950/50 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        onClick={async () => {
                                                            if (!isCompleted && onReactivateUser && abstainedUser?.userId) {
                                                                await onReactivateUser(abstainedUser.userId);
                                                                onClose(); // Chiude il modal dopo riattivazione
                                                            }
                                                        }}
                                                        title={isCompleted ? "Non è possibile riattivare utenti per partite completate" : "Riattiva questo utente"}
                                                    >
                                                        Riattiva
                                                    </Button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {data.status === 'completed' ? (
                                            <>🚫 Partita completata: non è possibile riattivare utenti perché i calcoli sono già stati effettuati.</>
                                        ) : (
                                            <>Riattivando un utente, potrà votare nuovamente per questa partita.</>
                                        )}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* 🔒 ZONA ADMIN — Chiudi votazione adesso (solo se admin + sessione active) */}
                        {onForceCloseSession && canForceCloseSession && (
                            <div className="space-y-2 pt-3 border-t border-border/50">
                                <Label className="text-amber-700 dark:text-amber-400 font-medium flex items-center gap-2">
                                    <ShieldAlert className="w-4 h-4" />
                                    Zona admin
                                </Label>
                                {!forceCloseConfirm ? (
                                    <div className="flex items-center justify-between gap-2 p-2 bg-amber-50/50 dark:bg-amber-950/20 rounded-md border border-amber-200/50 dark:border-amber-800/50">
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-amber-700 dark:text-amber-400 leading-tight">
                                                Chiudi votazione adesso
                                            </p>
                                            <p className="text-xs text-muted-foreground leading-tight">
                                                Astiene chi non ha votato e calcola le medie ufficiali.
                                            </p>
                                        </div>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            className="shrink-0 h-7 px-3 text-xs border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/50"
                                            onClick={() => setForceCloseConfirm(true)}
                                        >
                                            Chiudi
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="p-2 bg-amber-50/50 dark:bg-amber-950/20 rounded-md border border-amber-200/50 dark:border-amber-800/50 space-y-2">
                                        <p className="text-xs text-amber-800 dark:text-amber-300">
                                            Sei sicuro? Chi non ha ancora votato verrà <strong>astenuto d'ufficio</strong>
                                            {' '}e le medie ufficiali saranno calcolate. L'operazione non è reversibile
                                            senza riaprire manualmente la sessione.
                                        </p>
                                        <div className="flex gap-2">
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                className="flex-1 h-8 text-xs"
                                                disabled={forceClosing}
                                                onClick={() => setForceCloseConfirm(false)}
                                            >
                                                Annulla
                                            </Button>
                                            <Button
                                                type="button"
                                                size="sm"
                                                className="flex-1 h-8 text-xs bg-amber-600 hover:bg-amber-600/90 text-white"
                                                disabled={forceClosing}
                                                onClick={async () => {
                                                    setForceClosing(true);
                                                    try {
                                                        await onForceCloseSession();
                                                        // Reset stato + chiusura modale
                                                        setForceCloseConfirm(false);
                                                        onClose();
                                                    } catch (e) {
                                                        // Errori gestiti dal parent via toast
                                                    } finally {
                                                        setForceClosing(false);
                                                    }
                                                }}
                                            >
                                                {forceClosing ? 'Chiusura...' : 'Conferma'}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );

            default:
                return null;
        }
    };

    const isCompact = true;
    const isMatch = type === 'match';

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent
                className={
                    isMatch
                        ? 'w-[calc(100%-2rem)] max-w-sm rounded-xl p-0 gap-0'
                        : 'w-[calc(100%-2rem)] max-w-xs rounded-xl p-0 gap-0'
                }
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                <DialogHeader className="px-4 pt-4 pb-2">
                    <DialogTitle className={isMatch ? 'flex items-center gap-2 text-base' : 'flex items-center gap-2 text-base'}>
                        {type === 'user-profile' && <><User className="w-4 h-4 text-primary" />Modifica Profilo</>}
                        {type === 'user-password' && <><Lock className="w-4 h-4 text-primary" />Cambia Password</>}
                        {type === 'match' && <><Trophy className="w-5 h-5 text-primary" />Modifica Partita</>}
                    </DialogTitle>
                </DialogHeader>

                {isCompact ? (
                    <>
                        <div className="px-4 pb-2 space-y-3 max-h-[70vh] overflow-y-auto">
                            {renderForm()}
                        </div>
                        <DialogFooter className="px-4 py-3 flex-row gap-2 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={onClose}
                                className="flex-1 h-9 text-sm"
                            >
                                Annulla
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                disabled={loading || !isPasswordFormValid() || !isDirty()}
                                onClick={handleSubmit}
                                className="flex-1 h-9 text-sm"
                            >
                                {loading ? 'Salvataggio...' : 'Salva'}
                            </Button>
                        </DialogFooter>
                    </>
                ) : (
                    // ramo morto — isCompact è sempre true ora
                    <div className="space-y-4 mt-4">
                        {renderForm()}
                        <div className="flex gap-3 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                className="flex-1"
                            >
                                Annulla
                            </Button>
                            <Button
                                type="button"
                                disabled={loading || !isPasswordFormValid()}
                                onClick={handleSubmit}
                                className="flex-1"
                            >
                                {loading ? 'Salvataggio...' : 'Salva'}
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default EditModal;