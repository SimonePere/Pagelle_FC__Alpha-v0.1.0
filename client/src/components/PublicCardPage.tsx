/**
 * PublicCardPage — Pagina pubblica di visualizzazione card trofeo.
 *
 * Raggiungibile a `/c/:slug` (no login richiesto). Punto d'arrivo di:
 *  - link condivisi su WhatsApp/Telegram (anteprima Open Graph)
 *  - QR code stampato sulla card stessa
 *
 * Layout mobile-first, full-bleed verticale:
 *   ┌─────────────────────────┐
 *   │   LOGO + tagline        │
 *   │   ┌──────────────┐      │
 *   │   │              │      │
 *   │   │  CARD VERA   │      │  ← PodiumCard / HeroCard, scale dinamica
 *   │   │              │      │
 *   │   └──────────────┘      │
 *   │   "Generata da TEAM X"  │
 *   │   il 16 maggio 2026     │
 *   │                         │
 *   │   [ Scarica l'app ]     │  ← CTA conversione
 *   │   App Store · Play      │
 *   │                         │
 *   │   pagellefc.app         │  ← footer
 *   └─────────────────────────┘
 *
 * Componente puramente presentazionale: riceve `state` come union discriminata
 * (loading/error/data). Il wrapper che fa fetch dal backend sarà aggiunto dopo
 * (es. usa React Query + useParams per leggere `:slug`).
 *
 * @example
 * <PublicCardPage
 *   state={{
 *     kind: 'data',
 *     card: { kind: 'PODIUM', props: MOCK_PODIUM_DATA },
 *     cardTitle: 'Il Podio della Partita · 16 maggio 2026',
 *     teamName: 'I Bomber del Sabato',
 *     generatedAt: new Date('2026-05-16'),
 *   }}
 *   appStoreUrl="https://apps.apple.com/..."
 *   playStoreUrl="https://play.google.com/..."
 * />
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PodiumCard, { type PodiumCardProps, MOCK_PODIUM_DATA } from './PodiumCard';
import HeroCard, {
    type HeroCardProps,
    MOCK_MONTHLY_MVP,
    MOCK_BALLON_DOR,
    MOCK_GOLDEN_BOOT,
} from './HeroCard';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export type PublicCardData =
    | { kind: 'PODIUM'; props: Omit<PodiumCardProps, 'scale'> }
    | { kind: 'HERO'; props: Omit<HeroCardProps, 'scale'> };

export type PublicCardState =
    | { kind: 'loading' }
    | { kind: 'error'; message?: string }
    | {
        kind: 'data';
        card: PublicCardData;
        cardTitle: string;
        teamName: string;
        generatedAt: Date;
    };

export interface PublicCardPageProps {
    state: PublicCardState;
    /** URL per il bottone App Store (placeholder consentito). */
    appStoreUrl?: string;
    /** URL per il bottone Play Store. */
    playStoreUrl?: string;
    /** Override del titolo HTML (default deriva da cardTitle). */
    documentTitle?: string;
}

const CARD_W = 1080;
const CARD_H = 1920;
const CHROME_V = 380; // header + footer area approssimativa

function useFitScale(): number {
    const [scale, setScale] = useState(() => computeScale());
    useEffect(() => {
        const onResize = () => setScale(computeScale());
        window.addEventListener('resize', onResize);
        window.addEventListener('orientationchange', onResize);
        return () => {
            window.removeEventListener('resize', onResize);
            window.removeEventListener('orientationchange', onResize);
        };
    }, []);
    return scale;
}

function computeScale(): number {
    if (typeof window === 'undefined') return 0.32;
    const availW = window.innerWidth - 48; // padding 24 per lato
    const availH = window.innerHeight - CHROME_V;
    const s = Math.min(availW / CARD_W, availH / CARD_H);
    return Math.max(0.18, Math.min(0.55, s));
}

function formatItalianDate(d: Date): string {
    return d.toLocaleDateString('it-IT', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

export function PublicCardPage({
    state,
    // appStoreUrl/playStoreUrl temporaneamente non usati: l'app native non
    // è ancora disponibile, la CTA è sostituita da "Iscriviti" → /register.
    documentTitle,
}: PublicCardPageProps) {
    // Imposta document.title + OG meta dinamicamente
    useEffect(() => {
        if (state.kind !== 'data') return;
        const title = documentTitle ?? `${state.cardTitle} · Pagelle FC`;
        document.title = title;
        setMetaTag('og:title', title);
        setMetaTag('og:type', 'website');
        setMetaTag('og:site_name', 'Pagelle FC');
        setMetaTag(
            'og:description',
            `Trofeo generato da ${state.teamName} su Pagelle FC. Vota i tuoi compagni e crea i tuoi trofei!`,
        );
        setMetaTag('twitter:card', 'summary_large_image');
    }, [state, documentTitle]);

    return (
        <div
            className={cn(
                'min-h-[100dvh] w-full',
                'bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white',
                'flex flex-col',
            )}
        >
            {/* Header con logo PAGELLE FC + tagline AWARDS */}
            <header className="flex-shrink-0 px-6 pt-6 pb-3 flex flex-col items-center gap-2">
                <img
                    src="/FLAT_BG_TRAS.png"
                    alt="Pagelle FC"
                    className="w-14 h-14 object-contain drop-shadow-md"
                />
                <span
                    className="text-[11px] font-bold tracking-[0.35em] text-yellow-400/90 uppercase border border-yellow-400/40 rounded px-2.5 py-1 bg-yellow-400/5"
                    style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.35em' }}
                >
                    Pagelle FC · Awards
                </span>
            </header>

            {/* Body: stato */}
            <main className="flex-1 flex flex-col items-center justify-center px-4 py-4">
                {state.kind === 'loading' && <LoadingState />}
                {state.kind === 'error' && <ErrorState message={state.message} />}
                {state.kind === 'data' && <DataState state={state} />}
            </main>

            {/* CTA Iscriviti — visibile sempre tranne in error.
                NOTA: App Store / Google Play commentati finché le app native non
                sono pubblicate; in produzione svelare i bottoni e rimuovere CTA web. */}
            {state.kind !== 'error' && (
                <section className="flex-shrink-0 px-6 py-6 space-y-3 border-t border-white/10 bg-black/30">
                    <p className="text-center text-sm text-white/70 font-medium">
                        Anche tu vuoi creare i trofei della tua squadra?
                    </p>
                    <div className="flex items-center justify-center">
                        <Link
                            to="/login"
                            className={cn(
                                'inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl',
                                'bg-gradient-to-r from-yellow-400 to-orange-500 text-slate-900 font-bold text-sm',
                                'shadow-lg shadow-yellow-500/20',
                                'transition-transform hover:scale-[1.03] active:scale-95',
                            )}
                        >
                            Iscriviti su Pagelle FC
                        </Link>
                    </div>
                    {/* TODO: quando le app sono live, ripristinare i bottoni store qui sotto
                    <div className="flex items-center justify-center gap-2">
                        <a href={appStoreUrl} target="_blank" rel="noopener noreferrer"
                           className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-slate-900 font-semibold text-sm">
                            <Apple className="w-5 h-5" />
                            <div className="flex flex-col items-start leading-tight">
                                <span className="text-[10px] text-slate-600">Scarica su</span>
                                <span>App Store</span>
                            </div>
                        </a>
                        <a href={playStoreUrl} target="_blank" rel="noopener noreferrer"
                           className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-slate-900 font-semibold text-sm">
                            <Play className="w-5 h-5 fill-current" />
                            <div className="flex flex-col items-start leading-tight">
                                <span className="text-[10px] text-slate-600">Disponibile su</span>
                                <span>Google Play</span>
                            </div>
                        </a>
                    </div>
                    */}
                </section>
            )}

            {/* Footer */}
            <footer className="flex-shrink-0 py-3 text-center text-[11px] text-white/40">
                <a
                    href="https://pagellefc.app"
                    className="hover:text-white/70 transition-colors"
                >
                    pagellefc.app
                </a>
                <span className="mx-2">·</span>
                <a
                    href="/privacy"
                    className="hover:text-white/70 transition-colors"
                >
                    Privacy
                </a>
            </footer>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-stati
// ─────────────────────────────────────────────────────────────────────────────

function DataState({
    state,
}: {
    state: Extract<PublicCardState, { kind: 'data' }>;
}) {
    const scale = useFitScale();
    return (
        <div className="flex flex-col items-center gap-4 w-full">
            {state.card.kind === 'PODIUM' ? (
                <PodiumCard {...state.card.props} scale={scale} />
            ) : (
                <HeroCard {...state.card.props} scale={scale} />
            )}
            <div className="text-center space-y-0.5">
                <p className="text-sm font-semibold text-white/90">
                    Generata da <span className="text-yellow-400">{state.teamName}</span>
                </p>
                <p className="text-xs text-white/50">
                    il {formatItalianDate(state.generatedAt)}
                </p>
            </div>
        </div>
    );
}

function LoadingState() {
    return (
        <div className="flex flex-col items-center gap-4 w-full">
            <Skeleton className="w-[280px] h-[498px] rounded-2xl bg-white/5" />
            <Skeleton className="h-4 w-48 bg-white/5" />
            <Skeleton className="h-3 w-32 bg-white/5" />
        </div>
    );
}

function ErrorState({ message }: { message?: string }) {
    return (
        <div className="flex flex-col items-center text-center gap-4 max-w-sm px-6 py-12">
            <div className="text-6xl">🔍</div>
            <h1
                className="text-3xl font-extrabold"
                style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 1 }}
            >
                TROFEO NON TROVATO
            </h1>
            <p className="text-sm text-white/60">
                {message ??
                    'Il link che hai usato non è più valido o la card è stata rimossa dal proprietario.'}
            </p>
            <a
                href="https://pagellefc.app"
                className="mt-2 px-5 py-2.5 rounded-full bg-white text-slate-900 font-semibold text-sm hover:bg-white/90 transition-colors"
            >
                Vai al sito
            </a>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Utils
// ─────────────────────────────────────────────────────────────────────────────

function setMetaTag(property: string, content: string) {
    if (typeof document === 'undefined') return;
    const isOg = property.startsWith('og:') || property.startsWith('twitter:');
    const attr = isOg ? 'property' : 'name';
    let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${property}"]`);
    if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, property);
        document.head.appendChild(el);
    }
    el.setAttribute('content', content);
}

export default PublicCardPage;

// ─────────────────────────────────────────────────────────────────────────────
// MOCK STATES — per la test page
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_PUBLIC_PODIUM: PublicCardState = {
    kind: 'data',
    card: { kind: 'PODIUM', props: MOCK_PODIUM_DATA },
    cardTitle: 'Il Podio della Partita · 16 maggio 2026',
    teamName: 'I Bomber del Sabato',
    generatedAt: new Date('2026-05-16'),
};

export const MOCK_PUBLIC_MVP: PublicCardState = {
    kind: 'data',
    card: { kind: 'HERO', props: MOCK_MONTHLY_MVP },
    cardTitle: 'MVP del Mese · MARCO · Maggio 2026',
    teamName: 'I Bomber del Sabato',
    generatedAt: new Date('2026-06-01'),
};

export const MOCK_PUBLIC_BALLON: PublicCardState = {
    kind: 'data',
    card: { kind: 'HERO', props: MOCK_BALLON_DOR },
    cardTitle: "Pallone d'Oro · LUCA · Stagione 2025/26",
    teamName: 'I Bomber del Sabato',
    generatedAt: new Date('2026-06-15'),
};

export const MOCK_PUBLIC_BOOT: PublicCardState = {
    kind: 'data',
    card: { kind: 'HERO', props: MOCK_GOLDEN_BOOT },
    cardTitle: "Scarpa d'Oro · GIULIA · Stagione 2025/26",
    teamName: 'I Bomber del Sabato',
    generatedAt: new Date('2026-06-15'),
};

export const MOCK_PUBLIC_LOADING: PublicCardState = { kind: 'loading' };
export const MOCK_PUBLIC_ERROR: PublicCardState = {
    kind: 'error',
    message: 'Questo trofeo non esiste più o il link è scaduto.',
};
