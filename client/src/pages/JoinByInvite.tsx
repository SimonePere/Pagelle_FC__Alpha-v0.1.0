/**
 * JoinByInvite — pagina pubblica
 * URL: /join?token=XXXXXXXX
 *
 * Flusso:
 *   1. Legge ?token= dalla URL
 *   2. GET /invite/:token → mostra dati partita
 *   3a. "Vota Subito"        → POST /auth/guest-login  (JWT guest)
 *   3b. "Registrati e Vota" → form registrazione + POST /auth/guest-merge-user
 */

import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/redux/store/store';
import { guestLogin, claimGuest } from '@/redux/slices/authSlice';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Calendar, MapPin, Users, LogIn, UserPlus, Loader2, Trophy } from 'lucide-react';

interface InviteInfo {
    playerName: string;
    teamName: string;
    matchDate: string;
    matchField: string;
    matchId: string;
    matchStatus?: 'draft' | 'active' | 'completed' | 'cancelled';
    playersCount?: number;
    participants?: string[];
}

type View = 'loading' | 'error' | 'invite' | 'register';

const JoinByInvite = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token') || '';
    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();
    const { toast } = useToast();

    const { isLoading: authLoading, isGuest, guestMatchId, isAuthenticated } = useSelector((s: RootState) => s.auth);

    const [view, setView] = useState<View>('loading');
    const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
    const [errorMessage, setErrorMessage] = useState('');

    // Form registrazione
    const [regName, setRegName] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [regConfirm, setRegConfirm] = useState('');

    // Se già loggato come guest per questo match, manda alla home
    //    (la home mostra subito il bottone "Vota partita" più visibile della pagina /vote).
    useEffect(() => {
        if (isAuthenticated && isGuest && guestMatchId) {
            navigate('/');
        } else if (isAuthenticated && !isGuest) {
            navigate('/');
        }
    }, [isAuthenticated, isGuest, guestMatchId, navigate]);

    // Valida il token al mount
    useEffect(() => {
        if (!token) {
            setErrorMessage('Link non valido. Richiedi un nuovo invito al creatore della partita.');
            setView('error');
            return;
        }

        const fetchInvite = async () => {
            try {
                // Endpoint pubblico: nessun token in localStorage = nessun header Authorization aggiunto
                const data = await api.get(`/invite/${token}`);
                setInviteInfo(data);
                // Pre-compila il nome nel form di registrazione
                setRegName(data.playerName || '');
                setView('invite');
            } catch (err: any) {
                if (err.status === 410 || err.message?.includes('chiusa') || err.message?.includes('scaduto')) {
                    setErrorMessage('Questa partita è già terminata. Registrati per continuare ad usare l\'app.');
                } else if (err.status === 404) {
                    setErrorMessage('Invito non trovato. Potrebbe essere già stato usato o il link è errato.');
                } else {
                    setErrorMessage(err.message || 'Errore nel caricamento dell\'invito.');
                }
                setView('error');
            }
        };

        fetchInvite();
    }, [token]);

    const handleGuestLogin = async () => {
        const result = await dispatch(guestLogin({ inviteToken: token }));
        if (guestLogin.fulfilled.match(result)) {
            toast({ title: 'Bentornato!', description: 'Ora puoi votare la partita.' });
            navigate('/');
        } else {
            toast({
                title: 'Errore',
                description: result.payload as string || 'Impossibile accedere.',
                variant: 'destructive',
            });
        }
    };

    const handleRegister = async () => {
        if (!regName.trim() || !regEmail.trim() || !regPassword) {
            toast({ title: 'Compila tutti i campi', variant: 'destructive' });
            return;
        }
        if (regPassword !== regConfirm) {
            toast({ title: 'Le password non coincidono', variant: 'destructive' });
            return;
        }
        if (regPassword.length < 6) {
            toast({ title: 'Password troppo corta (min 6 caratteri)', variant: 'destructive' });
            return;
        }

        const result = await dispatch(claimGuest({
            name: regName.trim(),
            email: regEmail.trim(),
            password: regPassword,
            inviteToken: token,
        }));

        if (claimGuest.fulfilled.match(result)) {
            toast({ title: 'Registrazione completata!', description: 'Account creato con la tua cronologia ospite.' });
            navigate('/');
        } else {
            toast({
                title: 'Errore',
                description: result.payload as string || 'Impossibile completare la registrazione.',
                variant: 'destructive',
            });
        }
    };

    const formatDate = (iso: string) => {
        try {
            return new Date(iso).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
        } catch {
            return iso;
        }
    };

    // ── Loading ───────────────────────────────────────────────
    if (view === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // ── Errore ────────────────────────────────────────────────
    if (view === 'error') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
                <Card className="w-full max-w-sm">
                    <CardHeader className="text-center">
                        <div className="text-4xl mb-2">⚠️</div>
                        <CardTitle>Invito non disponibile</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-center">
                        <p className="text-sm text-muted-foreground">{errorMessage}</p>
                        <Button variant="outline" className="w-full" onClick={() => navigate('/login')}>
                            Vai al Login
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // ── Welcome card ──────────────────────────────────────────
    if (view === 'invite' && inviteInfo) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
                <div className="w-full max-w-sm space-y-4">
                    {/* Header */}
                    <div className="text-center space-y-1">
                        <img
                            src="/pwa-192x192.png"
                            alt="Pagelle FC"
                            className="mx-auto mb-2 h-16 w-16 rounded-xl shadow-lg"
                        />
                        <h1 className="text-2xl font-bold text-white">Ciao, {inviteInfo.playerName}!</h1>
                        <p className="text-slate-300 text-sm">Sei stato invitato a votare la partita</p>
                    </div>

                    {/* Info partita */}
                    <Card>
                        <CardContent className="p-4 space-y-3">
                            <div className="flex items-center gap-2 text-sm">
                                <Users className="h-4 w-4 text-primary shrink-0" />
                                <span className="font-medium">{inviteInfo.teamName}</span>
                                <Badge variant="secondary" className="ml-auto text-xs">Ospite</Badge>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-4 w-4 shrink-0" />
                                <span>{formatDate(inviteInfo.matchDate)}</span>
                            </div>
                            {inviteInfo.matchField && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <MapPin className="h-4 w-4 shrink-0" />
                                    <span>{inviteInfo.matchField}</span>
                                </div>
                            )}
                            {inviteInfo.playersCount && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Trophy className="h-4 w-4 shrink-0" />
                                    <span>Formato {inviteInfo.playersCount} vs {inviteInfo.playersCount}</span>
                                </div>
                            )}
                            {inviteInfo.participants && inviteInfo.participants.length > 0 && (
                                <div className="pt-2 border-t space-y-1.5">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                        Partecipanti ({inviteInfo.participants.length})
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {inviteInfo.participants.map((name, i) => (
                                            <Badge
                                                key={i}
                                                variant={name === inviteInfo.playerName ? 'default' : 'outline'}
                                                className="text-xs font-normal"
                                            >
                                                {name}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Azioni */}
                    <div className="space-y-3">
                        {/* 🎯 CTA dinamico:
                            - match active/draft → "Vota Subito" (entra come guest e vota)
                            - match completed/cancelled → "Visualizza risultati" (entra read-only) */}
                        <Button
                            className="w-full h-12 text-base gap-2"
                            onClick={handleGuestLogin}
                            disabled={authLoading}
                        >
                            {authLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                            {inviteInfo.matchStatus === 'completed' || inviteInfo.matchStatus === 'cancelled'
                                ? 'Visualizza risultati'
                                : 'Vota Subito'}
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full h-12 text-base gap-2"
                            onClick={() => setView('register')}
                            disabled={authLoading}
                        >
                            <UserPlus className="h-4 w-4" />
                            {inviteInfo.matchStatus === 'completed' || inviteInfo.matchStatus === 'cancelled'
                                ? 'Registrati per continuare'
                                : 'Registrati e Vota'}
                        </Button>
                        <p className="text-center text-xs text-muted-foreground">
                            {inviteInfo.matchStatus === 'completed' || inviteInfo.matchStatus === 'cancelled'
                                ? 'La partita è chiusa: registrati per restare nell\'app e ritrovare la cronologia'
                                : '"Registrati e Vota" crea il tuo account mantenendo la cronologia ospite'}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // ── Form registrazione ────────────────────────────────────
    if (view === 'register') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
                <div className="w-full max-w-sm space-y-4">
                    <div className="text-center">
                        <Button variant="ghost" size="sm" className="text-slate-300 mb-2" onClick={() => setView('invite')}>
                            ← Indietro
                        </Button>
                        <h1 className="text-xl font-bold text-white">Crea il tuo account</h1>
                        <p className="text-slate-400 text-sm mt-1">La tua cronologia ospite verrà conservata</p>
                    </div>

                    <Card>
                        <CardContent className="p-4 space-y-3">
                            <div className="space-y-2">
                                <Label htmlFor="reg-name">Nome</Label>
                                <Input
                                    id="reg-name"
                                    value={regName}
                                    onChange={(e) => setRegName(e.target.value)}
                                    placeholder="Il tuo nome"
                                    className="h-11"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="reg-email">Email</Label>
                                <Input
                                    id="reg-email"
                                    type="email"
                                    value={regEmail}
                                    onChange={(e) => setRegEmail(e.target.value)}
                                    placeholder="esempio@email.com"
                                    className="h-11"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="reg-password">Password</Label>
                                <Input
                                    id="reg-password"
                                    type="password"
                                    value={regPassword}
                                    onChange={(e) => setRegPassword(e.target.value)}
                                    placeholder="Min. 6 caratteri"
                                    className="h-11"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="reg-confirm">Conferma Password</Label>
                                <Input
                                    id="reg-confirm"
                                    type="password"
                                    value={regConfirm}
                                    onChange={(e) => setRegConfirm(e.target.value)}
                                    placeholder="Ripeti la password"
                                    className="h-11"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Button
                        className="w-full h-12 text-base gap-2"
                        onClick={handleRegister}
                        disabled={authLoading}
                    >
                        {authLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                        Crea Account e Vota
                    </Button>
                </div>
            </div>
        );
    }

    return null;
};

export default JoinByInvite;
