const BaseRepository = require('./BaseRepository');
const VoteSubmission = require('../models/VoteSubmission');

/**
 * 🗳️ VOTE SUBMISSION REPOSITORY - Gestione accesso dati VoteSubmission
 * 
 * 📝 RESPONSABILITÀ:
 * - Operazioni CRUD su VoteSubmission
 * - Query per sessione, utente, validazione
 * - Statistiche voti
 */
class VoteSubmissionRepository extends BaseRepository {

    constructor() {
        super(VoteSubmission);
    }

    // =========================================
    // 🎯 METODI SPECIFICI PER VOTE SUBMISSION
    // =========================================

    /**
     * 🔍 Trova submission per sessione e utente
     * @param {string} sessionId - ID sessione
     * @param {string} userId - ID utente
     * @returns {Object|null} Submission trovata
     */
    async findBySessionAndUser(sessionId, userId) {
        return this.findOne({
            votingSessionId: sessionId,
            voterId: userId
        });
    }

    /**
     * 🔍 Trova tutte le submission per sessione
     * @param {string} sessionId - ID sessione
     * @returns {Array} Lista submissions
     */
    async findBySession(sessionId) {
        return this.findAll(
            { votingSessionId: sessionId },
            {
                sort: { submittedAt: 1 },
                populate: 'voterId'
            }
        );
    }

    /**
     * 🔍 Trova submissions per utente
     * @param {string} userId - ID utente
     * @param {Object} options - Opzioni filtro
     * @returns {Array} Lista submissions dell'utente
     */
    async findByUser(userId, options = {}) {
        const filter = { userId };

        if (options.sessionId) {
            filter.votingSessionId = options.sessionId;
        }

        return this.findAll(filter, {
            sort: { submittedAt: -1 },
            limit: options.limit || null,
            populate: 'votingSessionId'
        });
    }

    /**
     * ✅ Verifica se utente ha già votato in sessione
     * @param {string} sessionId - ID sessione
     * @param {string} userId - ID utente
     * @returns {boolean} True se ha già votato
     */
    async hasUserVoted(sessionId, userId) {
        return this.exists({
            votingSessionId: sessionId,
            userId: userId
        });
    }

    /**
     * 📊 Conta voti per sessione
     * @param {string} sessionId - ID sessione
     * @returns {number} Numero di voti
     */
    async countBySession(sessionId) {
        return this.countDocuments({ votingSessionId: sessionId });
    }

    /**
     * 📊 Statistiche voti per giocatore in sessione
     * @param {string} sessionId - ID sessione
     * @returns {Array} Risultati aggregazione per giocatore
     */
    async getPlayerStatsForSession(sessionId) {
        return this.aggregate([
            { $match: { votingSessionId: sessionId } },
            { $unwind: '$votes' },
            {
                $group: {
                    _id: '$votes.playerId',
                    avgRating: { $avg: '$votes.rating' },
                    totalVotes: { $sum: 1 },
                    ratings: { $push: '$votes.rating' }
                }
            },
            { $sort: { avgRating: -1 } }
        ]);
    }
}

module.exports = VoteSubmissionRepository;