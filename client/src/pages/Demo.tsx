/**
 * 🎬 Demo — La porta d'ingresso pubblica alla squadra dimostrativa.
 *
 * È l'URL condivisibile: sta in bio Instagram, nel README, dietro un QR.
 * Chi ci arriva non deve fare nulla — nessun form, nessuna scelta, nessuna
 * casella da spuntare. Chiede il token demo, aspetta un istante e si trova
 * dentro l'app.
 *
 * L'unico caso in cui mostra qualcosa di diverso è il fallimento: se la
 * squadra dimostrativa non è stata popolata, il visitatore merita una frase
 * comprensibile e non una pagina bianca.
 *
 * Vedi DEMO_MODE_IMPLEMENTATION_PLAN.md §B.4
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { RootState, AppDispatch } from '@/redux/store/store';
import { demoLogin } from '@/redux/slices/authSlice';
import { Button } from '@/components/ui/button';

const Demo = () => {
    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();
    const { isDemo, isAuthenticated } = useSelector((state: RootState) => state.auth);
    const [error, setError] = useState<string | null>(null);

    // In sviluppo React monta due volte in StrictMode: senza questa guardia
    // partirebbero due login demo, e il secondo sovrascriverebbe il token del
    // primo mentre la navigazione è già in corso.
    const started = useRef(false);

    useEffect(() => {
        if (started.current) return;
        started.current = true;

        // Già dentro la demo (es. link riaperto): non serve un nuovo token.
        if (isDemo && isAuthenticated) {
            navigate('/', { replace: true });
            return;
        }

        (async () => {
            const result = await dispatch(demoLogin());
            if (demoLogin.fulfilled.match(result)) {
                navigate('/', { replace: true });
            } else {
                setError((result.payload as string) || 'Demo non disponibile al momento');
            }
        })();
    }, [dispatch, navigate, isDemo, isAuthenticated]);

    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background p-4">
                <div className="w-full max-w-sm space-y-5 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
                        <AlertCircle className="h-7 w-7 text-destructive" />
                    </div>
                    <div className="space-y-2">
                        <h1 className="font-display text-2xl font-bold text-foreground">
                            Demo non disponibile
                        </h1>
                        <p className="text-sm text-muted-foreground">{error}</p>
                        <p className="text-sm text-muted-foreground">
                            Puoi comunque creare il tuo team: ci vuole meno di un minuto.
                        </p>
                    </div>
                    <div className="flex flex-col gap-2">
                        <Button onClick={() => navigate('/login?tab=signup')} className="h-11 w-full font-semibold">
                            Crea il tuo team
                        </Button>
                        <Link to="/login" className="text-xs text-muted-foreground hover:text-primary">
                            Torna al login
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -right-1/4 -top-1/2 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
                <div className="absolute -bottom-1/2 -left-1/4 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 space-y-5 text-center"
            >
                <div className="mx-auto h-20 w-20 overflow-hidden rounded-2xl shadow-glow">
                    <img src="/FLAT_BG_W.png" alt="Pagelle FC" className="h-full w-full object-cover" />
                </div>

                <div className="space-y-1.5">
                    <h1 className="font-display text-3xl font-bold text-foreground">
                        Pagelle FC
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Preparo la squadra di esempio…
                    </p>
                </div>

                <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
            </motion.div>
        </div>
    );
};

export default Demo;
