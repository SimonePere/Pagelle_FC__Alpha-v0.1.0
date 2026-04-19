import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Mail, Lock, User, Calendar as CalendarIcon, Users, KeyRound, Check, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { loginUser, registerUser, refreshUserData } from '@/redux/slices/authSlice';
import { createTeam, joinTeam } from '@/redux/slices/teamSlice';
import { RootState, AppDispatch } from '@/redux/store/store';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Login = () => {
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [signupMode, setSignupMode] = useState<'create' | 'join'>('create');

  // Campi condivisi
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Campi registrazione
  const [name, setName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [teamName, setTeamName] = useState('');
  const [teamCode, setTeamCode] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();
  const dispatch = useDispatch<AppDispatch>();

  const { user, isLoading, isAuthenticated, error } = useSelector((state: RootState) => state.auth);

  // Redirect se già autenticato
  useEffect(() => {
    if (isAuthenticated && user) {
      navigate('/');
    }
  }, [isAuthenticated, user, navigate]);

  // Validazione password
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

  // --- LOGIN ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: 'Errore', description: 'Inserisci email e password.', variant: 'destructive' });
      return;
    }

    const result = await dispatch(loginUser({ email, password }));
    if (loginUser.fulfilled.match(result)) {
      toast({ title: 'Benvenuto!', description: 'Login effettuato con successo.' });
      navigate('/');
    }
  };

  // --- REGISTRAZIONE ---
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({ title: 'Errore', description: 'Inserisci il tuo nome.', variant: 'destructive' });
      return;
    }
    if (!birthdate) {
      toast({ title: 'Errore', description: 'Seleziona la data di nascita.', variant: 'destructive' });
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

    if (signupMode === 'create' && !teamName.trim()) {
      toast({ title: 'Errore', description: 'Inserisci il nome del team.', variant: 'destructive' });
      return;
    }
    if (signupMode === 'join' && !teamCode.trim()) {
      toast({ title: 'Errore', description: 'Inserisci il codice team.', variant: 'destructive' });
      return;
    }

    try {
      // Step 1: Registra utente
      const regResult = await dispatch(registerUser({ name, email, password, birthdate }));

      if (!registerUser.fulfilled.match(regResult)) {
        // L'errore viene gestito da Redux error state
        return;
      }

      // Step 2: Crea o unisciti al team
      if (signupMode === 'create') {
        const teamResult = await dispatch(createTeam({ name: teamName.trim() }));
        if (createTeam.fulfilled.match(teamResult)) {
          toast({ title: 'Registrazione completata!', description: `Team "${teamName}" creato. Condividi il codice invito con i compagni.` });
        } else {
          toast({ title: 'Attenzione', description: 'Account creato, ma errore nella creazione del team. Potrai crearlo dopo.', variant: 'destructive' });
        }
      } else {
        const joinResult = await dispatch(joinTeam({ inviteCode: teamCode.trim() }));
        if (joinTeam.fulfilled.match(joinResult)) {
          toast({ title: 'Registrazione completata!', description: 'Ti sei unito al team con successo.' });
        } else {
          toast({ title: 'Attenzione', description: 'Account creato, ma il codice team non è valido. Potrai unirti dopo.', variant: 'destructive' });
        }
      }

      // Step 3: Aggiorna i dati utente (enriched con teams) prima di navigare
      await dispatch(refreshUserData());

      navigate('/');
    } catch (err: any) {
      toast({ title: 'Errore', description: err?.message || 'Errore imprevisto.', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md bg-card/80 backdrop-blur-sm border-border shadow-card relative z-10 animate-scale-in my-8">
        <CardHeader className="text-center space-y-4 pb-6">
          <div className="mx-auto w-24 h-24 rounded-2xl overflow-hidden shadow-glow animate-glow">
            <img src="/FLAT_BG_W.png" alt="Pagelle FC Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <CardTitle className="font-display text-4xl font-bold text-foreground mb-2">
              Pagelle FC
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Vota, confronta, vinci con il tuo team
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <Tabs value={tab} onValueChange={(v) => setTab(v as 'login' | 'signup')}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="login">Accedi</TabsTrigger>
              <TabsTrigger value="signup">Registrati</TabsTrigger>
            </TabsList>

            {/* ========== LOGIN TAB ========== */}
            <TabsContent value="login" className="space-y-4 mt-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary" /> Nome o Email
                  </Label>
                  <Input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12"
                    placeholder="Simone o simone@team.com"
                  />
                </div>
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
                </div>

                {error && tab === 'login' && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" disabled={isLoading} className="w-full h-12 font-display font-bold text-lg shadow-glow">
                  {isLoading ? 'Attendere...' : 'Accedi'}
                </Button>
              </form>
            </TabsContent>

            {/* ========== SIGNUP TAB ========== */}
            <TabsContent value="signup" className="space-y-4 mt-4">
              {/* Sub-tabs: Crea team / Unisciti */}
              <Tabs value={signupMode} onValueChange={(v) => setSignupMode(v as 'create' | 'join')}>
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="create" className="gap-1.5">
                    <Users className="w-4 h-4" /> Crea team
                  </TabsTrigger>
                  <TabsTrigger value="join" className="gap-1.5">
                    <KeyRound className="w-4 h-4" /> Unisciti
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" /> Il tuo nome
                  </Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} required className="h-12" placeholder="Mario Rossi" />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary" /> Email
                  </Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-12" placeholder="mario@esempio.com" />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-primary" /> Data di nascita
                  </Label>
                  <Input type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} required className="h-12" />
                </div>
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

                {/* Campi team in base al mode */}
                {signupMode === 'create' ? (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" /> Nome del nuovo team
                    </Label>
                    <Input value={teamName} onChange={(e) => setTeamName(e.target.value)} required className="h-12" placeholder="Es: I Guerrieri" />
                    <p className="text-xs text-muted-foreground">
                      Dopo la registrazione riceverai un codice da condividere con i compagni.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-primary" /> Codice team
                    </Label>
                    <Input
                      value={teamCode}
                      onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
                      required
                      className="h-12 uppercase tracking-widest font-mono"
                      placeholder="ABC123"
                      maxLength={10}
                    />
                    <p className="text-xs text-muted-foreground">
                      Inserisci il codice ricevuto da un membro del team.
                    </p>
                  </div>
                )}

                <div className="flex items-start gap-2 pt-2">
                  <Checkbox id="terms" checked={acceptTerms} onCheckedChange={(v) => setAcceptTerms(!!v)} />
                  <Label htmlFor="terms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                    Accetto la{' '}
                    <Link to="/privacy" target="_blank" className="text-primary underline">Privacy Policy</Link>
                    {' '}e i{' '}
                    <Link to="/terms" target="_blank" className="text-primary underline">Termini di Servizio</Link>.
                  </Label>
                </div>

                {error && tab === 'signup' && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  disabled={isLoading || !isPasswordValid() || !acceptTerms}
                  className="w-full h-12 font-display font-bold text-lg shadow-glow disabled:opacity-50"
                >
                  {isLoading ? 'Attendere...' : 'Registrati'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="text-center text-xs text-muted-foreground pt-4 border-t border-border space-x-3">
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

export default Login; 
