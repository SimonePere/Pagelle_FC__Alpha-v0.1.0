const BaseRepository = require('./BaseRepository');
const PlayerLeaderboardStats = require('../models/PlayerLeaderboardStats');

/**
 * 🏆 PLAYER LEADERBOARD STATS REPOSITORY - Gestione accesso dati PlayerLeaderboardStats
 * 
 * 📝 RESPONSABILITÀ:
 * - Operazioni CRUD su PlayerLeaderboardStats
 * - Query per classifiche, statistiche
 * - Aggregazioni per top players
 */
class PlayerLeaderboardStatsRepository extends BaseRepository {
    
    constructor() {
        super(PlayerLeaderboardStats);
    }

    // ================================================
    // 🎯 METODI SPECIFICI PER PLAYER LEADERBOARD STATS
    // ================================================

    /**
     * 🔍 Trova statistiche per giocatore
     * @param {string} playerId - ID giocatore
     * @returns {Object|null} Statistiche giocatore
     */
    async findByPlayer(playerId) {
        return this.findOne({ playerId });
    }

    /**
     * 🏆 Trova top giocatori per media voto
     * @param {number} limit - Numero di giocatori
     * @returns {Array} Lista top giocatori
     */
    async findTopPlayersByAverage(limit = 10) {
        return this.findAll(
            {
                totalVotes: { $gte: 3 }, // Minimo 3 voti per apparire in classifica
                averageRating: { $exists: true }
            },
            {
                sort: { averageRating: -1 },
                limit,
                populate: 'playerId'
            }
        );
    }

    /**
     * 🏆 Trova giocatori più votati
     * @param {number} limit - Numero di giocatori
     * @returns {Array} Lista giocatori più votati
     */
    async findMostVotedPlayers(limit = 10) {
        return this.findAll(
            { totalVotes: { $gt: 0 } },
            {
                sort: { totalVotes: -1 },
                limit,
                populate: 'playerId'
            }
        );
    }

    /**
     * 🔍 Trova statistiche per team
     * @param {string} teamId - ID team
     * @returns {Array} Lista statistiche giocatori del team
     */
    async findByTeam(teamId) {
        return this.aggregate([
            {
                $lookup: {
                    from: 'players',
                    localField: 'playerId',
                    foreignField: '_id',
                    as: 'playerInfo'
                }
            },
            {
                $match: {
                    'playerInfo.teamId': teamId
                }
            },
            {
                $sort: { averageRating: -1 }
            }
        ]);
    }

    /**
     * 🔄 Aggiorna statistiche giocatore
     * @param {string} playerId - ID giocatore
     * @param {Object} newStats - Nuove statistiche
     * @returns {Object} Risultato aggiornamento
     */
    async updatePlayerStats(playerId, newStats) {
        return this.model.findOneAndUpdate(
            { playerId },
            { $set: newStats },
            { 
                new: true, 
                upsert: true, // Crea se non esiste
                runValidators: true 
            }
        );
    }

    /**
     * 🔄 Incrementa contatori giocatore
     * @param {string} playerId - ID giocatore
     * @param {Object} increments - Oggetto con campi da incrementare
     * @returns {Object} Risultato aggiornamento
     */
    async incrementPlayerStats(playerId, increments) {
        return this.model.findOneAndUpdate(
            { playerId },
            { $inc: increments },
            { 
                new: true,
                upsert: true,
                runValidators: true
            }
        );
    }

    /**
     * 📊 Statistiche generali leaderboard
     * @returns {Object} Statistiche aggregate
     */
    async getLeaderboardStats() {
        const stats = await this.aggregate([
            {
                $group: {
                    _id: null,
                    totalPlayers: { $sum: 1 },
                    avgRating: { $avg: '$averageRating' },
                    totalVotes: { $sum: '$totalVotes' },
                    maxRating: { $max: '$averageRating' },
                    minRating: { $min: '$averageRating' }
                }
            }
        ]);
        
        return stats[0] || {
            totalPlayers: 0,
            avgRating: 0,
            totalVotes: 0,
            maxRating: 0,
            minRating: 0
        };
    }

    /**
     * 🔄 Reset statistiche (inizio nuova stagione)
     * @returns {Object} Risultato reset
     */
    async resetAllStats() {
        return this.updateMany(
            {},
            {
                $set: {
                    totalVotes: 0,
                    averageRating: 0,
                    lastUpdated: new Date()
                }
            }
        );
    }
}

module.exports = PlayerLeaderboardStatsRepository;