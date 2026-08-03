const GodRepository = require('../repositories/GodRepository');

class GodKpiService {
    constructor() {
        this.repo = new GodRepository();
    }

    // Utility per risolvere range di date da query params, con fallback a range predefiniti
    resolveRange(query = {}) {
        const now = new Date();
        const { range = '30d', start, end } = query;

        if (start && end) {
            return { start: new Date(start), end: new Date(end), rangeKey: 'custom' };
        }

        if (range === '7d') return { start: new Date(now.getTime() - 7 * 86400000), end: now, rangeKey: '7d' };
        if (range === '30d') return { start: new Date(now.getTime() - 30 * 86400000), end: now, rangeKey: '30d' };
        if (range === '90d') return { start: new Date(now.getTime() - 90 * 86400000), end: now, rangeKey: '90d' };
        return { start: new Date('2020-01-01T00:00:00.000Z'), end: now, rangeKey: 'total' };
    }

    async computeOverviewMetrics({ start, end }) {
        const createdFilter = { createdAt: { $gte: start, $lte: end } };

        const [
            totalUsers,
            newUsers,
            guestUsers,
            activeUsers7d,
            totalTeams,
            newTeams,
            totalMatches,
            matchesInWindow,
            openVotingSessions,
            sessionsInWindow,
            submissionsInWindow,
            cardSubmissionsInWindow,
            awardsInWindow,
            gameplay,
            badges,
        ] = await Promise.all([
            this.repo.countUsers({ isGuest: { $ne: true } }),
            this.repo.countUsers({ ...createdFilter, isGuest: { $ne: true } }),
            this.repo.countGuestUsers(),
            this.repo.countActiveUsers7d(),
            this.repo.countTeams({}),
            this.repo.countTeams(createdFilter),
            this.repo.countMatches({}),
            this.repo.countMatches(createdFilter),
            this.repo.countOpenVotingSessions(),
            this.repo.countVotingSessions(createdFilter),
            this.repo.countVoteSubmissions(createdFilter),
            this.repo.countPlayerCardSubmissions(createdFilter),
            this.repo.countAwards(createdFilter),
            this.repo.aggregateGameplayStats({ start, end }),
            this.repo.aggregateBadgesCount({ start, end }),
        ]);

        return {
            users: { totalRegistered: totalUsers, newInWindow: newUsers, guestUsers, activeUsers7d },
            teams: { total: totalTeams, createdInWindow: newTeams },
            matches: { total: totalMatches, createdInWindow: matchesInWindow, openVotingSessions },
            voting: { sessionsCreatedInWindow: sessionsInWindow, submissionsInWindow },
            playerCards: { submissionsInWindow: cardSubmissionsInWindow },
            awards: { eventsInWindow: awardsInWindow },
            gameplay: {
                totalGoals: gameplay.totalGoals,
                totalAssists: gameplay.totalAssists,
                avgRating: gameplay.avgRating,
                totalBadges: badges.total,
                badgesBreakdown: badges.breakdown,
            },
        };
    }

    // Calcola metriche overview in real-time (fallback se snapshot mancante)
    /**
     * OVERVIEW = numeri principali gia pronti per le card del God Dashboard.
     * UI che alimenta: Team & Partite, Utenti & Giocatori, Engagement, Gameplay.
     *
     * Input query:
     * - range=7d|30d|90d|total
     * - oppure start=ISO&end=ISO
     * Esempio HTTP: GET /api/v1/god/overview?range=30d
     *
     * Esempio payload restituito (campi aggiornati):
     * {
     *   source: 'live',
     *   range: '30d',
     *   generatedAt: '2026-08-01T10:00:00.000Z',
     *   metrics: {
     *     users: { totalRegistered: 1240, newInWindow: 87, guestUsers: 330, activeUsers7d: 188 },
     *     teams: { total: 96, createdInWindow: 12 },
     *     matches: { total: 1580, createdInWindow: 141, openVotingSessions: 4 },
     *     voting: { sessionsCreatedInWindow: 141, submissionsInWindow: 932 },
     *     playerCards: { submissionsInWindow: 210 },
     *     awards: { eventsInWindow: 44 },
     *     gameplay: { totalGoals: 480, totalAssists: 351, avgRating: 6.84, totalBadges: 210, badgesBreakdown: {...} }
     *   }
     * }
     */
    async getOverview(query = {}) {
        const range = this.resolveRange(query);

        // prova snapshot
        if (range.rangeKey !== 'custom') {
            const snapshot = await this.repo.getLatestSnapshot(range.rangeKey, 'hourly');
            if (snapshot?.metrics) {
                return {
                    source: 'snapshot',
                    range: range.rangeKey,
                    generatedAt: snapshot.updatedAt,
                    metrics: snapshot.metrics,
                };
            }
        }

        // fallback real-time
        const metrics = await this.computeOverviewMetrics(range);
        return {
            source: 'live',
            range: range.rangeKey,
            generatedAt: new Date(),
            metrics,
        };
    }

    async materializeSnapshots(bucketType = 'hourly') {
        const now = new Date();
        const bucketStart = new Date(now);
        bucketStart.setMinutes(0, 0, 0);

        const ranges = ['7d', '30d', '90d', 'total'];

        for (const rangeKey of ranges) {
            const { start, end } = this.resolveRange({ range: rangeKey });
            const metrics = await this.computeOverviewMetrics({ start, end });
            await this.repo.upsertSnapshot({
                bucketType,
                bucketStart,
                bucketEnd: end,
                rangeKey,
                metrics,
            });
        }

        return { success: true, bucketType, at: now.toISOString() };
    }

    /**
     * DASHBOARD GRAPH DATA = dati gia pronti per il grafico del dashboard.
     * UI che alimenta: il line chart "Trend ultime 8 settimane".
     *
     * Input query:
     * - range=30d|90d
     * - granularity=hour|day
     * Esempio HTTP: GET /api/v1/god/dashboard-graph-data?range=90d&granularity=day
     *
     * Questo metodo restituisce solo il payload `data`.
     * Il controller lo incapsula in: { success: true, data: ... }
     *
     * Esempio payload atteso quando sara implementato:
     * {
     *   labels: ['01/06', '02/06', '03/06', '04/06'],
     *   series: [
     *     { key: 'matches', label: 'Partite', data: [4, 6, 3, 7] },
     *     { key: 'votes', label: 'Voti', data: [18, 29, 11, 34] },
     *     { key: 'playerCards', label: 'Player Cards', data: [2, 5, 1, 4] }
     *   ]
     * }
     *
     * Stato attuale: placeholder V1, quindi il frontend deve aspettarsi labels e series vuoti.
     */
    async getDashboardGraphData(query = {}) {
        const { start, end, granularity = 'day' } = { ...this.resolveRange(query), ...query };
        return this.repo.getTimeSeriesData({
            start: start instanceof Date ? start : new Date(start),
            end: end instanceof Date ? end : new Date(end),
            granularity,
        });
    }

    /**
     * GUEST CONVERSION DATA = numeri del percorso ospite -> utente registrato.
     * UI che alimenta: Giocatori ospiti, Inviti pendenti, Conversione guest -> player.
     *
     * Input query:
     * - range=30d|90d
     * Esempio HTTP: GET /api/v1/god/guest-conversion?range=90d
     *
     * Questo metodo restituisce solo il payload `data`.
     * Il controller lo incapsula in: { success: true, data: ... }
     *
     * Esempio payload atteso quando sara implementato:
     * {
     *   invited: 320,
     *   guestLogins: 240,
     *   promoted: 61,
     *   conversionRate: 25.4
     * }
     *
     * Stato attuale: placeholder V1 con tutti i valori a zero.
     */
    async getGuestConversionData(query = {}) {
        // Placeholder: il tracking inviti/promozione richiede eventi dedicati non ancora implementati.
        // Unico dato reale disponibile: guestUsers totali (da overview).
        const guestUsers = await this.repo.countGuestUsers();
        return { invited: 0, guestLogins: guestUsers, promoted: 0, conversionRate: 0 };
    }

    /**
     * ENGAGEMENT = misura quanto gli utenti usano davvero voti e player cards.
     * UI che alimenta: Voti partita, Player Cards, utenti attivi, completion rate.
     *
     * Input query:
     * - range=7d|30d|90d
     * Esempio HTTP: GET /api/v1/god/engagement?range=30d
     *
     * Questo metodo restituisce solo il payload `data`.
     * Il controller lo incapsula in: { success: true, data: ... }
     *
     * Esempio payload atteso quando sara implementato:
     * {
     *   voting: {
     *     sessionsCreated: 141,
     *     submissions: 932,
     *     avgParticipationRate: 78.2,
     *     completionRate: 64.5,
     *     activeUsers7d: 188
     *   },
     *   playerCards: {
     *     sessionsCreated: 22,
     *     submissions: 210,
     *     completionRate: 57.1
     *   }
     * }
     *
     * Stato attuale: placeholder V1 con oggetti vuoti.
     */
    async getEngagement(query = {}) {
        const range = this.resolveRange(query);
        const [voting, playerCards] = await Promise.all([
            this.repo.aggregateVotingEngagement(range),
            this.repo.aggregatePlayerCardEngagement(range),
        ]);
        return { voting, playerCards };
    }

    /**
     * AWARDS KPI = performance degli award nel periodo selezionato.
     * UI che alimenta: card award-specifiche e funnel award.
     *
     * Input query:
     * - range=30d|90d
     * Esempio HTTP: GET /api/v1/god/awards?range=30d
     *
     * Questo metodo restituisce solo il payload `data`.
     * Il controller lo incapsula in: { success: true, data: ... }
     *
     * Esempio payload atteso quando sara implementato:
     * {
     *   pending: 12,
     *   viewed: 98,
     *   shared: 31,
     *   publicVisits: 420,
     *   downloads: 77
     * }
     *
     * Stato attuale: placeholder V1 con tutti i valori a zero.
     */
    async getAwardsKpi(query = {}) {
        const range = this.resolveRange(query);
        return this.repo.aggregateAwardStats(range);
    }

    /**
     * TOP TEAMS = classifica dei team piu attivi per numero di partite nel range.
     * UI che alimenta: card "Top 5 Team per partite" del God Dashboard.
     *
     * Input query:
     * - range=7d|30d|90d|total  (o start=ISO&end=ISO)
     * - limit=1..20 (default 5)
     * Esempio HTTP: GET /api/v1/god/top-teams?range=30d&limit=5
     *
     * Questo metodo restituisce solo il payload `data`.
     * Il controller lo incapsula in: { success: true, data: ... }
     *
     * Esempio payload:
     * [
     *   { teamId: '66...', teamName: 'DosiMele', matchCount: 25, memberCount: 6 }
     * ]
     */
    async getTopTeams(query = {}) {
        const { start, end } = this.resolveRange(query);
        const limit = Math.min(Math.max(parseInt(query.limit || '5', 10), 1), 20);
        return this.repo.getTopTeams({ limit, start, end });
    }

    /**
     * GOD USAGE = storico tecnico delle chiamate alle API god.
     * UI che alimenta: tabella tecnica di audit/usage.
     *
     * Input query:
     * - limit=1..500
     * Esempio HTTP: GET /api/v1/god/audit/usage?limit=50
     *
     * Questo metodo restituisce solo il payload `data`.
     * Il controller lo incapsula in: { success: true, data: ... }
     *
     * Esempio payload atteso quando sara implementato correttamente lato audit:
     * [
     *   {
     *     userId: 'abc123',
     *     path: '/api/v1/god/overview?range=30d',
     *     method: 'GET',
     *     statusCode: 200,
     *     latencyMs: 38,
     *     query: { range: '30d' },
     *     userAgent: 'Mozilla/5.0',
     *     at: '2026-08-01T09:58:00.000Z'
     *   }
     * ]
     */
    async getGodUsage(query = {}) {
        const limit = Math.min(parseInt(query.limit || '100', 10), 500);
        return this.repo.getGodUsage({ limit });
    }
}

module.exports = GodKpiService;
