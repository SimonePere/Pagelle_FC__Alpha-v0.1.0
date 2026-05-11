import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/redux/store/store';
import { claimGuestById } from '@/redux/slices/authSlice';
import { refreshUserData } from '@/redux/slices/authSlice';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, Lock, User, Check, X, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const ClaimGuest = () => {
    const { user, isLoading, error } = useSelector((state: RootState) => state.auth);
    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();
    const { toast } = useToast();

    // Nome pre-compilato dal profilo guest
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [acceptTerms, setAcceptTerms] = useState(false);

    // Se non è guest o non loggato, redirect
    if (!user) {
        navigate('/login');
        return null;
    }

    const getPasswordValidationRules = () => ({
        minLength: password.length >= 6,
        hasUppercase: /[A-Z]/.test(password),
        hasLowercase: /[a-z]/.test(password),
        hasNumber: /\d/.test(password),
        hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    });

    const isPasswordValid = () => {
        const rules = getPasswordValidationRules();
        return rules.minLength && rules.hasUppercase && rules.hasLowercase && rules.hasNumber && rules.hasSpecialChar;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            toast({ title: 'Errore', description: 'Inserisci il tuo nome.', variant: 'destructive' });
            return;
        }
        if (!email.trim()) {
            toast({ title: 'Errore', description: 'Inserisci la tua email.', variant: 'destructive' });
            return;
        }
        if (!isPasswordValid()) {
            toast({ title: 'Errore', description: 'La password non soddisfa tutti i requisiti.', variant: 'destructive' });
            return;
        }
        if (!acceptTerms) {
            toast({ title: 'Errore', description: 'Devi accettare Privacy e Termini di Servizio.', variant: 'destructive' });
            return;
        }

        const result = await dispatch(claimGuestById({ name: name.trim(), email: email.trim(), password }));
        if (claimGuestById.fulfilled.match(result)) {
            await dispatch(refreshUserData());
            toast({ title: 'Benvenuto!', description: 'Account creato con successo. Il tuo storico è intatto.' });
            navigate('/');
        }
    };

    const teamName = user.teamName || (user as any).teams?.[0]?.name;

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-1/2 -right-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-1/2 -left-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
            </div>

            <Card className="w-full max-w-md bg-card/80 backdrop-blur-sm border-border shadow-card relative z-10 animate-scale-in my-8">
                <CardHeader className="text-center space-y-4 pb-4">
                    <div className="mx-auto w-20 h-20 rounded-2xl overflow-hidden shadow-glow animate-glow">
                        <img src="/FLAT_BG_W.png" alt="Pagelle FC Logo" className="w-full h-full object-cover" />
                    </div>
                    <div>
                        <CardTitle className="font-display text-3xl font-bold text-foreground mb-1">
                            Completa la registrazione
                        </CardTitle>
                        <CardDescription className="text-muted-foreground">
                            Crea il tuo account e mantieni tutto il tuo storico
                        </CardDescription>
                    </div>
                </CardHeader>

                <CardContent className="space-y-5">
                    {/* Info team già associato */}
                    {teamName && (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/10 border border-primary/20">
                            <Users className="w-5 h-5 text-primary shrink-0" />
                            <div>
                                <p className="text-xs text-muted-foreground">Sarai associato al team</p>
                                <p className="font-semibold text-foreground">{teamName}</p>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Nome */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <User className="w-4 h-4 text-primary" /> Nome
                            </Label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className="h-12"
                                placeholder="Il tuo nome"
                                autoFocus={!name}
                            />
                            <p className="text-xs text-muted-foreground">Pre-compilato con il nome ospite — modificalo se vuoi.</p>
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-primary" /> Email
                            </Label>
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="h-12"
                                placeholder="tua@email.com"
                            />
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Lock className="w-4 h-4 text-primary" /> Password
                            </Label>
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="h-12"
                                placeholder="••••••••"
                            />
                            {password.length > 0 && (
                                <div className="mt-2 p-3 rounded-lg bg-muted/30 border border-border/50">
                                    <p className="text-sm font-medium text-foreground mb-2">Requisiti Password:</p>
                                    <div className="space-y-1">
                                        {Object.entries({
                                            minLength: 'Almeno 6 caratteri',
                                            hasUppercase: 'Una lettera maiuscola',
                                            hasLowercase: 'Una lettera minuscola',
                                            hasNumber: 'Un numero',
                                            hasSpecialChar: 'Un carattere speciale (!@#$%^&*)',
                                        }).map(([rule, text]) => {
                                            const valid = getPasswordValidationRules()[rule as keyof ReturnType<typeof getPasswordValidationRules>];
                                            return (
                                                <div key={rule} className="flex items-center gap-2">
                                                    {valid ? <Check className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-red-500" />}
                                                    <span className={`text-xs ${valid ? 'text-green-600' : 'text-muted-foreground'}`}>{text}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Terms */}
                        <div className="flex items-start gap-2 pt-1">
                            <Checkbox id="terms" checked={acceptTerms} onCheckedChange={(v) => setAcceptTerms(!!v)} />
                            <Label htmlFor="terms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                                Accetto la{' '}
                                <Link to="/privacy" target="_blank" className="text-primary underline">Privacy Policy</Link>
                                {' '}e i{' '}
                                <Link to="/terms" target="_blank" className="text-primary underline">Termini di Servizio</Link>.
                            </Label>
                        </div>

                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <Button
                            type="submit"
                            disabled={isLoading || !isPasswordValid() || !acceptTerms}
                            className="w-full h-12 font-display font-bold text-lg shadow-glow disabled:opacity-50"
                        >
                            {isLoading ? 'Attendere...' : 'Crea il mio account'}
                        </Button>
                    </form>

                    <div className="text-center text-xs text-muted-foreground pt-2 border-t border-border space-x-3">
                        <Link to="/privacy" className="hover:text-primary">Privacy</Link>
                        <span>·</span>
                        <Link to="/terms" className="hover:text-primary">Termini</Link>
                        <span>·</span>
                        <Link to="/cookie-policy" className="hover:text-primary">Cookie</Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default ClaimGuest;
