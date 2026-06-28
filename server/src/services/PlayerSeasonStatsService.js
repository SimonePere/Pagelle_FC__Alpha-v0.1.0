// services/PlayerSeasonStatsService.js

const {
    VotingSessionRepository,
    VoteResultRepository,
    PlayerSeasonStatsRepository,
    UserRepository
} = require('../repositories');

/**
 * PLAYER SEASON STATS SERVICE (Fase 3)
 * ──────────────────────────────────────────────────────────────────────────
 * Calcola le statistiche dei giocatori LIMITATE a una stagione, aggregando i
 * `VoteResult` delle sole sessioni `match_rating` completate di quel
 * (team, seasonId).
 *
 * Il ricalcolo è FULL e idempotente: ogni `recompute` rigenera da zero le righe
 * della stagione (sostituzione atomica). Nessun accumulo incrementale → nessun
 * rischio di drift se eseguito più volte.
 *
 * Fonti:
 *   VotingSession (teamId, seasonId, type, status) → VoteResult.matchRatingResults
 *   User (name) → cache `playerName`
 */
class PlayerSeasonStatsService {

    constructor() {
        this.votingSessionRepository = new VotingSessionRepository();
        this.voteResultRepository = new VoteResultRepository();
        this.playerSeasonStatsRepository = new PlayerSeasonStatsRepository();
        this.userRepository = new UserRepository();
    }

    /**
     * Ricalcola e persiste le statistiche stagionali di un team per una stagione.
     *
     * @param {string} teamId
     * @param {string} seasonId  es. "2025-26"
     * @returns {Promise<{teamId:string, seasonId:string, players:number, sessions:number}>}
     */
    async recompute(teamId, seasonId) {
        if (!teamId) throw new Error('teamId is required');
        if (!seasonId) throw new Error('seasonId is required');

        // 1. Sessioni match_rating COMPLETATE di questo (team, stagione)
        const sessions = await this.votingSessionRepository.findAll(
            { teamId, seasonId, type: 'match_rating', status: 'completed' },
            { select: '_id' }
        );
        const sessionIds = sessions.map(s => s._id);

        // Nessuna sessione → ripulisci eventuali righe stagionali e termina
        if (sessionIds.length === 0) {
            await this.playerSeasonStatsRepository.replaceSeason(teamId, seasonId, []);
            return { teamId, seasonId, players: 0, sessions: 0 };
        }

        // 2. Risultati ufficiali delle sessioni
        const results = await this.voteResultRepository.findAll(
            { votingSessionId: { $in: sessionIds } },
            { select: 'matchRatingResults' }
        );

        // 3. Aggregazione per giocatore
        const accumulator = new Map(); // playerId(string) → stats parziali
        for (const result of results) {
            const perPlayer = this._entriesOf(result.matchRatingResults);
            for (const [playerKey, stats] of perPlayer) {
                if (!stats) continue;
                const playerId = (stats.playerId || playerKey).toString();
                const rating = Number(stats.averageRating);
                if (!Number.isFinite(rating)) continue;

                const goals = Number(stats.goals) || 0;
                const assists = Number(stats.assists) || 0;
                const isMvp = Array.isArray(stats.badges) && stats.badges.includes('mvp');

                const acc = accumulator.get(playerId) || {
                    matchesPlayed: 0,
                    totalGoals: 0,
                    totalAssists: 0,
                    totalRatingPoints: 0,
                    mvpCount: 0,
                    bestRating: null,
                    worstRating: null
                };

                acc.matchesPlayed += 1;
                acc.totalGoals += goals;
                acc.totalAssists += assists;
                acc.totalRatingPoints += rating;
                if (isMvp) acc.mvpCount += 1;
                acc.bestRating = acc.bestRating === null ? rating : Math.max(acc.bestRating, rating);
                acc.worstRating = acc.worstRating === null ? rating : Math.min(acc.worstRating, rating);

                accumulator.set(playerId, acc);
            }
        }

        // 4. Cache nomi giocatori
        const playerIds = [...accumulator.keys()];
        const nameById = await this._resolvePlayerNames(playerIds);

        // 5. Costruzione documenti finali
        const docs = playerIds.map(playerId => {
            const acc = accumulator.get(playerId);
            const averageRating = acc.matchesPlayed > 0
                ? Number((acc.totalRatingPoints / acc.matchesPlayed).toFixed(2))
                : 0;
            return {
                playerId,
                teamId,
                seasonId,
                playerName: nameById.get(playerId) || 'Sconosciuto',
                matchesPlayed: acc.matchesPlayed,
                totalGoals: acc.totalGoals,
                totalAssists: acc.totalAssists,
                totalRatingPoints: Number(acc.totalRatingPoints.toFixed(2)),
                averageRating,
                bestRating: acc.bestRating,
                worstRating: acc.worstRating,
                mvpCount: acc.mvpCount,
                presences: acc.matchesPlayed,
                updatedAt: new Date()
            };
        });

        // 6. Sostituzione atomica delle righe della stagione
        await this.playerSeasonStatsRepository.replaceSeason(teamId, seasonId, docs);

        return {
            teamId,
            seasonId,
            players: docs.length,
            sessions: sessionIds.length
        };
    }

    // ────────────────────────────────────────────────────────────────────
    //  HELPER PRIVATI
    // ────────────────────────────────────────────────────────────────────

    /**
     * Normalizza l'iterazione su `matchRatingResults`, che può essere una Map
     * (documento Mongoose) o un oggetto semplice (lean()).
     * @returns {Array<[string, Object]>}
     */
    _entriesOf(matchRatingResults) {
        if (!matchRatingResults) return [];
        if (matchRatingResults instanceof Map) return [...matchRatingResults.entries()];
        return Object.entries(matchRatingResults);
    }

    /**
     * Mappa playerId(string) → name, leggendo da User.
     * @param {Array<string>} playerIds
     * @returns {Promise<Map<string,string>>}
     */
    async _resolvePlayerNames(playerIds) {
        const map = new Map();
        if (playerIds.length === 0) return map;
        const users = await this.userRepository.findAll(
            { _id: { $in: playerIds } },
            { select: '_id name' }
        );
        for (const u of users) {
            map.set(u._id.toString(), u.name);
        }
        return map;
    }
}

module.exports = PlayerSeasonStatsService;
