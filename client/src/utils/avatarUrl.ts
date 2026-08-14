/**
 * Avatar URL Builder — Costruisce URL versionate per avatar
 * 
 * Cache-busting tramite query string `?v=<avatarUpdatedAt-in-ms>`
 * Se avatarUpdatedAt è null → nessun avatar → undefined (fallback iniziali)
 */

// Relativo di default: il proxy Vite (dev) o il rewrite di produzione instrada /api/v1 al backend corretto.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

/**
 * Costruisce URL versionate per avatar utente
 * @param {Object|null|undefined} user - User object con optional { id, _id, profile: { avatarUpdatedAt } }
 * @returns {string|undefined} URL o undefined se nessun avatar
 * 
 * @example
 * userAvatarUrl(user) → "http://localhost:5000/api/v1/users/123/avatar?v=1692547200000"
 * userAvatarUrl(null) → undefined
 */
export function userAvatarUrl(user?: { id?: string; _id?: string; profile?: { avatarUpdatedAt?: string | null } } | null): string | undefined {
    if (!user) return undefined;

    const id = user.id || user._id;
    const avatarUpdatedAt = user.profile?.avatarUpdatedAt;

    // Se manca ID o avatar non è stato mai settato → undefined
    if (!id || !avatarUpdatedAt) return undefined;

    // Converti ISO string a timestamp in ms per cache-busting
    const versionTimestamp = new Date(avatarUpdatedAt).getTime();

    return `${API_BASE_URL}/users/${id}/avatar?v=${versionTimestamp}`;
}

/**
 * Costruisce URL versionate per avatar team
 * @param {Object|null|undefined} team - Team object con optional { id, _id, avatarUpdatedAt }
 * @returns {string|undefined} URL o undefined se nessun avatar
 * 
 * @example
 * teamAvatarUrl(team) → "http://localhost:5000/api/v1/teams/456/avatar?v=1692547200000"
 * teamAvatarUrl(null) → undefined
 */
export function teamAvatarUrl(team?: { id?: string; _id?: string; avatarUpdatedAt?: string | null } | null): string | undefined {
    if (!team) return undefined;

    const id = team.id || team._id;
    const avatarUpdatedAt = team.avatarUpdatedAt;

    // Se manca ID o avatar non è stato mai settato → undefined
    if (!id || !avatarUpdatedAt) return undefined;

    // Converti ISO string a timestamp in ms per cache-busting
    const versionTimestamp = new Date(avatarUpdatedAt).getTime();

    return `${API_BASE_URL}/teams/${id}/avatar?v=${versionTimestamp}`;
}
