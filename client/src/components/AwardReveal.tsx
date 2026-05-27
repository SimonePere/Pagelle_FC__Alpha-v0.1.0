/**
 * AwardReveal — Animazione cerimoniale "Spotify Wrapped" per rivelare un trofeo.
 *
 * Durata totale: ~6s (skippabile in qualsiasi momento).
 * Fasi:
 *   0-3.5s  → Schermo nero + countdown 3-2-1 con suoni drammatici (Bebas Neue gigante)
 *   3.5s    → Card scale 0→1 con burst confetti + ROAR da stadio (ovazione)
 *   3.5-5.5s  → Card visibile con glow pulse + confetti laterali
 *   5.5-6s   → Appare CTA "Condividi" / "Chiudi"
 *   
 * Controlli: Skippabile in qualsiasi momento (X, click outside).
 * Non si chiude automaticamente — solo manuale.
 *
 * Pattern: controlled mount/unmount. Il componente renderizza solo se `open=true`.
 * Quando l'animazione termina (o viene skippata) chiama `onComplete`.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { X, Share2 } from 'lucide-react';

// ─── Audio helpers ───────────────────────────────────────────────────────────

function playSound(frequency: number, duration: number, volume: number = 0.3) {
    try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        gain.gain.setValueAtTime(volume, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration / 1000);
    } catch (e) {
        // Audio context non disponibile, ignora
    }
}

function playStadiumRoar() {
    // "Ovazione da stadio" — white noise + bass roar
    try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const now = audioContext.currentTime;
        const duration = 0.8; // 800ms roar

        // 1. White noise buffer (effetto roar)
        const bufferSize = audioContext.sampleRate * duration;
        const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noiseSource = audioContext.createBufferSource();
        noiseSource.buffer = buffer;

        // 2. High-pass filter noise (stadio è rumore filtrato)
        const filter = audioContext.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 800;
        filter.Q.value = 2;

        // 3. Bass roar (100Hz sine per effetto profondo)
        const bassOsc = audioContext.createOscillator();
        bassOsc.frequency.value = 100;
        bassOsc.type = 'sine';

        // 4. Gain nodes
        const noiseGain = audioContext.createGain();
        const bassGain = audioContext.createGain();
        const masterGain = audioContext.createGain();

        // Connessioni
        noiseSource.connect(filter);
        filter.connect(noiseGain);
        bassOsc.connect(bassGain);
        noiseGain.connect(masterGain);
        bassGain.connect(masterGain);
        masterGain.connect(audioContext.destination);

        // Envelope (fade in/out)
        noiseGain.gain.setValueAtTime(0.25, now);
        bassGain.gain.setValueAtTime(0.15, now);
        masterGain.gain.setValueAtTime(0.35, now);
        masterGain.gain.exponentialRampToValueAtTime(0.01, now + duration);

        // Play
        noiseSource.start(now);
        noiseSource.stop(now + duration);
        bassOsc.start(now);
        bassOsc.stop(now + duration);
    } catch (e) {
        // Audio context non disponibile
    }
}

function playRevealFanfare() {
    // Fanfara breve ed elegante per il reveal (volumi discreti)
    try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const now = audioContext.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
        const noteDuration = 120; // ms per nota

        notes.forEach((freq, i) => {
            const startTime = now + (i * noteDuration) / 1000;
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.type = 'triangle';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.18, startTime);
            gain.gain.exponentialRampToValueAtTime(0.02, startTime + noteDuration / 1000);
            osc.start(startTime);
            osc.stop(startTime + noteDuration / 1000);
        });
    } catch (e) {
        // Audio context non disponibile, ignora
    }
}
import PodiumCard from './PodiumCard';
import HeroCard from './HeroCard';
import { type AwardModalCard } from './AwardCardModal';
import { MOCK_PODIUM_DATA } from './PodiumCard';
import { MOCK_MONTHLY_MVP, MOCK_BALLON_DOR } from './HeroCard';
import { cn } from '@/lib/utils';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface AwardRevealProps {
    open: boolean;
    /** Chiamato al termine dell'animazione o skip. */
    onComplete: () => void;
    /** Cliccato su "Condividi" durante il reveal. */
    onShareClick?: () => void;
    /** Dati della card da rivelare. */
    card: AwardModalCard;
    /** Nome del protagonista (personalizza il countdown, es. "MARCO, sei tu!"). */
    heroName?: string;
}

// ─── Costanti timing ─────────────────────────────────────────────────────────

const COUNTDOWN_DURATION = 3500; // ms per fase countdown (3-2-1) — suspenseful
const CARD_REVEAL_DELAY = 3500; // ms prima che appaia la card
const CTA_DELAY = 5500; // ms prima che appaiano i bottoni

// ─── Confetti helpers ────────────────────────────────────────────────────────

function fireConfettiBurst(angle: number, origin: { x: number; y: number }) {
    confetti({
        particleCount: 80,
        angle,
        spread: 55,
        origin,
        colors: ['#FFD700', '#FF6B00', '#7C3AED', '#06B6D4', '#FFFFFF'],
        gravity: 0.8,
        ticks: 200,
        disableForReducedMotion: true,
    });
}

function fireRevealConfetti() {
    // Burst centrale
    confetti({
        particleCount: 120,
        spread: 100,
        origin: { x: 0.5, y: 0.5 },
        colors: ['#FFD700', '#FF6B00', '#7C3AED', '#06B6D4', '#FFFFFF'],
        startVelocity: 35,
        gravity: 0.7,
        ticks: 250,
        disableForReducedMotion: true,
    });

    // Burst laterali con delay
    setTimeout(() => {
        fireConfettiBurst(60, { x: 0.1, y: 0.6 });
        fireConfettiBurst(120, { x: 0.9, y: 0.6 });
    }, 400);

    setTimeout(() => {
        fireConfettiBurst(80, { x: 0.3, y: 0.7 });
        fireConfettiBurst(100, { x: 0.7, y: 0.7 });
    }, 900);
}

// ─── Card renderer ───────────────────────────────────────────────────────────

function RevealCardContent({ card, scale }: { card: AwardModalCard; scale: number }) {
    if (card.kind === 'PODIUM') {
        return <PodiumCard {...card.props} scale={scale} />;
    }
    return <HeroCard {...card.props} scale={scale} />;
}

// ─── Componente principale ───────────────────────────────────────────────────

export default function AwardReveal({
    open,
    onComplete,
    onShareClick,
    card,
    heroName,
}: AwardRevealProps) {
    // Fasi dell'animazione
    const [phase, setPhase] = useState<'countdown' | 'reveal' | 'cta'>('countdown');
    const [countdownNumber, setCountdownNumber] = useState(3);
    const [showCard, setShowCard] = useState(false);
    const [showCta, setShowCta] = useState(false);

    const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
    const completedRef = useRef(false);

    // Cleanup timers
    const clearTimers = useCallback(() => {
        timersRef.current.forEach(clearTimeout);
        timersRef.current = [];
    }, []);

    // Reset all on mount / open change
    useEffect(() => {
        if (!open) {
            clearTimers();
            setPhase('countdown');
            setCountdownNumber(3);
            setShowCard(false);
            setShowCta(false);
            completedRef.current = false;
            return;
        }

        completedRef.current = false;

        // Countdown 3 → 2 → 1 (suspenseful timing)
        const t1 = setTimeout(() => {
            setCountdownNumber(2);
        }, 1166);
        const t2 = setTimeout(() => {
            setCountdownNumber(1);
        }, 2333);

        // Reveal card
        const t3 = setTimeout(() => {
            playRevealFanfare();
            playStadiumRoar(); // Stadium roar in sync
            setPhase('reveal');
            setShowCard(true);
            fireRevealConfetti();
        }, CARD_REVEAL_DELAY);

        // CTA
        const t4 = setTimeout(() => {
            setPhase('cta');
            setShowCta(true);
        }, CTA_DELAY);

        timersRef.current = [t1, t2, t3, t4];

        return clearTimers;
    }, [open, onComplete, clearTimers]);

    // Skip / close handler
    const handleSkip = useCallback(() => {
        if (completedRef.current) return;
        completedRef.current = true;
        clearTimers();
        onComplete();
    }, [onComplete, clearTimers]);

    // Calcolo scala della card per adattarla allo schermo
    const cardScale = Math.min(
        (window.innerWidth - 48) / 1080,
        (window.innerHeight - 200) / 1920,
        0.35,
    );

    if (!open) return null;

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    key="award-reveal-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5, ease: 'easeInOut' }}
                    className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
                    onClick={handleSkip}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Rivelazione trofeo"
                >
                    {/* Sfondo animato */}
                    <motion.div
                        className="absolute inset-0"
                        initial={{ background: 'radial-gradient(circle, #0f0f23 0%, #000000 100%)' }}
                        animate={
                            phase === 'reveal' || phase === 'cta'
                                ? { background: 'radial-gradient(circle at 50% 40%, #1a1a3e 0%, #0a0a1a 70%, #000000 100%)' }
                                : { background: 'radial-gradient(circle, #0f0f23 0%, #000000 100%)' }
                        }
                        transition={{ duration: 0.6 }}
                    />

                    {/* Skip button — sempre visibile */}
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleSkip(); }}
                        className="absolute top-4 right-4 z-50 p-2.5 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors"
                        aria-label="Salta animazione"
                    >
                        <X className="w-5 h-5 text-white/80" />
                    </button>

                    {/* Fase 1: Countdown */}
                    <AnimatePresence mode="wait">
                        {phase === 'countdown' && (
                            <motion.div
                                key={`countdown-${countdownNumber}`}
                                initial={{ scale: 0.3, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 2, opacity: 0 }}
                                transition={{ duration: 0.4, ease: 'easeOut' }}
                                className="relative z-10 flex flex-col items-center gap-4"
                            >
                                <span className="font-display text-[120px] sm:text-[160px] font-bold text-white leading-none select-none">
                                    {countdownNumber}
                                </span>
                                {heroName && countdownNumber === 1 && (
                                    <motion.p
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-lg sm:text-xl text-white/80 font-medium tracking-wide"
                                    >
                                        {heroName}, sei tu! 🏆
                                    </motion.p>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Card reveal */}
                    <AnimatePresence>
                        {showCard && (
                            <motion.div
                                key="reveal-card"
                                initial={{ scale: 0, opacity: 0, rotate: -5 }}
                                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                exit={{ scale: 0.8, opacity: 0 }}
                                transition={{
                                    type: 'spring',
                                    stiffness: 200,
                                    damping: 20,
                                    mass: 0.8,
                                }}
                                className="relative z-10"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Glow pulsante dietro la card */}
                                <motion.div
                                    className="absolute -inset-6 sm:-inset-10 rounded-3xl opacity-60"
                                    style={{
                                        background: 'radial-gradient(ellipse, rgba(255,215,0,0.4) 0%, rgba(124,58,237,0.2) 50%, transparent 70%)',
                                    }}
                                    animate={{
                                        scale: [1, 1.05, 1],
                                        opacity: [0.4, 0.7, 0.4],
                                    }}
                                    transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                        ease: 'easeInOut',
                                    }}
                                />

                                {/* Card stessa */}
                                <div className="relative">
                                    <RevealCardContent card={card} scale={cardScale} />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Fase CTA: bottoni */}
                    <AnimatePresence>
                        {showCta && (
                            <motion.div
                                key="reveal-cta"
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: 0.1 }}
                                className="absolute bottom-12 z-20 flex items-center gap-4"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {onShareClick && (
                                    <button
                                        type="button"
                                        onClick={onShareClick}
                                        className={cn(
                                            'flex items-center gap-2 px-6 py-3 rounded-full',
                                            'bg-white text-slate-900 font-semibold text-sm',
                                            'shadow-lg hover:bg-white/90 transition-colors',
                                        )}
                                    >
                                        <Share2 className="w-4 h-4" />
                                        Condividi
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={handleSkip}
                                    className={cn(
                                        'px-5 py-3 rounded-full',
                                        'bg-white/10 backdrop-blur-sm text-white/80 font-medium text-sm',
                                        'border border-white/20 hover:bg-white/20 transition-colors',
                                    )}
                                >
                                    Chiudi
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Particelle decorative di sfondo durante reveal */}
                    {(phase === 'reveal' || phase === 'cta') && (
                        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <motion.div
                                    key={`particle-${i}`}
                                    className="absolute w-1 h-1 rounded-full bg-yellow-400/60"
                                    style={{
                                        left: `${15 + i * 14}%`,
                                        top: `${20 + (i % 3) * 25}%`,
                                    }}
                                    animate={{
                                        y: [0, -20, 0],
                                        opacity: [0.3, 0.8, 0.3],
                                        scale: [1, 1.5, 1],
                                    }}
                                    transition={{
                                        duration: 2.5 + i * 0.3,
                                        repeat: Infinity,
                                        delay: i * 0.4,
                                        ease: 'easeInOut',
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// ─── Mock data per testing ───────────────────────────────────────────────────

export const MOCK_REVEAL_PODIUM: AwardRevealProps = {
    open: true,
    onComplete: () => console.log('[mock] reveal complete'),
    onShareClick: () => console.log('[mock] share from reveal'),
    card: { kind: 'PODIUM', props: MOCK_PODIUM_DATA },
    heroName: 'Marco',
};

export const MOCK_REVEAL_MVP: AwardRevealProps = {
    open: true,
    onComplete: () => console.log('[mock] reveal complete'),
    onShareClick: () => console.log('[mock] share from reveal'),
    card: { kind: 'HERO', props: MOCK_MONTHLY_MVP },
    heroName: 'Marco',
};

export const MOCK_REVEAL_BALLON: AwardRevealProps = {
    open: true,
    onComplete: () => console.log('[mock] reveal complete'),
    onShareClick: () => console.log('[mock] share from reveal'),
    card: { kind: 'HERO', props: MOCK_BALLON_DOR },
    heroName: 'Luca',
};
