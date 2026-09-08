/**
 * 🎬 DemoBanner — La barra sempre presente durante la visita alla demo.
 *
 * Fa tre cose:
 *   1. ricorda al visitatore, senza infastidirlo, che nulla di ciò che fa
 *      verrà salvato;
 *   2. tiene davanti a lui la via d'uscita utile — creare il proprio team —
 *      che è il motivo per cui la demo esiste;
 *   3. raccoglie i toast delle azioni simulate, così il feedback ha un punto
 *      solo invece di essere sparso nei componenti.
 *
 * Segue lo stesso schema del banner ospite già presente in DashboardLayout:
 * sottile, sotto l'header, non copre la BottomNav su mobile.
 *
 * Vedi DEMO_MODE_IMPLEMENTATION_PLAN.md §B.3
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Eye, RotateCcw, LogOut, MoreVertical, Sparkles } from 'lucide-react';
import { RootState, AppDispatch } from '@/redux/store/store';
import { exitDemo } from '@/redux/slices/authSlice';
import { useToast } from '@/hooks/use-toast';
import { DEMO_ACTION_EVENT, type DemoActionEvent } from '@/lib/demoMode';
import { DEMO_TOUR_ENABLED, DEMO_TOUR_RESTART_EVENT } from '@/data/demo-tour-steps';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// L'evento e' definito insieme al tour, che ne e' il proprietario: qui viene
// solo ri-esportato per non rompere gli import gia' esistenti.
export { DEMO_TOUR_RESTART_EVENT };

export function DemoBanner() {
    const isDemo = useSelector((state: RootState) => state.auth.isDemo);
    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [lastMessage, setLastMessage] = useState<string | null>(null);

    // Ascolta le azioni simulate dall'intercettore in lib/demoMode.ts.
    // L'hook sta qui e non nell'intercettore perché quello è un modulo, non un
    // componente: non può mostrare toast da sé.
    useEffect(() => {
        if (!isDemo) return;

        const onDemoAction = (event: Event) => {
            const detail = (event as CustomEvent<DemoActionEvent>).detail;
            if (!detail?.message) return;

            setLastMessage(detail.message);
            toast({
                title: '🎬 Modalità demo',
                description: detail.message,
            });
        };

        window.addEventListener(DEMO_ACTION_EVENT, onDemoAction);
        return () => window.removeEventListener(DEMO_ACTION_EVENT, onDemoAction);
    }, [isDemo, toast]);

    if (!isDemo) return null;

    const handleSignup = () => {
        // Prima si esce dalla demo, poi si va alla registrazione: se il token
        // demo restasse in localStorage, `activeTeamId` continuerebbe a puntare
        // alla squadra dimostrativa anche dopo la creazione del team vero.
        dispatch(exitDemo());
        navigate('/login?tab=signup');
    };

    const handleExit = () => {
        dispatch(exitDemo());
        navigate('/login');
    };

    const handleRestartTour = () => {
        window.dispatchEvent(new CustomEvent(DEMO_TOUR_RESTART_EVENT));
    };

    return (
        <div className="sticky top-0 z-40 border-b border-primary/20 bg-primary/10 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3 px-4 py-2">
                <div className="flex min-w-0 items-center gap-2 text-xs text-primary">
                    <Eye className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">
                        <span className="font-semibold">Modalità demo</span>
                        <span className="hidden sm:inline"> — stai esplorando una squadra di esempio, nulla viene salvato</span>
                    </span>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                    <button
                        onClick={handleSignup}
                        className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
                    >
                        <Sparkles className="h-3.5 w-3.5" />
                        Crea il tuo team
                    </button>

                    <DropdownMenu>
                        <DropdownMenuTrigger className="rounded-md p-1.5 text-primary transition-colors hover:bg-primary/10">
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">Altre opzioni della demo</span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {/* A tour spento la voce sparisce, invece di restare
                                li' a emettere un evento che nessuno ascolta */}
                            {DEMO_TOUR_ENABLED && (
                                <DropdownMenuItem onClick={handleRestartTour} className="gap-2 text-xs">
                                    <RotateCcw className="h-3.5 w-3.5" />
                                    Rivedi il tour guidato
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={handleExit} className="gap-2 text-xs">
                                <LogOut className="h-3.5 w-3.5" />
                                Esci dalla demo
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Eco dell'ultima azione simulata: il toast sparisce in fretta,
                questa riga resta finché il visitatore non fa altro. */}
            {lastMessage && (
                <div className="border-t border-primary/10 px-4 py-1 text-[11px] text-primary/70">
                    {lastMessage}
                </div>
            )}
        </div>
    );
}

export default DemoBanner;
