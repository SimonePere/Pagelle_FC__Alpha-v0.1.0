/**
 * SeasonSelector — selettore stagione riusabile (Fase 5)
 *
 * - Mostra un dropdown con le stagioni in ordine DESC.
 * - Evidenzia la stagione corrente con un badge.
 * - Si nasconde automaticamente se c'è solo una stagione (showSelector = false).
 * - Al primo utilizzo mostra un banner UX informativo (dismissibile, localStorage).
 *
 * Props:
 *   selectedSeason  — valore controllato (stringa "YYYY-YY" | "current" | "all")
 *   onSeasonChange  — callback invocata con il nuovo valore
 *   seasons         — lista stagioni (da useActiveSeason)
 *   showSelector    — se false il componente non renderizza nulla
 *   showAllOption   — se true aggiunge "Tutte le stagioni" (default: false)
 */

import React, { useState } from 'react';
import { X, Info } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
} from '@/components/ui/select';
import type { Season } from '@/types/season';

const BANNER_DISMISSED_KEY = 'season_banner_dismissed';

interface SeasonSelectorProps {
    selectedSeason: string;
    onSeasonChange: (season: string) => void;
    seasons: Season[];
    showSelector: boolean;
    showAllOption?: boolean;
    className?: string;
}

export function SeasonSelector({
    selectedSeason,
    onSeasonChange,
    seasons,
    showSelector,
    showAllOption = false,
    className = '',
}: SeasonSelectorProps) {
    const [bannerDismissed, setBannerDismissed] = useState<boolean>(() => {
        return localStorage.getItem(BANNER_DISMISSED_KEY) === '1';
    });

    if (!showSelector) return null;

    const currentSeason = seasons.find(s => s.status === 'active');

    // Valore da mostrare nel trigger: se "current" risolviamo al seasonId corrente
    const displayValue =
        selectedSeason === 'current'
            ? (currentSeason?.seasonId ?? 'current')
            : selectedSeason;

    const handleDismissBanner = () => {
        localStorage.setItem(BANNER_DISMISSED_KEY, '1');
        setBannerDismissed(true);
    };

    const isViewingCurrent =
        selectedSeason === 'current' ||
        (currentSeason && selectedSeason === currentSeason.seasonId);

    const formatSeasonLabel = (label: string) => label.replace(/^stagione\s+/i, '');

    const selectedSeasonObj = seasons.find(s => s.seasonId === displayValue);
    const selectedLabel =
        displayValue === 'all'
            ? 'Tutte'
            : (selectedSeasonObj ? formatSeasonLabel(selectedSeasonObj.displayName) : 'Seleziona');

    return (
        <div className={`space-y-2 ${className}`}>
            {/* Banner UX — visibile solo la prima volta e solo se sulla stagione corrente */}
            {!bannerDismissed && isViewingCurrent && (
                <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
                    <Info className="mt-0.5 w-4 h-4 shrink-0 text-primary" />
                    <span className="flex-1">
                        Stai vedendo la <strong className="text-foreground">stagione corrente</strong>.
                        Usa il selettore qui sotto per esplorare le stagioni precedenti.
                    </span>
                    <button
                        type="button"
                        aria-label="Chiudi"
                        onClick={handleDismissBanner}
                        className="shrink-0 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Dropdown stagioni */}
            <div className="flex items-center">
                <Select value={displayValue} onValueChange={onSeasonChange}>
                    <SelectTrigger className="h-9 w-[112px] px-2.5 text-sm">
                        <span className="truncate">{selectedLabel}</span>
                    </SelectTrigger>
                    <SelectContent>
                        {showAllOption && (
                            <SelectItem value="all">
                                Tutte
                            </SelectItem>
                        )}
                        {seasons.map(s => (
                            <SelectItem key={s.seasonId} value={s.seasonId}>
                                {formatSeasonLabel(s.displayName)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}

export default SeasonSelector;
