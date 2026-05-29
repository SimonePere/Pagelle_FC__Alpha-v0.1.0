/**
 * Tipi TypeScript per il dominio "Award" (Pagelle FC Awards).
 *
 * Riflettono la shape ritornata dalle API del backend:
 *  - GET  /awards/team/:teamId    → AwardsListResponse
 *  - GET  /awards/pending          → AwardsPendingResponse
 *  - GET  /awards/:awardId         → { award: Award }
 *  - GET  /awards/public/:awardId  → { award: PublicAward }
 *  - POST /awards/:awardId/viewed  → { success: true }
 *  - POST /awards/:awardId/share   → { success: true }
 */

export type AwardType = 'MATCH_RECAP' | 'MONTHLY_MVP' | 'BALLON_DOR' | 'GOLDEN_BOOT';
export type AwardStatus = 'PENDING' | 'READY' | 'FAILED';
export type ShareChannel = 'native' | 'whatsapp' | 'telegram' | 'copyLink' | 'download';

export interface PodiumEntryPayload {
    playerId?: string;
    name: string;
    avatar?: string | null;
    avg: number;
    matches?: number;
}

export interface HeroStatPayload {
    value: string;
    label: string;
}

export interface HeroPayload {
    playerId?: string | null;
    name: string;
    avatar?: string | null;
    mainValue: string;
    mainLabel: string;
    stats: HeroStatPayload[];
}

export interface HighlightPayload {
    code: string;
    text: [string, string];
}

export interface AwardPayload {
    period: {
        label: string;
        dateFrom?: string;
        dateTo?: string;
    };
    podium?: PodiumEntryPayload[];
    hero?: HeroPayload;
    highlights?: HighlightPayload[];
    totalVoters?: number;
    eligibleVoters?: number;
    autoVoteExcluded?: boolean;
}

/** Award completo (autenticato). NOTA: il backend serializza `_id` → `id` via toJSON. */
export interface Award {
    id: string;
    teamId: string;
    type: AwardType;
    refId: string;
    status: AwardStatus;
    generatedAt: string;
    finalizedAt?: string;
    payload: AwardPayload;
    imageUrl?: string | null;
    imageSquareUrl?: string | null;
    imageThumbUrl?: string | null;
    shareUrl?: string | null;
    viewedBy?: string[];
    stats?: {
        views?: number;
        shareClicks?: Record<ShareChannel, number>;
        publicPageVisits?: number;
        signupsAttributed?: number;
    };
    generationAttempts?: number;
    lastError?: string | null;
    createdAt?: string;
    updatedAt?: string;
}

/** Versione "ridotta" ritornata dall'endpoint pubblico. */
export interface PublicAward {
    id: string;
    type: AwardType;
    status: AwardStatus;
    generatedAt: string;
    payload: AwardPayload;
    imageUrl?: string | null;
    imageSquareUrl?: string | null;
    shareUrl?: string | null;
}

export interface AwardsListResponse {
    awards: Award[];
    total: number;
    filters?: Record<string, unknown>;
}

export interface AwardsPendingResponse {
    awards: Award[];
    count: number;
}

export interface AwardsListFilters {
    type?: AwardType;
    status?: AwardStatus;
    limit?: number;
    skip?: number;
}
