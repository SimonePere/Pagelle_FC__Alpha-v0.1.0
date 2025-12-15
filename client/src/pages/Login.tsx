import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Trophy, Mail, Lock, User, Calendar as CalendarIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { loginUser, registerUser } from '@/redux/slices/authSlice';
import { RootState, AppDispatch } from '@/redux/store/store';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const dispatch = useDispatch<AppDispatch>();
  
  // Redux state
  const { user, isLoading, isAuthenticated, error } = useSelector((state: RootState) => state.auth);

  // Redirect se già autenticato
  useEffect(() => {
    if (isAuthenticated && user) {
      navigate('/');
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({ 
        title: 'Errore', 
        description: 'Inserisci email e password',
        variant: 'destructive'
      });
      return;
    }

    if (!isLogin && !name.trim()) {
      toast({ 
        title: 'Errore', 
        description: 'Inserisci il nome',
        variant: 'destructive'
      });
      return;
    }

    if (!isLogin && !birthdate) {
      toast({ 
        title: 'Errore', 
        description: 'Seleziona la data di nascita',
        variant: 'destructive'
      });
      return;
    }

    try {
      if (isLogin) {
        const result = await dispatch(loginUser({ email, password }));
        if (loginUser.fulfilled.match(result)) {
          toast({ title: 'Benvenuto!', description: 'Login effettuato con successo' });
          navigate('/');
        }
      } else {
        const result = await dispatch(registerUser({ 
          name, 
          email, 
          password,
          birthdate: birthdate
        }));
        if (registerUser.fulfilled.match(result)) {
          toast({ title: 'Benvenuto!', description: 'Registrazione completata' });
          navigate('/');
        }
      }
    } catch (err: any) {
      toast({ 
        title: 'Errore', 
        description: err?.message || 'Errore imprevisto', 
        variant: 'destructive' 
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-1/2 -left-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl"></div>
      </div>

      <Card className="w-full max-w-md bg-card/80 backdrop-blur-sm border-border shadow-card relative z-10 animate-scale-in">
        <CardHeader className="text-center space-y-4 pb-8">
          <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow animate-glow">
            <Trophy className="w-10 h-10 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="font-display text-4xl font-bold text-foreground mb-2">
              Pagelle FC
            </CardTitle>
            <CardDescription className="text-muted-foreground text-base">
              {isLogin ? 'Accedi al tuo account' : 'Crea il tuo account'}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2 text-foreground font-medium">
                <Mail className="w-4 h-4 text-primary" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-secondary/40 border-border focus:border-primary transition-all h-12"
                placeholder={isLogin ? "Simone o simone@team.com" : "simone@email.com"}
              />
            </div>
            
            {!isLogin && (
              <>
              <div className="space-y-2 animate-slide-in">
                <Label htmlFor="name" className="flex items-center gap-2 text-foreground font-medium">
                  <User className="w-4 h-4 text-primary" />
                  Nome
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="bg-secondary/40 border-border focus:border-primary transition-all h-12"
                  placeholder="Simone Rossi"
                  />
              </div>
              {/* Data di nascita */}
              <div className="space-y-2 animate-slide-in">
                <Label htmlFor="birthdate" className="flex items-center gap-2 text-foreground font-medium">
                  <CalendarIcon className="w-4 h-4 text-primary" />
                  Data di Nascita
                </Label>
                <Input
                  id="birthdate"
                  type="date"
                  value={birthdate}
                  onChange={(e) => setBirthdate(e.target.value)}
                  required
                  className="bg-secondary/40 border-border focus:border-primary transition-all h-12"
                />
              </div>
                  </>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2 text-foreground font-medium">
                <Lock className="w-4 h-4 text-primary" />
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-secondary/40 border-border focus:border-primary transition-all h-12"
                placeholder="••••••••"
              />
            </div>
            
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <Button 
              type="submit" 
              disabled={isLoading}
              className="w-full h-12 text-primary-foreground font-display font-bold text-lg shadow-glow disabled:opacity-50"
            >
              {isLoading ? 'Attendere...' : (isLogin ? 'Accedi' : 'Registrati')}
            </Button>
          </form>
          <div className="text-center pt-2">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-primary hover:text-accent transition-colors font-medium"
            >
              {isLogin ? 'Non hai un account? Registrati' : 'Hai già un account? Accedi'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login; 
