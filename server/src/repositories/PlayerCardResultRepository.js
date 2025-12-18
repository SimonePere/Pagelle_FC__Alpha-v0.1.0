const BaseRepository = require('./BaseRepository');
const PlayerCardResult = require('../models/PlayerCardResult');

/**
 * 🃏 PLAYER CARD RESULT REPOSITORY - Gestione accesso dati PlayerCardResult
 * 
 * 📝 RESPONSABILITÀ:
 * - Operazioni CRUD su PlayerCardResult
 * - Query per match, giocatore, risultati
 * - Statistiche carte giocatore
 */
class PlayerCardResultRepository extends BaseRepository {

    constructor() {
        super(PlayerCardResult);
    }

    // ==========================================
    // 🎯 METODI SPECIFICI PER PLAYER CARD RESULT
    // ==========================================

    /**
     * 🔍 Trova risultati per match
     * @param {string} matchId - ID match
     * @returns {Array} Lista risultati del match
     */
    async findByMatch(matchId) {
        return this.findAll(
            { matchId },
            {
                sort: { createdAt: -1 },
                populate: 'matchId playerId'
            }
        );
    }

    /**
     * 🔍 Trova risultati per giocatore
     * @param {string} playerId - ID giocatore
     * @param {Object} options - Opzioni filtro
     * @returns {Array} Lista risultati del giocatore
     */
    async findByPlayer(playerId, options = {}) {
        const filter = { playerId };

        if (options.matchId) {
            filter.matchId = options.matchId;
        }

        return this.findAll(filter, {
            sort: { createdAt: -1 },
            limit: options.limit || null,
            populate: 'matchId'
        });
    }

    /**
     * 🔍 Trova risultato specifico
     * @param {string} matchId - ID match
     * @param {string} playerId - ID giocatore
     * @returns {Object|null} Risultato trovato
     */
    async findByMatchAndPlayer(matchId, playerId) {
        return this.findOne({
            matchId,
            playerId
        });
    }

    /**
     * 📊 Top carte per match
     * @param {string} matchId - ID match
     * @param {number} limit - Limite risultati
     * @returns {Array} Top carte ordinate per voto
     */
    async findTopCardsForMatch(matchId, limit = 10) {
        return this.findAll(
            { matchId },
            {
                sort: { averageRating: -1 },
                limit,
                populate: 'playerId matchId'
            }
        );
    }

    /**
     * 📊 Statistiche carte per periodo
     * @param {Date} startDate - Data inizio
     * @param {Date} endDate - Data fine
     * @returns {Array} Risultati aggregazione
     */
    async getCardStats(startDate, endDate) {
        return this.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: startDate,
                        $lte: endDate
                    }
                }
            },
            {
                $group: {
                    _id: '$playerId',
                    totalCards: { $sum: 1 },
                    avgRating: { $avg: '$averageRating' },
                    bestRating: { $max: '$averageRating' },
                    totalVotes: { $sum: '$totalVotes' }
                }
            },
            { $sort: { avgRating: -1 } }
        ]);
    }

    /**
     * Crea un nuovo PlayerCardResult usando il metodo statico del Model
     * @param {string} sessionId 
     * @param {string} targetPlayerId 
     * @param {Object} aggregatedData 
     * @param {number} totalSubmissions 
     * @returns {Promise<Object>} PlayerCardResult creato e salvato
     */
    async createPlayerCardResult(sessionId, targetPlayerId, aggregatedData, totalSubmissions) {
        const playerCardResult = await PlayerCardResult.createPlayerCardResult(
            sessionId,
            targetPlayerId,
            aggregatedData,
            totalSubmissions
        );

        return playerCardResult; // Il metodo statico già salva automaticamente
    }
}

module.exports = PlayerCardResultRepository;