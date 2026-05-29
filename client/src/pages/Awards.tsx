/**
 * Awards (Bacheca) — pagina protetta che mostra tutti i trofei del team attivo.
 *
 * Layout:
 *  - Header con titolo + count
 *  - Filtri rapidi per tipo (All / Recap / MVP Mese / Pallone d'Oro / Scarpa d'Oro)
 *  - Griglia di `AwardCardThumbnail` (responsive)
 *  - Click su thumbnail → apre `AwardCardModal` con la card grande + share
 *
 * Comportamenti chiave:
 *  - On mount + on team change: dispatch `fetchTeamAwards({teamId})`
 *  - Apertura modal: dispatch `markAwardViewed(awardId)` per rimuovere il "new" badge
 *  - Share callbacks: dispatch `trackAwardShare({awardId, channel})` + apertura intent nativo
 *  - Stato vuoto + stato loading + errore gestiti inline
 *
 * NOTA: questa pagina è il replacement di `/test-awards` (la voce sidebar
 * verrà aggiornata a `/awards`).
 */

import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Trophy, Crown, Star, Footprints, Lock, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import type { RootState } from '@/redux/store/store';
import {
    fetchTeamAwards,
    fetchPendingAwards,
    markAwardViewed,
} from '@/redux/slices/awardsSlice';
import { useActiveTeamId } from '@/hooks/useActiveTeamId';
import { useAwardShareActions } from '@/hooks/useAwardShareActions';
import AwardCardModal, { type AwardModalCard } from '@/components/AwardCardModal';
import { DashboardLayout } from '@/components/DashboardLayout';
import PaginatedSwiper from '@/components/PaginatedSwiper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
    mapAwardToCard,
    getAwardTitle,
    getAwardTypeLabel,
    getAwardDateLabel,
} from '@/utils/awardMapping';
import type { Award, AwardType } from '@/types/award';

const FILTER_OPTIONS: Array<{ value: AwardType | 'ALL'; label: string }> = [
    { value: 'ALL', label: 'Tutti' },
    { value: 'MATCH_RECAP', label: 'Recap' },
    { value: 'MONTHLY_MVP', label: 'MVP Mese' },
    { value: 'BALLON_DOR', label: "Pallone d'Oro" },
    { value: 'GOLDEN_BOOT', label: "Scarpa d'Oro" },
];

// Placeholder thumbnail per award ancora in generazione (status != READY) o senza imageThumbUrl
const FALLBACK_THUMB = '/FLAT_BG_W.png';

// Meta per icona + label + tema colore dei tipi di award.
// Il bordo/sfondo della card segue il colore della card grande corrispondente
// (Match Recap = blu podio, MVP = viola, Pallone d'Oro = giallo, Scarpa = arancio).
const AWARD_TYPE_META: Record<
    AwardType,
    {
        icon: typeof Trophy;
        label: string;
        emptyHint: string;
        // Classi Tailwind (compatibili con dark mode) — usate per bordo/sfondo/glow
        borderClass: string; // es: 'border-blue-500'
        bgClass: string;     // es: 'bg-blue-500/10'
        glowClass: string;   // box-shadow soft del colore
        iconClass: string;   // colore icona overlay
    }
> = {
    MATCH_RECAP: {
        icon: Trophy,
        label: 'Match Recap',
        emptyHint: 'Generato automaticamente dopo ogni partita',
        borderClass: 'border-blue-500',
        bgClass: 'bg-blue-500/10',
        glowClass: 'shadow-[0_0_20px_-4px_rgba(59,130,246,0.55)]',
        iconClass: 'text-blue-400',
    },
    MONTHLY_MVP: {
        icon: Star,
        label: 'MVP del Mese',
        emptyHint: 'Assegnato a fine mese al migliore',
        borderClass: 'border-purple-500',
        bgClass: 'bg-purple-500/10',
        glowClass: 'shadow-[0_0_20px_-4px_rgba(168,85,247,0.55)]',
        iconClass: 'text-purple-400',
    },
    BALLON_DOR: {
        icon: Crown,
        label: "Pallone d'Oro",
        emptyHint: 'Assegnato a fine stagione',
        borderClass: 'border-yellow-400',
        bgClass: 'bg-yellow-400/10',
        glowClass: 'shadow-[0_0_20px_-4px_rgba(250,204,21,0.6)]',
        iconClass: 'text-yellow-400',
    },
    GOLDEN_BOOT: {
        icon: Footprints,
        label: "Scarpa d'Oro",
        emptyHint: 'Al miglior marcatore di stagione',
        borderClass: 'border-orange-500',
        bgClass: 'bg-orange-500/10',
        glowClass: 'shadow-[0_0_20px_-4px_rgba(249,115,22,0.55)]',
        iconClass: 'text-orange-400',
    },
};

// Item interno per la griglia: o un award reale o un placeholder bloccato di un tipo non ancora generato.
type GridItem =
    | { kind: 'award'; award: Award }
    | { kind: 'locked'; type: AwardType };

export default function Awards() {
    const dispatch = useDispatch();
    const { activeTeamId } = useActiveTeamId();
    const userId = useSelector((s: RootState) => s.auth.user?._id || s.auth.user?.id);
    const { teamAwards, pendingAwards, isLoadingList, error } = useSelector(
        (s: RootState) => s.awards,
    );

    const [filter, setFilter] = useState<AwardType | 'ALL'>('ALL');
    const [selected, setSelected] = useState<Award | null>(null);

    // Carica gli award del team attivo (e i pending, per il badge sidebar globale)
    useEffect(() => {
        if (!activeTeamId) return;
        // @ts-expect-error redux-thunk typing
        dispatch(fetchTeamAwards({ teamId: activeTeamId }));
        // @ts-expect-error redux-thunk typing
        dispatch(fetchPendingAwards());
    }, [activeTeamId, dispatch]);

    const pendingIds = useMemo(() => new Set(pendingAwards.map(a => a.id)), [pendingAwards]);

    const visibleAwards = useMemo(() => {
        if (filter === 'ALL') return teamAwards;
        return teamAwards.filter(a => a.type === filter);
    }, [teamAwards, filter]);

    const handleOpenAward = (award: Award) => {
        setSelected(award);
        if (pendingIds.has(award.id)) {
            // @ts-expect-error redux-thunk typing
            dispatch(markAwardViewed(award.id));
        }
    };

    // ─── Share handlers (centralizzati in hook condiviso) ─────────────────────
    const {
        shareWhatsApp,
        shareTelegram,
        shareInstagram,
        copyLink,
        downloadImage,
    } = useAwardShareActions();

    // ─── Render ────────────────────────────────────────────────────────────────
    if (!activeTeamId) {
        return (
            <DashboardLayout>
                <EmptyState
                    title="Nessun team attivo"
                    description="Seleziona o crea un team per vedere i suoi trofei."
                />
            </DashboardLayout>
        );
    }

    // Tipi di award che il team NON ha ancora sbloccato → li mostriamo come slot bloccati
    const unlockedTypes = new Set(teamAwards.map(a => a.type));
    const lockedTypes: AwardType[] = (['MATCH_RECAP', 'MONTHLY_MVP', 'BALLON_DOR', 'GOLDEN_BOOT'] as AwardType[])
        .filter(t => !unlockedTypes.has(t))
        .filter(t => filter === 'ALL' || filter === t);

    // Lista unica per la paginazione: prima gli award reali, poi i placeholder bloccati
    const gridItems: GridItem[] = [
        ...visibleAwards.map<GridItem>(a => ({ kind: 'award', award: a })),
        ...lockedTypes.map<GridItem>(t => ({ kind: 'locked', type: t })),
    ];

    return (
        <DashboardLayout>
            <div className="container mx-auto px-4 py-6 max-w-6xl space-y-6">
                <Card className="gradient-card border-border/50 shadow-card">
                    <CardHeader>
                        <CardTitle className="font-display text-2xl flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-md">
                                <Trophy className="w-5 h-5 text-white" strokeWidth={2.6} />
                            </div>
                            <div className="flex-1">
                                <div>Bacheca Awards</div>
                                <p className="text-sm font-normal text-muted-foreground mt-0.5">
                                    {teamAwards.length} {teamAwards.length === 1 ? 'Award' : 'Awards'} totali
                                    {pendingAwards.length > 0 && ` · ${pendingAwards.length} nuovi`}
                                </p>
                            </div>
                        </CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-5">
                        {/* Filtri */}
                        <div className="flex flex-wrap gap-2">
                            {FILTER_OPTIONS.map(opt => (
                                <Button
                                    key={opt.value}
                                    size="sm"
                                    variant={filter === opt.value ? 'default' : 'outline'}
                                    onClick={() => setFilter(opt.value)}
                                >
                                    {opt.label}
                                </Button>
                            ))}
                        </div>

                        {/* Contenuto */}
                        {isLoadingList && teamAwards.length === 0 ? (
                            <LoadingGrid />
                        ) : error ? (
                            <EmptyState title="Errore" description={error} />
                        ) : gridItems.length === 0 ? (
                            <EmptyState
                                title="Ancora nessun trofeo"
                                description="I trofei vengono generati automaticamente dopo le partite e a fine mese."
                            />
                        ) : (
                            <PaginatedSwiper
                                items={gridItems}
                                pageSize={6}
                                renderPage={(pageItems) => (
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {pageItems.map((item, index) => {
                                            if (item.kind === 'locked') {
                                                const meta = AWARD_TYPE_META[item.type];
                                                const Icon = meta.icon;
                                                return (
                                                    <motion.div
                                                        key={`locked-${item.type}`}
                                                        initial={{ opacity: 0, scale: 0.85 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        transition={{ delay: Math.min(index * 0.05, 0.4) }}
                                                        className={`relative p-4 rounded-lg border-2 border-dashed ${meta.borderClass} ${meta.bgClass} opacity-60 grayscale`}
                                                    >
                                                        <div className="relative aspect-square w-full rounded-md overflow-hidden bg-muted/40 mb-3 flex items-center justify-center">
                                                            <Icon className={`w-12 h-12 ${meta.iconClass} opacity-70`} strokeWidth={1.6} />
                                                            <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-background/85 text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                                                                <Lock className="w-3 h-3" /> Bloccato
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                                                                {meta.label}
                                                            </div>
                                                            <div className="font-display font-bold text-sm leading-tight">
                                                                Non ancora sbloccato
                                                            </div>
                                                            <div className="text-xs text-muted-foreground line-clamp-2">
                                                                {meta.emptyHint}
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                );
                                            }

                                            const award = item.award;
                                            const isPending = pendingIds.has(award.id);
                                            const isNew = isPending || (userId ? !award.viewedBy?.includes(userId) : false);
                                            const isReady = award.status === 'READY';
                                            const meta = AWARD_TYPE_META[award.type as AwardType];
                                            const Icon = meta.icon;
                                            const thumb = award.imageThumbUrl || award.imageUrl || FALLBACK_THUMB;

                                            return (
                                                <motion.button
                                                    key={award.id}
                                                    type="button"
                                                    initial={{ opacity: 0, scale: 0.85 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ delay: Math.min(index * 0.05, 0.4) }}
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.97 }}
                                                    onClick={() => handleOpenAward(award)}
                                                    className={`group relative p-4 rounded-lg border-2 text-left transition-all duration-300 overflow-hidden
                                                        ${isReady
                                                            ? `${meta.borderClass} ${meta.bgClass} ${meta.glowClass}`
                                                            : `${meta.borderClass} ${meta.bgClass} grayscale opacity-70`}
                                                    `}
                                                >
                                                    {/* Preview thumbnail */}
                                                    <div className="relative aspect-square w-full rounded-md overflow-hidden bg-muted mb-3">
                                                        <img
                                                            src={thumb}
                                                            alt={getAwardTitle(award.type, award.payload, false)}
                                                            className="w-full h-full object-cover"
                                                            loading="lazy"
                                                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK_THUMB; }}
                                                        />
                                                        {/* Icon overlay */}
                                                        <div className="absolute top-2 left-2 w-8 h-8 rounded-lg bg-background/85 backdrop-blur-sm flex items-center justify-center shadow-sm">
                                                            <Icon className={`w-4 h-4 ${meta.iconClass}`} strokeWidth={2.4} />
                                                        </div>
                                                        {/* New badge */}
                                                        {isNew && isReady && (
                                                            <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-gradient-to-br from-yellow-400 to-orange-500 text-white text-[10px] font-bold uppercase tracking-wide flex items-center gap-0.5 shadow-md">
                                                                <Sparkles className="w-3 h-3" /> New
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Testo */}
                                                    <div className="flex flex-col gap-1">
                                                        <div className={`text-[10px] uppercase tracking-wider font-semibold ${meta.iconClass}`}>
                                                            {getAwardTypeLabel(award.type)}
                                                        </div>
                                                        <div className="font-display font-bold text-sm leading-tight line-clamp-2">
                                                            {getAwardTitle(award.type, award.payload, false)}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {getAwardDateLabel(award.type, award.payload)}
                                                        </div>
                                                    </div>

                                                    {!isReady && (
                                                        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-background/85 text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                                                            <Lock className="w-3 h-3" /> Gen…
                                                        </div>
                                                    )}
                                                </motion.button>
                                            );
                                        })}
                                    </div>
                                )}
                            />
                        )}
                    </CardContent>
                </Card>

                {/* Modal */}
                {selected && (
                    <AwardCardModal
                        open={!!selected}
                        onOpenChange={(o) => { if (!o) setSelected(null); }}
                        card={mapAwardToCard(selected.type, selected.payload, selected.shareUrl) as AwardModalCard}
                        cardTitle={getAwardTitle(selected.type, selected.payload)}
                        shareUrl={selected.shareUrl}
                        previewImageUrl={selected.imageSquareUrl || selected.imageUrl}
                        onShareWhatsApp={() => shareWhatsApp(selected)}
                        onShareTelegram={() => shareTelegram(selected)}
                        onShareInstagram={() => shareInstagram(selected)}
                        onCopyLink={() => copyLink(selected)}
                        onDownloadImage={() => downloadImage(selected)}
                    />
                )}
            </div>
        </DashboardLayout>
    );
}

function LoadingGrid() {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="w-full aspect-[3/4] rounded-lg" />
            ))}
        </div>
    );
}

function EmptyState({ title, description }: { title: string; description?: string }) {
    return (
        <div className="flex flex-col items-center justify-center text-center py-16 px-6">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Trophy className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold mb-1">{title}</h2>
            {description && <p className="text-sm text-muted-foreground max-w-sm">{description}</p>}
        </div>
    );
}
