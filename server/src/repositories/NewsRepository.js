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
 * 🔄 Sostituisce notizie di una categoria specifica per un team
 * @param {string} teamId - ID del team  
 * @param {string} category - Categoria da sostituire
 * @param {Array} newsDataArray - Array di dati per nuove notizie
 * @returns {Promise<Object>} Risultato operazione con conteggi
 */
    async deleteReplaceNewsByCategory(teamId, category, newsDataArray) {
        try {
            // FASE 1: Elimina notizie esistenti della categoria
            const deleteResult = await this.model.deleteMany({
                teamId: teamId,
                category: category
            });

            // FASE 2: Inserisci le nuove notizie
            const createdNews = [];
            for (const newsData of newsDataArray) {
                // Assicura che abbiano i campi obbligatori
                const newsWithMeta = {
                    ...newsData,
                    teamId: teamId,
                    category: category,
                    createdAt: new Date()
                };

                const news = await this.model.create(newsWithMeta);
                createdNews.push(news);
            }

            return {
                deletedCount: deleteResult.deletedCount,
                createdCount: createdNews.length,
                createdNews: createdNews
            };

        } catch (error) {
            throw new Error(`Errore deleteReplaceNewsByCategory in ${this.model.modelName}: ${error.message}`);
        }
    }

    /**
     * 🔍 Conta notizie per team e categoria (utility per business logic)
     * @param {string} teamId - ID del team
     * @param {string} category - Categoria (opzionale)
     * @returns {Promise<number>} Numero notizie
     */
    async countNewsByCategory(teamId, category = null) {
        try {
            const filter = { teamId };
            if (category) {
                filter.category = category;
            }

            return await this.model.countDocuments(filter);
        } catch (error) {
            throw new Error(`Errore countNewsByCategory: ${error.message}`);
        }
    }

    // =====================================
    // 🏆 QUERY PER LEADERBOARD NEWS CONTEXT
    // =====================================

    /**
     * 🏆 Recupera classifica generale team ordinata per rating
     * @param {string} teamId - ID del team
     * @param {number} limit - Numero massimo giocatori (default 10)
     * @returns {Array} Classifica ordinata (migliore → peggiore)
     */
    async getTeamLeaderboard(teamId, limit = 10) {
        const PlayerLeaderboardStats = require('../models/PlayerLeaderboardStats');
        return PlayerLeaderboardStats.find({ teamId })
            .populate('playerId', 'name email')
            .sort({ averageRating: -1 })
            .limit(limit);
    }

    /**
     * 📊 Recupera statistiche aggregate del team
     * @param {string} teamId - ID del team
     * @returns {Object} {totalPlayers, averageTeamRating}
     */
    async getTeamAggregateStats(teamId) {
        const PlayerLeaderboardStats = require('../models/PlayerLeaderboardStats');
        const result = await PlayerLeaderboardStats.aggregate([
            { $match: { teamId: teamId } },
            {
                $group: {
                    _id: null,
                    totalPlayers: { $sum: 1 },
                    averageTeamRating: { $avg: "$averageRating" }
                }
            }
        ]);

        return result.length > 0 ? result[0] : { totalPlayers: 0, averageTeamRating: 0 };
    }

    /**
     * 🔍 Trova top performers (rating alto)
     * @param {string} teamId - ID del team
     * @param {number} minRating - Rating minimo per essere top performer
     * @param {number} limit - Numero massimo risultati
     * @returns {Array} Top performers con dettagli
     */
    async getTopPerformers(teamId, minRating = 8.0, limit = 5) {
        const PlayerLeaderboardStats = require('../models/PlayerLeaderboardStats');
        return PlayerLeaderboardStats.find({
            teamId,
            averageRating: { $gte: minRating }
        })
            .populate('playerId', 'name')
            .sort({ averageRating: -1 })
            .limit(limit);
    }

    /**
     * 📉 Trova under performers (rating basso)
     * @param {string} teamId - ID del team  
     * @param {number} maxRating - Rating massimo per essere under performer
     * @param {number} limit - Numero massimo risultati
     * @returns {Array} Under performers con dettagli
     */
    async getUnderPerformers(teamId, maxRating = 6.0, limit = 3) {
        const PlayerLeaderboardStats = require('../models/PlayerLeaderboardStats');
        return PlayerLeaderboardStats.find({
            teamId,
            averageRating: { $lte: maxRating, $gt: 0 } // Esclude rating 0 (non votati)
        })
            .populate('playerId', 'name')
            .sort({ averageRating: 1 })
            .limit(limit);
    }

    /**
     * 🗑️ Elimina TUTTE le news di un team (usato a fine stagione per il reset).
     * @param {string|ObjectId} teamId
     * @returns {Promise<number>} Numero di documenti eliminati
     */
    async deleteAllForTeam(teamId) {
        const result = await this.model.deleteMany({ teamId });
        return result.deletedCount;
    }
}

module.exports = NewsRepository;