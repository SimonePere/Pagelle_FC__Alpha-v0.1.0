import type { User, Team } from "../types/api";

/**
 * Permessi lato client.
 *
 * IMPORTANTE: questi helper servono SOLO per nascondere/mostrare elementi UI
 * (UX). La sicurezza vera è applicata lato server dai middleware
 * `requireRole` e `requireTeamAdmin`. Bypassare un controllo client non
 * dà nessun potere reale.
 */

type MaybeId = string | { _id?: string; id?: string } | null | undefined;

const idOf = (value: MaybeId): string | null => {
    if (!value) return null;
    if (typeof value === "string") return value;
    return value._id || value.id || null;
};

const userId = (user: User | null | undefined): string | null => {
    if (!user) return null;
    return user._id || user.id || null;
};

/**
 * Admin globale: ruolo applicativo che concede pieni poteri amministrativi
 * (creare/modificare/eliminare match, PlayerCards, gestire qualsiasi team).
 *
 * Default fail-closed: se manca user o role → false.
 */

export const isGod = (user: User | null | undefined): boolean => {
    return !!user && user.role === 'god';
};

export const isAdmin = (user: User | null | undefined): boolean => {
    return !!user && (user.role === "admin" || user.role === "god");
};

/**
 * Team-admin: l'utente può amministrare quel team specifico se:
 *   1. è admin globale (bypass), oppure
 *   2. è in `team.adminIds`, oppure
 *   3. è il creatore del team (fallback per team legacy)
 *
 * Specchio del middleware server `requireTeamAdmin`.
 */
export const isTeamAdmin = (
    user: User | null | undefined,
    team: Team | null | undefined
): boolean => {
    if (!user || !team) return false;
    if (isAdmin(user)) return true;

    const uid = userId(user);
    if (!uid) return false;

    // Team.adminIds può essere popolato (User[]) o solo ObjectId stringa
    const inAdminIds = (team.adminIds || []).some(
        (entry) => idOf(entry as MaybeId) === uid
    );
    if (inAdminIds) return true;

    // Fallback: campo `creator` (lato client) o `createdBy` (presente in alcune
    // risposte legacy). Manteniamo il check defensivo.
    const creatorId = idOf(team.creator as MaybeId)
        ?? idOf((team as unknown as { createdBy?: MaybeId }).createdBy);
    return creatorId === uid;
};
