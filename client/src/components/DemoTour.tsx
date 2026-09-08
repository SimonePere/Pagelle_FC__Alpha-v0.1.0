/**
 * 🎬 DemoTour — le cinque schermate di benvenuto della modalità demo.
 *
 * Ricalca OnboardingTutorial, che è il modello già collaudato nell'app: un
 * riquadro al centro, si legge, si va avanti. Resta però un componente
 * distinto, perché le due cose non si somigliano nel contenuto — quello spiega
 * l'app a chi si è appena registrato, questo racconta la demo a chi non sa
 * ancora cos'è Pagelle FC.
 *
 * Volutamente non naviga fra le pagine e non evidenzia elementi: era la
 * versione precedente, e ogni parte in movimento in più è una cosa che si
 * rompe quando il layout cambia. Il visitatore legge e poi esplora da sé —
 * la barra demo resta lì a ricordargli dov'è.
 *
 * Vedi DEMO_MODE_IMPLEMENTATION_PLAN.md §7
 */

import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight } from 'lucide-react';
import { RootState } from '@/redux/store/store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    DEMO_TOUR_ENABLED,
    DEMO_TOUR_STEPS,
    DEMO_TOUR_STORAGE_KEY,
    DEMO_TOUR_RESTART_EVENT,
} from '@/data/demo-tour-steps';

/** Ritardo all'ingresso: la home deve avere il tempo di disegnarsi sotto. */
const START_DELAY_MS = 900;

export function DemoTour() {
    const isDemo = useSelector((state: RootState) => state.auth.isDemo);

    /** `null` = tour chiuso. Un indice = schermata mostrata. */
    const [index, setIndex] = useState<number | null>(null);

    const enabled = DEMO_TOUR_ENABLED && isDemo;
    const isLast = index === DEMO_TOUR_STEPS.length - 1;

    const close = useCallback(() => {
        try {
            sessionStorage.setItem(DEMO_TOUR_STORAGE_KEY, '1');
        } catch {
            // sessionStorage può mancare (navigazione privata, iframe): il tour
            // si limita a ripartire al prossimo ingresso, non è un errore.
        }
        setIndex(null);
    }, []);

    // ── Avvio automatico al primo ingresso della sessione ──────────────────
    useEffect(() => {
        if (!enabled) return;
        let seen = false;
        try {
            seen = sessionStorage.getItem(DEMO_TOUR_STORAGE_KEY) === '1';
        } catch {
            seen = false;
        }
        if (seen) return;

        const timer = setTimeout(() => setIndex(0), START_DELAY_MS);
        return () => clearTimeout(timer);
    }, [enabled]);

    // ── Riavvio dalla voce di menu della barra demo ────────────────────────
    useEffect(() => {
        if (!enabled) return;
        const onRestart = () => {
            try {
                sessionStorage.removeItem(DEMO_TOUR_STORAGE_KEY);
            } catch {
                // vedi sopra: ininfluente
            }
            setIndex(0);
        };
        window.addEventListener(DEMO_TOUR_RESTART_EVENT, onRestart);
        return () => window.removeEventListener(DEMO_TOUR_RESTART_EVENT, onRestart);
    }, [enabled]);

    // ── Se il visitatore esce dalla demo, il tour se ne va con lei ─────────
    useEffect(() => {
        if (!enabled) setIndex(null);
    }, [enabled]);

    if (!enabled || index === null) return null;

    const step = DEMO_TOUR_STEPS[index];
    const Icon = step.icon;

    // L'ultima schermata chiude e restituisce l'app al visitatore, invece di
    // spedirlo alla registrazione: è appena arrivato, la demo esiste perché la
    // guardi. L'invito a creare il proprio team resta comunque a portata di
    // mano — è il pulsante fisso della barra demo, che non se ne va mai.
    const handleNext = () => {
        if (isLast) {
            close();
            return;
        }
        setIndex(index + 1);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/95 p-4 backdrop-blur-sm">
            <Card className="w-full max-w-sm border-border p-5 shadow-elevation">
                <div className="mb-1 flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                        {index + 1} di {DEMO_TOUR_STEPS.length}
                    </span>
                    <Button variant="ghost" size="sm" onClick={close} className="-mr-2 h-7 px-2 text-xs">
                        <X className="mr-1 h-3.5 w-3.5" />
                        Salta
                    </Button>
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={step.id}
                        initial={{ opacity: 0, x: 16 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -16 }}
                        transition={{ duration: 0.18 }}
                        className="text-center"
                    >
                        <div
                            className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${step.bgColor}`}
                        >
                            <Icon className={`h-7 w-7 ${step.color}`} />
                        </div>

                        <h2 className="font-display text-xl font-bold leading-tight text-foreground">
                            {step.title}
                        </h2>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                            {step.body}
                        </p>
                    </motion.div>
                </AnimatePresence>

                <div className="my-5 flex justify-center gap-1.5">
                    {DEMO_TOUR_STEPS.map((s, i) => (
                        <button
                            key={s.id}
                            onClick={() => setIndex(i)}
                            aria-label={`Vai alla schermata ${i + 1}`}
                            className={`h-1.5 rounded-full transition-all ${i === index ? 'w-5 bg-primary' : 'w-1.5 bg-muted'
                                }`}
                        />
                    ))}
                </div>

                <Button className="w-full" onClick={handleNext}>
                    {step.nextLabel ?? 'Avanti'}
                    {!isLast && <ChevronRight className="ml-1.5 h-4 w-4" />}
                </Button>
            </Card>
        </div>
    );
}

export default DemoTour;
