/**
 * AwardCardThumbnail — Mini-card cliccabile per liste/griglie di card trofeo.
 *
 * Mostra un thumbnail verticale (9:16) con overlay gradient, badge tipo, data
 * e indicatore "Nuovo". Usato in Storico Partite e Bacheca Team.
 *
 * @example
 * <AwardCardThumbnail {...MOCK_THUMBNAILS[0]} size="medium" />
 */
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type AwardType = 'MATCH_RECAP' | 'MONTHLY_MVP' | 'BALLON_DOR' | 'GOLDEN_BOOT';

export interface AwardCardThumbnailProps {
  thumbUrl: string;
  typeLabel: string;
  type: AwardType;
  dateLabel: string;
  onClick: () => void;
  size?: 'small' | 'medium';
  isNew?: boolean;
}

const TYPE_STYLES: Record<AwardType, string> = {
  MATCH_RECAP: 'bg-blue-600 text-white hover:bg-blue-700',
  MONTHLY_MVP: 'bg-purple-600 text-white hover:bg-purple-700',
  BALLON_DOR: 'bg-yellow-500 text-yellow-950 hover:bg-yellow-400',
  GOLDEN_BOOT: 'bg-orange-600 text-white hover:bg-orange-700',
};

const SIZE_CLASSES: Record<'small' | 'medium', string> = {
  small: 'w-[120px] h-[214px]',
  medium: 'w-[200px] h-[355px]',
};

const BADGE_SIZE: Record<'small' | 'medium', string> = {
  small: 'text-[10px] px-1.5 py-0.5',
  medium: 'text-xs px-2 py-0.5',
};

export function AwardCardThumbnail({
  thumbUrl,
  typeLabel,
  type,
  dateLabel,
  onClick,
  size = 'medium',
  isNew = false,
}: AwardCardThumbnailProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative overflow-hidden rounded-xl cursor-pointer select-none',
        'transform transition-all duration-200 ease-out',
        'hover:scale-105 hover:shadow-lg hover:shadow-black/40',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
        'bg-card border border-border',
        SIZE_CLASSES[size],
      )}
      aria-label={`Apri ${typeLabel} del ${dateLabel}`}
    >
      {/* Immagine di sfondo */}
      <img
        src={thumbUrl}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
      />

      {/* Overlay gradient dal basso */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      {/* Badge "Nuovo" in alto a sinistra */}
      {isNew && (
        <div className="absolute top-2.5 left-2.5 z-10">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 animate-pulse" />
          </span>
        </div>
      )}

      {/* Badge tipo in alto a destra */}
      <div className="absolute top-2.5 right-2.5 z-10">
        <Badge
          variant="default"
          className={cn(
            'font-semibold uppercase tracking-wider border-0 shadow-sm',
            BADGE_SIZE[size],
            TYPE_STYLES[type],
          )}
        >
          {typeLabel}
        </Badge>
      </div>

      {/* Data in basso a sinistra */}
      <div className="absolute bottom-3 left-3 z-10">
        <span
          className={cn(
            'text-white font-semibold drop-shadow-md',
            size === 'small' ? 'text-xs' : 'text-sm',
          )}
        >
          {dateLabel}
        </span>
      </div>
    </button>
  );
}

export default AwardCardThumbnail;

export const MOCK_THUMBNAILS: Omit<AwardCardThumbnailProps, 'onClick'>[] = [
  {
    thumbUrl: 'https://via.placeholder.com/240x426/1a237e/ffffff?text=Card+1',
    typeLabel: 'Recap',
    type: 'MATCH_RECAP',
    dateLabel: '16 Mag',
    isNew: true,
  },
  {
    thumbUrl: 'https://via.placeholder.com/240x426/4a148c/ffffff?text=Card+2',
    typeLabel: 'MVP Mese',
    type: 'MONTHLY_MVP',
    dateLabel: 'Mag 2026',
    isNew: false,
  },
  {
    thumbUrl: 'https://via.placeholder.com/240x426/b8860b/ffffff?text=Card+3',
    typeLabel: "Pallone d'Oro",
    type: 'BALLON_DOR',
    dateLabel: '2025/26',
    isNew: true,
  },
  {
    thumbUrl: 'https://via.placeholder.com/240x426/d84315/ffffff?text=Card+4',
    typeLabel: "Scarpa d'Oro",
    type: 'GOLDEN_BOOT',
    dateLabel: '2025/26',
    isNew: false,
  },
  {
    thumbUrl: 'https://via.placeholder.com/240x426/0d47a1/ffffff?text=Card+5',
    typeLabel: 'Recap',
    type: 'MATCH_RECAP',
    dateLabel: '9 Mag',
    isNew: false,
  },
  {
    thumbUrl: 'https://via.placeholder.com/240x426/6a1b9a/ffffff?text=Card+6',
    typeLabel: 'MVP Mese',
    type: 'MONTHLY_MVP',
    dateLabel: 'Apr 2026',
    isNew: true,
  },
];
