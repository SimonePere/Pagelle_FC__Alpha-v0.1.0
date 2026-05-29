/**
 * AwardCardModal — Modale fullscreen per visualizzare una card trofeo in grande.
 *
 * Pattern d'uso:
 *  - Si apre cliccando una `AwardCardThumbnail` (dalla Bacheca o dallo Storico).
 *  - Mostra la card grande (`PodiumCard` o `HeroCard`) scalata per riempire
 *    il viewport disponibile, mantenendo il rapporto verticale 9:16.
 *  - In basso due CTA: «Condividi» (apre `ShareSheet`) e «Chiudi».
 *  - La logica di share è completamente delegata via props (callback) →
 *    questo componente non sa nulla del backend.
 *
 * Lo scale della card è calcolato dinamicamente in base alla viewport:
 *   scale = min(viewportW / 1080, (viewportH - chrome) / 1920)
 * con `chrome` = altezza header (~64) + footer (~96).
 *
 * @example
 * <AwardCardModal
 *   open={open}
 *   onOpenChange={setOpen}
 *   card={{ kind: 'PODIUM', props: MOCK_PODIUM_DATA }}
 *   shareUrl="https://pagellefc.app/c/abc123"
 *   previewImageUrl="https://cdn.pagellefc.app/cards/abc123.png"
 *   cardTitle="Recap del 16 maggio"
 *   onShareWhatsApp={...}
 *   onCopyLink={...}
 * />
 */
import { useEffect, useState } from 'react';
import { Share2, X } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import PodiumCard, { type PodiumCardProps, MOCK_PODIUM_DATA } from './PodiumCard';
import HeroCard, {
    type HeroCardProps,
    MOCK_MONTHLY_MVP,
    MOCK_BALLON_DOR,
    MOCK_GOLDEN_BOOT,
} from './HeroCard';
import ShareSheet from './ShareSheet';
import { Dialog, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/** Discriminated union: forza a passare props coerenti con il tipo di card. */
export type AwardModalCard =
    | { kind: 'PODIUM'; props: Omit<PodiumCardProps, 'scale'> }
    | { kind: 'HERO'; props: Omit<HeroCardProps, 'scale'> };

export interface AwardCardModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Dati della card da renderizzare (variant + props). */
    card: AwardModalCard;
    /** Titolo mostrato nello share-sheet (es. "MVP del Mese — MARCO"). */
    cardTitle: string;
    /** URL pubblico della card per condivisione/QR. */
    shareUrl: string;
    /** PNG pre-renderizzato per anteprima share (opzionale). */
    previewImageUrl?: string;
    // Callback share — passa solo quelli che vuoi mostrare nel ShareSheet.
    onShareWhatsApp?: () => void;
    onShareInstagram?: () => void;
    onShareTelegram?: () => void;
    onCopyLink?: () => void;
    onDownloadImage?: () => void;
}

const CARD_W = 1080;
const CARD_H = 1920;
const CHROME_V = 160; // header + footer + padding verticale
const CHROME_H = 32; // padding orizzontale

/** Calcola scale ottimale per fit verticale 9:16 nel viewport. */
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
    if (typeof window === 'undefined') return 0.4;
    const availW = window.innerWidth - CHROME_H;
    const availH = window.innerHeight - CHROME_V;
    const s = Math.min(availW / CARD_W, availH / CARD_H);
    // Cap fra 0.15 e 1.0 — mai upscale oltre la dimensione nativa.
    return Math.max(0.15, Math.min(1.0, s));
}

export function AwardCardModal({
    open,
    onOpenChange,
    card,
    cardTitle,
    shareUrl,
    previewImageUrl,
    onShareWhatsApp,
    onShareInstagram,
    onShareTelegram,
    onCopyLink,
    onDownloadImage,
}: AwardCardModalProps) {
    const scale = useFitScale();
    const [shareOpen, setShareOpen] = useState(false);

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogPrimitive.Portal>
                    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
                    <DialogPrimitive.Content
                        className={cn(
                            // Fullscreen, niente X built-in (usiamo quella custom nell'header)
                            'fixed inset-0 z-50 w-screen h-[100dvh] border-0',
                            'bg-gradient-to-br from-slate-950 via-slate-900 to-black',
                            'flex flex-col',
                            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
                        )}
                    >
                        {/* Title/Description nascosti ma presenti per a11y (Radix lo richiede) */}
                        <DialogTitle className="sr-only">{cardTitle}</DialogTitle>
                        <DialogDescription className="sr-only">
                            Visualizzazione Awards. Premi Esc o tocca «Chiudi» per uscire.
                        </DialogDescription>

                        {/* Header: solo close in alto a destra */}
                        <header className="flex-shrink-0 flex items-center justify-between px-4 pt-4 pb-2 h-[64px]">
                            <span className="text-xs uppercase tracking-widest text-white/40 font-semibold">
                                Pagelle FC Awards
                            </span>
                            <button
                                type="button"
                                onClick={() => onOpenChange(false)}
                                className={cn(
                                    'flex items-center justify-center w-10 h-10 rounded-full',
                                    'bg-white/10 hover:bg-white/20 text-white transition-colors',
                                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
                                )}
                                aria-label="Chiudi"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </header>

                        {/* Card centrata, occupa lo spazio rimanente */}
                        <main className="flex-1 flex items-center justify-center px-4 overflow-hidden">
                            {card.kind === 'PODIUM' ? (
                                <PodiumCard {...card.props} scale={scale} />
                            ) : (
                                <HeroCard {...card.props} scale={scale} />
                            )}
                        </main>

                        {/* Footer: CTA share */}
                        <footer className="flex-shrink-0 px-4 pb-6 pt-2 h-[96px] flex items-center justify-center">
                            <button
                                type="button"
                                onClick={() => setShareOpen(true)}
                                className={cn(
                                    'flex items-center justify-center gap-2 px-8 py-3.5 rounded-full',
                                    'bg-white text-slate-900 font-bold text-base shadow-lg',
                                    'transition-all duration-150 hover:bg-white/90 active:scale-[0.97]',
                                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900',
                                )}
                            >
                                <Share2 className="w-5 h-5" strokeWidth={2.4} />
                                Condividi
                            </button>
                        </footer>
                    </DialogPrimitive.Content>
                </DialogPrimitive.Portal>
            </Dialog>

            {/* ShareSheet montato fuori dal Dialog per evitare focus-trap nestati problematici */}
            <ShareSheet
                open={shareOpen}
                onOpenChange={setShareOpen}
                shareUrl={shareUrl}
                previewImageUrl={previewImageUrl}
                cardTitle={cardTitle}
                onShareWhatsApp={onShareWhatsApp}
                onShareInstagram={onShareInstagram}
                onShareTelegram={onShareTelegram}
                onCopyLink={onCopyLink}
                onDownloadImage={onDownloadImage}
            />
        </>
    );
}

export default AwardCardModal;

export const MOCK_MODAL_PODIUM: Omit<AwardCardModalProps, 'open' | 'onOpenChange'> = {
    card: { kind: 'PODIUM', props: MOCK_PODIUM_DATA },
    cardTitle: 'Il Podio della Partita · 16 maggio 2026',
    shareUrl: 'https://pagellefc.app/c/recap-16mag26',
    previewImageUrl: 'https://via.placeholder.com/240x426/1a237e/ffffff?text=Recap',
    onShareWhatsApp: () => console.log('share whatsapp'),
    onShareInstagram: () => console.log('share instagram'),
    onShareTelegram: () => console.log('share telegram'),
    onCopyLink: () =>
        navigator.clipboard?.writeText('https://pagellefc.app/c/recap-16mag26'),
    onDownloadImage: () => console.log('download image'),
};

export const MOCK_MODAL_MVP: Omit<AwardCardModalProps, 'open' | 'onOpenChange'> = {
    card: { kind: 'HERO', props: MOCK_MONTHLY_MVP },
    cardTitle: 'MVP del Mese · MARCO · Maggio 2026',
    shareUrl: 'https://pagellefc.app/c/mvp-marco-mag26',
    previewImageUrl: 'https://via.placeholder.com/240x426/4a148c/ffffff?text=MVP',
    onShareWhatsApp: () => console.log('share whatsapp'),
    onShareInstagram: () => console.log('share instagram'),
    onShareTelegram: () => console.log('share telegram'),
    onCopyLink: () =>
        navigator.clipboard?.writeText('https://pagellefc.app/c/mvp-marco-mag26'),
    onDownloadImage: () => console.log('download image'),
};

export const MOCK_MODAL_BALLON: Omit<AwardCardModalProps, 'open' | 'onOpenChange'> = {
    card: { kind: 'HERO', props: MOCK_BALLON_DOR },
    cardTitle: "Pallone d'Oro · LUCA · Stagione 2025/26",
    shareUrl: 'https://pagellefc.app/c/ballon-luca-2526',
    previewImageUrl: 'https://via.placeholder.com/240x426/b8860b/ffffff?text=Ballon',
    onShareWhatsApp: () => console.log('share whatsapp'),
    onShareInstagram: () => console.log('share instagram'),
    onShareTelegram: () => console.log('share telegram'),
    onCopyLink: () =>
        navigator.clipboard?.writeText('https://pagellefc.app/c/ballon-luca-2526'),
    onDownloadImage: () => console.log('download image'),
};

export const MOCK_MODAL_BOOT: Omit<AwardCardModalProps, 'open' | 'onOpenChange'> = {
    card: { kind: 'HERO', props: MOCK_GOLDEN_BOOT },
    cardTitle: "Scarpa d'Oro · GIULIA · Stagione 2025/26",
    shareUrl: 'https://pagellefc.app/c/boot-giulia-2526',
    previewImageUrl: 'https://via.placeholder.com/240x426/d84315/ffffff?text=Boot',
    onShareWhatsApp: () => console.log('share whatsapp'),
    onShareInstagram: () => console.log('share instagram'),
    onShareTelegram: () => console.log('share telegram'),
    onCopyLink: () =>
        navigator.clipboard?.writeText('https://pagellefc.app/c/boot-giulia-2526'),
    onDownloadImage: () => console.log('download image'),
};
