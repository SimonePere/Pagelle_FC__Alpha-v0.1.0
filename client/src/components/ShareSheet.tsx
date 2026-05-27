/**
 * ShareSheet — Bottom-sheet di condivisione per le card trofeo.
 *
 * Pannello mobile-first (drag-to-close) che mostra:
 *  - preview della card (thumb 80×142) + titolo + dominio
 *  - grid 4 pulsanti "social" (WhatsApp · Instagram · Telegram · Copia link)
 *  - pulsante secondario "Scarica immagine"
 *
 * Tutta la logica è callback-based: il componente è puramente presentazionale.
 * Se un callback non viene passato, il relativo pulsante non viene renderizzato
 * (es. pagina pubblica senza permessi di download).
 *
 * @example
 * <ShareSheet
 *   open={open}
 *   onOpenChange={setOpen}
 *   shareUrl="https://pagellefc.app/c/abc123"
 *   previewImageUrl="https://cdn.pagellefc.app/cards/abc123.png"
 *   cardTitle="MVP del Mese — MARCO"
 *   onShareWhatsApp={() => window.open(`https://wa.me/?text=${encodeURIComponent(url)}`)}
 *   onCopyLink={() => navigator.clipboard.writeText(url)}
 *   onDownloadImage={() => downloadPng(url)}
 * />
 */
import { Copy, Download, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerHeader,
    DrawerTitle,
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';

export interface ShareSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    shareUrl: string;
    previewImageUrl?: string;
    cardTitle: string;
    /** Se passato, mostra pulsante WhatsApp. */
    onShareWhatsApp?: () => void;
    /** Se passato, mostra pulsante Instagram Stories. */
    onShareInstagram?: () => void;
    /** Se passato, mostra pulsante Telegram. */
    onShareTelegram?: () => void;
    /** Se passato, mostra pulsante Copia link. Il toast "Link copiato" è gestito qui. */
    onCopyLink?: () => void;
    /** Se passato, mostra pulsante Scarica immagine. */
    onDownloadImage?: () => void;
}

interface ShareButtonProps {
    label: string;
    icon: React.ReactNode;
    /** Classi tailwind per gradient/bg del cerchio icona. */
    iconBgClass: string;
    onClick: () => void;
}

function ShareButton({ label, icon, iconBgClass, onClick }: ShareButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'group flex flex-col items-center gap-2 py-2 px-1 rounded-xl',
                'transition-all duration-150 ease-out',
                'hover:bg-muted/60 active:scale-95',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
            )}
            aria-label={`Condividi su ${label}`}
        >
            <span
                className={cn(
                    'flex items-center justify-center w-14 h-14 rounded-full text-white shadow-md',
                    'transition-transform duration-150 group-hover:scale-110',
                    iconBgClass,
                )}
            >
                {icon}
            </span>
            <span className="text-xs font-medium text-foreground">{label}</span>
        </button>
    );
}

// SVG mini brand-icons (24×24, currentColor). Niente dipendenze extra.
const WhatsAppIcon = () => (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413" />
    </svg>
);

const InstagramIcon = () => (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919C8.416 2.175 8.796 2.163 12 2.163m0-2.163C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0m0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324M12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8m6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881" />
    </svg>
);

const TelegramIcon = () => (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0m4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
);

export function ShareSheet({
    open,
    onOpenChange,
    shareUrl,
    previewImageUrl,
    cardTitle,
    onShareWhatsApp,
    onShareInstagram,
    onShareTelegram,
    onCopyLink,
    onDownloadImage,
}: ShareSheetProps) {
    const domain = (() => {
        try {
            return new URL(shareUrl).hostname.replace(/^www\./, '');
        } catch {
            return shareUrl;
        }
    })();

    const handleCopy = () => {
        onCopyLink?.();
        toast.success('Link copiato negli appunti');
    };

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent className="max-h-[88vh]">
                <div className="mx-auto w-full max-w-md">
                    <DrawerHeader className="pb-2">
                        <DrawerTitle className="text-lg">Condividi card</DrawerTitle>
                        <DrawerDescription className="sr-only">
                            Scegli dove condividere il tuo trofeo Pagelle FC
                        </DrawerDescription>
                    </DrawerHeader>

                    {/* Preview card + titolo */}
                    <div className="px-4 pb-4 flex items-center gap-3">
                        <div className="relative flex-shrink-0 w-[80px] h-[142px] rounded-lg overflow-hidden bg-muted border border-border shadow-sm">
                            {previewImageUrl ? (
                                <img
                                    src={previewImageUrl}
                                    alt=""
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-900">
                                    <Trophy className="w-7 h-7 text-yellow-400" />
                                </div>
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="font-semibold text-sm text-foreground line-clamp-2 leading-tight">
                                {cardTitle}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                                {domain}
                            </p>
                        </div>
                    </div>

                    <div className="h-px bg-border mx-4" />

                    {/* Grid social buttons */}
                    <div className="px-2 py-4">
                        <div className="grid grid-cols-4 gap-1">
                            {onShareWhatsApp && (
                                <ShareButton
                                    label="WhatsApp"
                                    icon={<WhatsAppIcon />}
                                    iconBgClass="bg-[#25D366]"
                                    onClick={onShareWhatsApp}
                                />
                            )}
                            {onShareInstagram && (
                                <ShareButton
                                    label="Instagram"
                                    icon={<InstagramIcon />}
                                    iconBgClass="bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]"
                                    onClick={onShareInstagram}
                                />
                            )}
                            {onShareTelegram && (
                                <ShareButton
                                    label="Telegram"
                                    icon={<TelegramIcon />}
                                    iconBgClass="bg-[#2AABEE]"
                                    onClick={onShareTelegram}
                                />
                            )}
                            {onCopyLink && (
                                <ShareButton
                                    label="Copia link"
                                    icon={<Copy className="w-6 h-6" strokeWidth={2.2} />}
                                    iconBgClass="bg-slate-600 dark:bg-slate-500"
                                    onClick={handleCopy}
                                />
                            )}
                        </div>
                    </div>

                    {/* Footer download */}
                    {onDownloadImage && (
                        <>
                            <div className="h-px bg-border mx-4" />
                            <div className="p-4 pb-6">
                                <button
                                    type="button"
                                    onClick={onDownloadImage}
                                    className={cn(
                                        'w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl',
                                        'bg-primary text-primary-foreground font-semibold text-sm',
                                        'transition-all duration-150 hover:opacity-90 active:scale-[0.98]',
                                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                                    )}
                                >
                                    <Download className="w-5 h-5" strokeWidth={2.2} />
                                    Scarica immagine
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </DrawerContent>
        </Drawer>
    );
}

export default ShareSheet;

export const MOCK_SHARE_PROPS: Omit<ShareSheetProps, 'open' | 'onOpenChange'> = {
    shareUrl: 'https://pagellefc.app/c/mvp-marco-mag26',
    previewImageUrl:
        'https://via.placeholder.com/240x426/4a148c/ffffff?text=MVP+Mese',
    cardTitle: "MVP del Mese — MARCO · Maggio 2026",
    onShareWhatsApp: () => console.log('share whatsapp'),
    onShareInstagram: () => console.log('share instagram'),
    onShareTelegram: () => console.log('share telegram'),
    onCopyLink: () => navigator.clipboard?.writeText('https://pagellefc.app/c/mvp-marco-mag26'),
    onDownloadImage: () => console.log('download image'),
};
