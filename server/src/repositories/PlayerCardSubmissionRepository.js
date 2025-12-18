const BaseRepository = require('./BaseRepository');
const PlayerCardSubmission = require('../models/PlayerCardSubmission');

/**
 * 🃏 PLAYER CARD SUBMISSION REPOSITORY - Gestione accesso dati PlayerCardSubmission
 * 
 * 📝 RESPONSABILITÀ:
 * - Operazioni CRUD su PlayerCardSubmission
 * - Query per match, utente, validazione
 * - Statistiche carte giocatore
 */
class PlayerCardSubmissionRepository extends BaseRepository {

    constructor() {
        super(PlayerCardSubmission);
    }

    // ===============================================
    // 🎯 METODI SPECIFICI PER PLAYER CARD SUBMISSION
    // ===============================================

    /**
     * 🔍 Trova submission per match e utente
     * @param {string} matchId - ID match
     * @param {string} userId - ID utente
     * @returns {Object|null} Submission trovata
     */
    async findByMatchAndUser(matchId, userId) {
        return this.findOne({
            matchId: matchId,
            userId: userId
        });
    }

    /**
     * 🔍 Trova tutte le submission per match
     * @param {string} matchId - ID match
     * @returns {Array} Lista submissions
     */
    async findByMatch(matchId) {
        return this.findAll(
            { matchId },
            {
                sort: { submittedAt: 1 },
                populate: 'userId matchId'
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

        if (options.matchId) {
            filter.matchId = options.matchId;
        }

        if (options.status) {
            filter.status = options.status;
        }

        return this.findAll(filter, {
            sort: { submittedAt: -1 },
            limit: options.limit || null,
            populate: 'matchId'
        });
    }

    /**
     * ✅ Verifica se utente ha già inviato carta per match
     * @param {string} matchId - ID match
     * @param {string} userId - ID utente
     * @returns {boolean} True se ha già inviato
     */
    async hasUserSubmittedForMatch(matchId, userId) {
        return this.exists({
            matchId: matchId,
            userId: userId
        });
    }

    /**
     * 📊 Conta submissions per match
     * @param {string} matchId - ID match
     * @returns {number} Numero di submissions
     */
    async countByMatch(matchId) {
        return this.countDocuments({ matchId });
    }

    /**
     * 🔍 Trova submissions pendenti
     * @returns {Array} Lista submissions pendenti
     */
    async findPendingSubmissions() {
        return this.findAll(
            { status: 'pending' },
            {
                sort: { submittedAt: 1 },
                populate: 'userId matchId'
            }
        );
    }

    /**
     * 🔄 Aggiorna stato submission
     * @param {string} submissionId - ID submission
     * @param {string} status - Nuovo stato
     * @param {Object} additionalData - Dati aggiuntivi
     * @returns {Object|null} Submission aggiornata
     */
    async updateStatus(submissionId, status, additionalData = {}) {
        const updateData = { status, ...additionalData };

        if (status === 'processed') {
            updateData.processedAt = new Date();
        }

        return this.updateById(submissionId, updateData);
    }

    /**
     * 📊 Statistiche submissions per periodo
     * @param {Date} startDate - Data inizio
     * @param {Date} endDate - Data fine
     * @returns {Array} Risultati aggregazione
     */
    async getSubmissionStats(startDate, endDate) {
        return this.aggregate([
            {
                $match: {
                    submittedAt: {
                        $gte: startDate,
                        $lte: endDate
                    }
                }
            },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);
    }
}

module.exports = PlayerCardSubmissionRepository;