const BaseRepository = require('./BaseRepository');
const PlayerSeasonStats = require('../models/PlayerSeasonStats');

/**
 * 📅 PLAYER SEASON STATS REPOSITORY — Accesso dati alle statistiche per stagione (Fase 3)
 *
 * 📝 RESPONSABILITÀ:
 * - Operazioni CRUD su PlayerSeasonStats
 * - Sostituzione atomica del set di righe di una stagione (recompute)
 * - Query per leaderboard season-scoped
 */
class PlayerSeasonStatsRepository extends BaseRepository {

    constructor() {
        super(PlayerSeasonStats);
    }

    /**
     * 🔁 Sostituisce TUTTE le righe di un (team, stagione) con quelle ricalcolate.
     * Operazione idempotente: cancella le righe precedenti della stagione e
     * inserisce quelle nuove. Se `docs` è vuoto, ripulisce soltanto.
     *
     * @param {string} teamId
     * @param {string} seasonId
     * @param {Array<Object>} docs - righe già pronte (incluse playerId/teamId/seasonId)
     * @returns {Promise<number>} numero di righe inserite
     */
    async replaceSeason(teamId, seasonId, docs) {
        await this.model.deleteMany({ teamId, seasonId });
        if (!docs || docs.length === 0) return 0;
        const inserted = await this.model.insertMany(docs, { ordered: false });
        return inserted.length;
    }

    /**
     * 🏆 Leaderboard di una stagione, ordinata per media voto (DESC).
     * @param {string} teamId
     * @param {string} seasonId
     * @param {number} limit
     * @returns {Promise<Array>}
     */
    async findSeasonLeaderboard(teamId, seasonId, limit = 10) {
        return this.findAll(
            { teamId, seasonId },
            { sort: { averageRating: -1 }, limit }
        );
    }
}

module.exports = PlayerSeasonStatsRepository;
