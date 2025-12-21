import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useToast } from '@/hooks/use-toast';
import { User, Lock, Calendar, Trophy, Check, X } from 'lucide-react';

interface EditModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'user-profile' | 'user-password' | 'match';
    data?: any;
    onSave: (data: any) => Promise<{ success: boolean; error?: string } | void>;
}

const EditModal = ({ isOpen, onClose, type, data, onSave }: EditModalProps) => {
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

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
        date: (() => {
            // 🛡️ Validazione robusta della data
            if (!data?.date) return '';
            try {
                // Prova diversi formati comuni
                let dateObj;

                // Se è già in formato YYYY-MM-DD, usalo direttamente
                if (typeof data.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
                    return data.date;
                }

                // Se è in formato DD/MM/YYYY, convertilo
                if (typeof data.date === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(data.date)) {
                    const [day, month, year] = data.date.split('/');
                    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                }

                // 🔧 HANDLER per formato backend: "Fri Oct 17 2025 02:00:00 GM" (GM troncato)
                if (typeof data.date === 'string' && data.date.includes('GM') && !data.date.includes('GMT')) {
                    const fixedDateString = data.date + 'T'; // Completa GMT
                    dateObj = new Date(fixedDateString);
                    if (!isNaN(dateObj.getTime())) {
                        return dateObj.toISOString().split('T')[0];
                    }
                }

                // Prova parsing standard
                dateObj = new Date(data.date);
                if (isNaN(dateObj.getTime())) return '';
                return dateObj.toISOString().split('T')[0];

            } catch (error) {
                return '';
            }
        })(),
        playersCount: data?.playersCount || 8,
        notes: data?.notes || ''
    });

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
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-card/90 backdrop-blur-sm border-border shadow-card max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-foreground font-display text-xl">
                        {type === 'user-profile' && <><User className="w-5 h-5 text-primary" />Modifica Profilo</>}
                        {type === 'user-password' && <><Lock className="w-5 h-5 text-primary" />Cambia Password</>}
                        {type === 'match' && <><Trophy className="w-5 h-5 text-primary" />Modifica Partita</>}
                    </DialogTitle>
                </DialogHeader>

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
            </DialogContent>
        </Dialog>
    );
};

export default EditModal;