/**
 * BachecaAwards — Sezione "Bacheca Trofei" per la pagina Team.
 *
 * Mostra tutti i trofei della squadra in una griglia responsive di
 * `AwardCardThumbnail`, con filtri per tipo e per anno. Click su una thumb
 * apre `AwardCardModal` (gestito internamente).
 *
 * Pattern dati: tutto presentazionale, riceve la lista award via props.
 * Fetch e mutation sono delegati al chiamante (es. pagina Team che usa
 * Redux/React-Query per popolare `awards`).
 *
 * @example
 * <BachecaAwards
 *   awards={awards}
 *   loading={isLoading}
 *   onMarkSeen={(id) => api.markSeen(id)}
 *   onShareWhatsApp={(a) => window.open(`https://wa.me/?text=${a.shareUrl}`)}
 *   onCopyLink={(a) => navigator.clipboard.writeText(a.shareUrl)}
 * />
 */
import { useMemo, useState } from 'react';
import { Trophy } from 'lucide-react';
import AwardCardThumbnail, {
    type AwardType,
    type AwardCardThumbnailProps,
} from './AwardCardThumbnail';
import AwardCardModal, { type AwardModalCard } from './AwardCardModal';
import PaginatedSwiper from './PaginatedSwiper';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * Item completo per la bacheca: include sia i dati per la thumbnail
 * sia quelli per la modale che si apre al click.
 */
export interface AwardItem
    extends Omit<AwardCardThumbnailProps, 'onClick' | 'size'> {
    id: string;
    /** Anno usato per il filtro periodo (es. 2026). */
    year: number;
    /** Dati per il modal grande. */
    modalCard: AwardModalCard;
    cardTitle: string;
    shareUrl: string;
    previewImageUrl?: string;
}

type FilterType = 'ALL' | 'MATCH_RECAP' | 'MONTHLY_MVP' | 'SEASONAL';

export interface BachecaAwardsProps {
    awards: AwardItem[];
    loading?: boolean;
    /** Titolo della sezione (default "Bacheca Trofei"). */
    title?: string;
    /** Dimensione delle thumbnail (default 'medium'). 'small' = più compatte, ideali su mobile. */
    size?: 'small' | 'medium';
    /** Quanti trofei per pagina (default 8). Se 0 o omesso ≥ items.length → niente paginazione. */
    pageSize?: number;
    /** Chiamato quando l'utente apre la modale di un award (per marcare "visto"). */
    onMarkSeen?: (awardId: string) => void;
    // Callback share — ricevono l'AwardItem corrente.
    onShareWhatsApp?: (a: AwardItem) => void;
    onShareInstagram?: (a: AwardItem) => void;
    onShareTelegram?: (a: AwardItem) => void;
    onCopyLink?: (a: AwardItem) => void;
    onDownloadImage?: (a: AwardItem) => void;
}

const FILTER_LABELS: Record<FilterType, string> = {
    ALL: 'Tutti',
    MATCH_RECAP: 'Partite',
    MONTHLY_MVP: 'MVP Mese',
    SEASONAL: 'Stagionali',
};

function matchesTypeFilter(award: AwardItem, filter: FilterType): boolean {
    if (filter === 'ALL') return true;
    if (filter === 'SEASONAL')
        return award.type === 'BALLON_DOR' || award.type === 'GOLDEN_BOOT';
    return award.type === (filter as AwardType);
}

export function BachecaAwards({
    awards,
    loading = false,
    title = 'Bacheca Trofei',
    size = 'medium',
    pageSize = 8,
    onMarkSeen,
    onShareWhatsApp,
    onShareInstagram,
    onShareTelegram,
    onCopyLink,
    onDownloadImage,
}: BachecaAwardsProps) {
    const [typeFilter, setTypeFilter] = useState<FilterType>('ALL');
    const [yearFilter, setYearFilter] = useState<number | 'ALL'>('ALL');
    const [openAward, setOpenAward] = useState<AwardItem | null>(null);

    /** Anni disponibili (derivati da awards, ordinati desc). */
    const years = useMemo(() => {
        const set = new Set(awards.map((a) => a.year));
        return Array.from(set).sort((a, b) => b - a);
    }, [awards]);

    /** Award filtrati per tipo + anno. */
    const filtered = useMemo(() => {
        return awards.filter(
            (a) =>
                matchesTypeFilter(a, typeFilter) &&
                (yearFilter === 'ALL' || a.year === yearFilter),
        );
    }, [awards, typeFilter, yearFilter]);

    /** Contatore "nuovi" per badge sui filtri. */
    const newCount = useMemo(
        () => awards.filter((a) => a.isNew).length,
        [awards],
    );

    const handleOpen = (a: AwardItem) => {
        setOpenAward(a);
        if (a.isNew) onMarkSeen?.(a.id);
    };

    return (
        <section className="space-y-5">
            {/* Header sezione */}
            <header className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center shadow-md">
                        <Trophy className="w-5 h-5 text-white" strokeWidth={2.4} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-foreground leading-tight">
                            {title}
                        </h2>
                        <p className="text-xs text-muted-foreground">
                            {loading
                                ? 'Caricamento…'
                                : `${awards.length} trofei totali${newCount > 0 ? ` · ${newCount} nuovi` : ''}`}
                        </p>
                    </div>
                </div>
            </header>

            {/* Filtri */}
            {!loading && awards.length > 0 && (
                <div className="space-y-2.5">
                    {/* Filtro tipo */}
                    <div className="flex flex-wrap gap-2">
                        {(Object.keys(FILTER_LABELS) as FilterType[]).map((f) => (
                            <Button
                                key={f}
                                size="sm"
                                variant={typeFilter === f ? 'default' : 'outline'}
                                onClick={() => setTypeFilter(f)}
                                className="h-8 text-xs"
                            >
                                {FILTER_LABELS[f]}
                            </Button>
                        ))}
                    </div>

                    {/* Filtro anno — solo se ci sono più anni */}
                    {years.length > 1 && (
                        <div className="flex flex-wrap gap-2 items-center">
                            <span className="text-xs text-muted-foreground mr-1">Anno:</span>
                            <Button
                                size="sm"
                                variant={yearFilter === 'ALL' ? 'secondary' : 'ghost'}
                                onClick={() => setYearFilter('ALL')}
                                className="h-7 text-xs px-3"
                            >
                                Tutti
                            </Button>
                            {years.map((y) => (
                                <Button
                                    key={y}
                                    size="sm"
                                    variant={yearFilter === y ? 'secondary' : 'ghost'}
                                    onClick={() => setYearFilter(y)}
                                    className="h-7 text-xs px-3"
                                >
                                    {y}
                                </Button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Griglia / loading / vuoto */}
            {loading ? (
                <BachecaSkeleton />
            ) : filtered.length === 0 ? (
                <EmptyState hasAnyAward={awards.length > 0} />
            ) : (
                <PaginatedSwiper
                    items={filtered}
                    pageSize={pageSize > 0 ? pageSize : filtered.length}
                    renderPage={(pageItems) => (
                        <div
                            className={cn(
                                'grid gap-3',
                                // 2 col mobile · 3 col sm · 4 col md · 5 col lg
                                'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
                                'justify-items-center',
                            )}
                        >
                            {pageItems.map((a) => (
                                <AwardCardThumbnail
                                    key={a.id}
                                    thumbUrl={a.thumbUrl}
                                    typeLabel={a.typeLabel}
                                    type={a.type}
                                    dateLabel={a.dateLabel}
                                    isNew={a.isNew}
                                    size={size}
                                    onClick={() => handleOpen(a)}
                                />
                            ))}
                        </div>
                    )}
                />
            )}

            {/* Modal */}
            {openAward && (
                <AwardCardModal
                    open={openAward !== null}
                    onOpenChange={(o) => {
                        if (!o) setOpenAward(null);
                    }}
                    card={openAward.modalCard}
                    cardTitle={openAward.cardTitle}
                    shareUrl={openAward.shareUrl}
                    previewImageUrl={openAward.previewImageUrl}
                    onShareWhatsApp={
                        onShareWhatsApp ? () => onShareWhatsApp(openAward) : undefined
                    }
                    onShareInstagram={
                        onShareInstagram ? () => onShareInstagram(openAward) : undefined
                    }
                    onShareTelegram={
                        onShareTelegram ? () => onShareTelegram(openAward) : undefined
                    }
                    onCopyLink={onCopyLink ? () => onCopyLink(openAward) : undefined}
                    onDownloadImage={
                        onDownloadImage ? () => onDownloadImage(openAward) : undefined
                    }
                />
            )}
        </section>
    );
}

function BachecaSkeleton() {
    return (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 justify-items-center">
            {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton
                    key={`bacheca-skel-${i}`}
                    className="w-[200px] h-[355px] rounded-xl"
                />
            ))}
        </div>
    );
}

function EmptyState({ hasAnyAward }: { hasAnyAward: boolean }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center rounded-xl border border-dashed border-border bg-card/30">
            <div className="text-5xl mb-3">🏆</div>
            <h3 className="font-semibold text-foreground mb-1">
                {hasAnyAward ? 'Nessun trofeo con questi filtri' : 'Nessun trofeo ancora'}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
                {hasAnyAward
                    ? 'Prova a cambiare tipo o anno per vedere altri trofei.'
                    : 'Quando giocherete la prima partita e completerete i voti, qui apparirà la card «Il Podio della Partita».'}
            </p>
        </div>
    );
}

export default BachecaAwards;

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA — utile per la test page
// ─────────────────────────────────────────────────────────────────────────────

import { MOCK_PODIUM_DATA } from './PodiumCard';
import {
    MOCK_MONTHLY_MVP,
    MOCK_BALLON_DOR,
    MOCK_GOLDEN_BOOT,
} from './HeroCard';

export const MOCK_BACHECA_AWARDS: AwardItem[] = [
    // 2026 — nuovi
    {
        id: 'a1',
        type: 'MATCH_RECAP',
        typeLabel: 'Recap',
        dateLabel: '16 Mag',
        year: 2026,
        isNew: true,
        thumbUrl: 'https://via.placeholder.com/240x426/1a237e/ffffff?text=Recap+16+Mag',
        modalCard: { kind: 'PODIUM', props: MOCK_PODIUM_DATA },
        cardTitle: 'Il Podio della Partita · 16 maggio 2026',
        shareUrl: 'https://pagellefc.app/c/recap-16mag26',
        previewImageUrl: 'https://via.placeholder.com/240x426/1a237e/ffffff?text=Recap',
    },
    {
        id: 'a2',
        type: 'MONTHLY_MVP',
        typeLabel: 'MVP Mese',
        dateLabel: 'Mag 2026',
        year: 2026,
        isNew: true,
        thumbUrl: 'https://via.placeholder.com/240x426/4a148c/ffffff?text=MVP+Mag',
        modalCard: { kind: 'HERO', props: MOCK_MONTHLY_MVP },
        cardTitle: 'MVP del Mese · MARCO · Maggio 2026',
        shareUrl: 'https://pagellefc.app/c/mvp-marco-mag26',
        previewImageUrl: 'https://via.placeholder.com/240x426/4a148c/ffffff?text=MVP',
    },
    {
        id: 'a3',
        type: 'MATCH_RECAP',
        typeLabel: 'Recap',
        dateLabel: '9 Mag',
        year: 2026,
        thumbUrl: 'https://via.placeholder.com/240x426/0d47a1/ffffff?text=Recap+9+Mag',
        modalCard: { kind: 'PODIUM', props: MOCK_PODIUM_DATA },
        cardTitle: 'Il Podio della Partita · 9 maggio 2026',
        shareUrl: 'https://pagellefc.app/c/recap-9mag26',
        previewImageUrl: 'https://via.placeholder.com/240x426/0d47a1/ffffff?text=Recap',
    },
    {
        id: 'a4',
        type: 'MONTHLY_MVP',
        typeLabel: 'MVP Mese',
        dateLabel: 'Apr 2026',
        year: 2026,
        thumbUrl: 'https://via.placeholder.com/240x426/6a1b9a/ffffff?text=MVP+Apr',
        modalCard: { kind: 'HERO', props: MOCK_MONTHLY_MVP },
        cardTitle: 'MVP del Mese · LUCA · Aprile 2026',
        shareUrl: 'https://pagellefc.app/c/mvp-luca-apr26',
        previewImageUrl: 'https://via.placeholder.com/240x426/6a1b9a/ffffff?text=MVP',
    },
    {
        id: 'a5',
        type: 'MATCH_RECAP',
        typeLabel: 'Recap',
        dateLabel: '2 Mag',
        year: 2026,
        thumbUrl: 'https://via.placeholder.com/240x426/1565c0/ffffff?text=Recap+2+Mag',
        modalCard: { kind: 'PODIUM', props: MOCK_PODIUM_DATA },
        cardTitle: 'Il Podio della Partita · 2 maggio 2026',
        shareUrl: 'https://pagellefc.app/c/recap-2mag26',
        previewImageUrl: 'https://via.placeholder.com/240x426/1565c0/ffffff?text=Recap',
    },
    // 2025/26 — stagionali
    {
        id: 'a6',
        type: 'BALLON_DOR',
        typeLabel: "Pallone d'Oro",
        dateLabel: '2025/26',
        year: 2026,
        isNew: true,
        thumbUrl: 'https://via.placeholder.com/240x426/b8860b/ffffff?text=Ballon+25/26',
        modalCard: { kind: 'HERO', props: MOCK_BALLON_DOR },
        cardTitle: "Pallone d'Oro · LUCA · Stagione 2025/26",
        shareUrl: 'https://pagellefc.app/c/ballon-luca-2526',
        previewImageUrl: 'https://via.placeholder.com/240x426/b8860b/ffffff?text=Ballon',
    },
    {
        id: 'a7',
        type: 'GOLDEN_BOOT',
        typeLabel: "Scarpa d'Oro",
        dateLabel: '2025/26',
        year: 2026,
        thumbUrl: 'https://via.placeholder.com/240x426/d84315/ffffff?text=Boot+25/26',
        modalCard: { kind: 'HERO', props: MOCK_GOLDEN_BOOT },
        cardTitle: "Scarpa d'Oro · GIULIA · Stagione 2025/26",
        shareUrl: 'https://pagellefc.app/c/boot-giulia-2526',
        previewImageUrl: 'https://via.placeholder.com/240x426/d84315/ffffff?text=Boot',
    },
    // 2025 — archivio
    {
        id: 'a8',
        type: 'MONTHLY_MVP',
        typeLabel: 'MVP Mese',
        dateLabel: 'Dic 2025',
        year: 2025,
        thumbUrl: 'https://via.placeholder.com/240x426/512da8/ffffff?text=MVP+Dic25',
        modalCard: { kind: 'HERO', props: MOCK_MONTHLY_MVP },
        cardTitle: 'MVP del Mese · MARCO · Dicembre 2025',
        shareUrl: 'https://pagellefc.app/c/mvp-marco-dic25',
        previewImageUrl: 'https://via.placeholder.com/240x426/512da8/ffffff?text=MVP',
    },
    {
        id: 'a9',
        type: 'BALLON_DOR',
        typeLabel: "Pallone d'Oro",
        dateLabel: '2024/25',
        year: 2025,
        thumbUrl: 'https://via.placeholder.com/240x426/a67c00/ffffff?text=Ballon+24/25',
        modalCard: { kind: 'HERO', props: MOCK_BALLON_DOR },
        cardTitle: "Pallone d'Oro · MARCO · Stagione 2024/25",
        shareUrl: 'https://pagellefc.app/c/ballon-marco-2425',
        previewImageUrl: 'https://via.placeholder.com/240x426/a67c00/ffffff?text=Ballon',
    },
];
