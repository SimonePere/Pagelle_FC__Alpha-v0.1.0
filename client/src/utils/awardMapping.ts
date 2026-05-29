/**
 * Mapping helpers per convertire `Award.payload` (formato backend MongoDB)
 * → props dei componenti React `PodiumCard` / `HeroCard`.
 *
 * Usato sia dalla pagina render-only (Puppeteer) sia dalla pagina pubblica `/c/:id`
 * sia dal modal in-app, per garantire coerenza visiva ovunque.
 */

import type { PodiumCardProps } from '@/components/PodiumCard';
import type { HeroCardProps, HeroCardType } from '@/components/HeroCard';
import type { AwardPayload, AwardType } from '@/types/award';

export type CardData =
    | { kind: 'PODIUM'; props: PodiumCardProps }
    | { kind: 'HERO'; props: HeroCardProps };

export function mapAwardToCard(type: AwardType, payload: AwardPayload, shareUrl: string): CardData {
    if (type === 'MATCH_RECAP') {
        return { kind: 'PODIUM', props: mapMatchRecap(payload, shareUrl) };
    }
    return { kind: 'HERO', props: mapHero(type as HeroCardType, payload, shareUrl) };
}

function mapMatchRecap(payload: AwardPayload, shareUrl: string): PodiumCardProps {
    const podiumArr = (payload.podium || []).slice(0, 3).map(p => ({
        name: (p.name || '').toUpperCase(),
        vote: typeof p.avg === 'number' ? p.avg : Number(p.avg) || 0,
        avatarUrl: p.avatar || undefined,
    }));
    while (podiumArr.length < 3) podiumArr.push({ name: '—', vote: 0 });

    // Lookup name dal podium tramite playerId (i nomi sono già snapshot
    // nel payload.podium del backend → niente fetch extra).
    const nameByPlayerId = new Map<string, string>();
    for (const p of (payload.podium || [])) {
        if (p.playerId && p.name) nameByPlayerId.set(String(p.playerId), p.name.toUpperCase());
    }

    const highlights = (payload.highlights || []).map(h => ({
        icon: highlightIcon(h.code),
        titleLine: (h.text?.[0] || '').toUpperCase(),
        subtitleLine: (h.text?.[1] || '').toUpperCase(),
        playerName: h.playerId ? nameByPlayerId.get(String(h.playerId)) : undefined,
        accentColor: highlightAccent(h.code),
    }));

    const matchDate = payload.period?.dateFrom ? new Date(payload.period.dateFrom) : new Date();

    return {
        matchDate,
        podium: podiumArr as PodiumCardProps['podium'],
        highlights,
        qrCodeUrl: shareUrl,
    };
}

function mapHero(type: HeroCardType, payload: AwardPayload, shareUrl: string): HeroCardProps {
    const hero = payload.hero || ({} as NonNullable<AwardPayload['hero']>);
    const stats = (hero.stats || []).slice(0, 4);
    while (stats.length < 4) stats.push({ value: '—', label: '—' });

    return {
        type,
        periodLabel: (payload.period?.label || '').toUpperCase(),
        hero: {
            name: (hero.name || '').toUpperCase(),
            avatarUrl: hero.avatar || undefined,
            mainValue: String(hero.mainValue ?? ''),
            mainLabel: hero.mainLabel || '',
            stats: stats as HeroCardProps['hero']['stats'],
        },
        qrCodeUrl: shareUrl,
    };
}

function highlightIcon(code: string): string {
    switch (code) {
        case 'STREAK_MVP': return '🔥';
        case 'BEST_BY_MILES': return '💪';
        case 'UNANIMOUS_MVP': return '🎯';
        case 'GOAL_MACHINE': return '⚽';
        default: return '⭐';
    }
}

function highlightAccent(code: string): 'gold' | 'orange' | 'green' | 'purple' | 'blue' {
    switch (code) {
        case 'STREAK_MVP': return 'orange';
        case 'BEST_BY_MILES': return 'gold';
        case 'UNANIMOUS_MVP': return 'purple';
        case 'GOAL_MACHINE': return 'green';
        default: return 'blue';
    }
}

/** Titolo umano per un award (es. modal, pagina pubblica, OG meta). */
export function getAwardTitle(type: AwardType, payload: AwardPayload, includePeriod: boolean = true): string {
    const period = includePeriod ? (payload.period?.label || '') : '';
    switch (type) {
        case 'MATCH_RECAP':
            return `Il Podio della Partita${period ? ` · ${period}` : ''}`;
        case 'MONTHLY_MVP':
            return `MVP del Mese${period ? ` · ${period}` : ''}`;
        case 'BALLON_DOR':
            return `Pallone d'Oro${period ? ` · ${period}` : ''}`;
        case 'GOLDEN_BOOT':
            return `Scarpa d'Oro${period ? ` · ${period}` : ''}`;
        default:
            return 'Trofeo Pagelle FC';
    }
}

/** Label breve per badge/thumbnail (es. "Recap", "MVP Mese"). */
export function getAwardTypeLabel(type: AwardType): string {
    switch (type) {
        case 'MATCH_RECAP': return 'Recap';
        case 'MONTHLY_MVP': return 'MVP Mese';
        case 'BALLON_DOR': return 'Pallone d\'Oro';
        case 'GOLDEN_BOOT': return 'Scarpa d\'Oro';
    }
}

/** Data breve italiana per badge thumbnail (es. "16 Mag", "Mag 2026"). */
export function getAwardDateLabel(type: AwardType, payload: AwardPayload): string {
    // Per MATCH_RECAP usiamo dateFrom (giorno specifico)
    if (type === 'MATCH_RECAP' && payload.period?.dateFrom) {
        return new Date(payload.period.dateFrom).toLocaleDateString('it-IT', {
            day: 'numeric',
            month: 'short',
        });
    }
    // Per gli altri il label periodo è già "MAGGIO 2026" / "STAGIONE 2025/26"
    return payload.period?.label || '';
}
