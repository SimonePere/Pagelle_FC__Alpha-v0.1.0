const BaseRepository = require('./BaseRepository');
const News = require('../models/News');

/**
 * 📰 NEWS REPOSITORY - Gestione accesso dati News
 * 
 * 📝 RESPONSABILITÀ:
 * - Operazioni CRUD su News (ereditate da BaseRepository)
 * - Query specializzate per notizie per data, team, categoria
 * - Ricerca notizie recenti e prioritarie
 * - Gestione cleanup notizie vecchie
 * - Query per statistiche e analytics news
 */

/** 
    FUNZIONALITÀ COMPLETE:
    Ereditate da BaseRepository:
 - create(data) - Crea news
 - findAll(filter, options) - Query generiche
 - findById(id) - Trova per ID
 - update(id, data) - Aggiorna news
 - delete(id) - Elimina news

    // ==============================
    // 🎯 METODI SPECIFICI PER NEWS
    // ==============================
 - findFreshNewsByTeam() - Usato dal NewsService
 - findNewsByCategory() - Per filtrare per tipo
 - findNewsByPriority() - Per urgenza
 - findNewsByDateRange() - Per timeframe
 - findUrgentNews() - Per dashboard alerts
 - cleanupOldNews() - Per manutenzione automatica
 - getNewsStatsByCategory() - Per analytics
*/


class NewsRepository extends BaseRepository {
    constructor() {
        super(News);
    }
    /**
     * 🔍 Trova notizie recenti per team
     * @param {string} teamId - ID del team
     */

    async findFreshNewsByTeam(teamId, limit = 10) {
        return this.findAll({ teamId }, { sort: { createdAt: -1 }, limit });
    }

    /**
     * 🏷️ Trova notizie per categoria
     * @param {string} teamId - ID del team
     * @param {string} category - Categoria (leaderboard, match_completed, etc.)
     * @param {number} limit - Numero massimo di risultati
     */
    async findNewsByCategory(teamId, category, limit = 10) {
        return this.findAll(
            { teamId, category },
            { sort: { createdAt: -1 }, limit }
        );
    }

    /**
     * ⚡ Trova notizie per priorità
     * @param {string} teamId - ID del team
     * @param {string} priority - Priorità (urgent, high, medium, low)
     * @param {number} limit - Numero massimo di risultati
     */
    async findNewsByPriority(teamId, priority, limit = 10) {
        return this.findAll(
            { teamId, priority },
            { sort: { createdAt: -1 }, limit }
        );
    }

    /**
     * 📅 Trova notizie in un range temporale
     * @param {string} teamId - ID del team
     * @param {Date} fromDate - Data di inizio
     * @param {Date} toDate - Data di fine
     */
    async findNewsByDateRange(teamId, fromDate, toDate) {
        return this.findAll({
            teamId,
            createdAt: {
                $gte: fromDate,
                $lte: toDate
            }
        }, { sort: { createdAt: -1 } });
    }

    /**
     * 🔥 Trova notizie prioritarie (urgent + high) recenti
     * @param {string} teamId - ID del team
     * @param {number} hours - Ore di lookback (default 24h)
     */
    async findUrgentNews(teamId, hours = 24) {
        const fromDate = new Date(Date.now() - hours * 60 * 60 * 1000);
        return this.findAll({
            teamId,
            priority: { $in: ['urgent', 'high'] },
            createdAt: { $gte: fromDate }
        }, { sort: { createdAt: -1 } });
    }

    /**
     * 🗑️ Rimuove notizie vecchie (cleanup automatico)
     * @param {number} daysOld - Giorni di retention (default 30 giorni)
     * @returns {number} Numero di notizie rimosse
     */
    async cleanupOldNews(daysOld = 30) {
        const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
        const result = await this.model.deleteMany({
            createdAt: { $lt: cutoffDate }
        });
        return result.deletedCount;
    }

    /**
     * 📊 Conta notizie per categoria (per analytics)
     * @param {string} teamId - ID del team
     * @param {number} daysBack - Giorni di lookback per conteggio
     */
    async getNewsStatsByCategory(teamId, daysBack = 7) {
        const fromDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

        return this.model.aggregate([
            {
                $match: {
                    teamId: teamId,
                    createdAt: { $gte: fromDate }
                }
            },
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 },
                    latestNews: { $max: '$createdAt' }
                }
            },
            {
                $sort: { count: -1 }
            }
        ]);
    }
}

module.exports = NewsRepository;