/** Documento Season restituito da GET /api/v1/seasons */
export interface Season {
    id: string;
    seasonId: string;       // "YYYY-YY" es. "2025-26"
    displayName: string;    // "Stagione 2025/26"
    seasonStart: string;    // ISO date
    seasonEnd: string;      // ISO date
    status: 'active' | 'archived' | 'upcoming';
}
