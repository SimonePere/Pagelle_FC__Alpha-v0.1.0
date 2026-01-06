const BaseRepository = require('./BaseRepository');
const VotingSession = require('../models/VotingSession');

/**
 * 🗳️ VOTING SESSION REPOSITORY - Gestione accesso dati VotingSession
 * 
 * 📝 RESPONSABILITÀ:
 * - Operazioni CRUD su VotingSession
 * - Query per sessioni attive/completate
 * - Ricerca per match, stato, date
 */
class VotingSessionRepository extends BaseRepository {

    constructor() {
        super(VotingSession);
    }

    // ======================================
    // 🎯 METODI SPECIFICI PER VOTING SESSION
    // ======================================

    /**
     * 🔍 Trova sessioni per match
     * @param {string} matchId - ID del match
     * @returns {Array} Lista sessioni del match
     */
    async findByMatch(matchId) {
        return this.findAll(
            { targetId: matchId },
            {
                sort: { createdAt: -1 },
                populate: 'targetId'
            }
        );
    }

    /**
     * 🔍 Trova singola voting session con nomi sia per eligible voters che abstained (se ci sono)
     * @param {string} sessionId - ID della sessione
     * @returns {Object} Sessione con utenti popolati
     */
    async findByIdWithUsernames(sessionId) {
        return this.model
            .findById(sessionId)
            .populate({
                path: 'eligibleVoters',
                select: 'name teamName',

            })
            .populate({
                path: 'abstainedUsers.userId',
                select: 'name teamName',

            })
            .populate({
                path: 'abstainedUsers.abstainedBy',
                select: 'name',
            });
    };

    /**
     * 🔍 Trova sessioni attive
     * @returns {Array} Lista sessioni attive
     */
    async findActiveSessions() {
        return this.findAll(
            { status: 'active' },
            {
                sort: { createdAt: -1 },
                populate: 'targetId'
            }
        );
    }

    /**
     * 🔍 Trova sessioni completate
     * @param {Object} options - Opzioni filtro
     * @returns {Array} Lista sessioni completate
     */
    async findCompletedSessions(options = {}) {
        const filter = { status: 'completed' };

        if (options.matchId) {
            filter.targetId = options.matchId;
        }

        if (options.dateRange) {
            filter.createdAt = {
                $gte: options.dateRange.start,
                $lte: options.dateRange.end
            };
        }

        return this.findAll(filter, {
            sort: { completedAt: -1 },
            limit: options.limit || null,
            populate: 'targetId'
        });
    }

    /**
     * 🔍 Trova ultima sessione per match
     * @param {string} matchId - ID del match
     * @returns {Object|null} Ultima sessione del match
     */
    async findLatestByMatch(matchId) {
        return this.findOne(
            { targetId: matchId },
            {
                sort: { createdAt: -1 },
                populate: 'targetId'
            }
        );
    }

    /**
     * 📊 Conta voti per sessione
     * @param {string} sessionId - ID sessione
     * @returns {number} Numero di voti
     */
    async countVotesForSession(sessionId) {
        const session = await this.findById(sessionId);
        return session ? session.totalVotes || 0 : 0;
    }

    /**
     * 🔄 Aggiorna stato sessione
     * @param {string} sessionId - ID sessione
     * @param {string} status - Nuovo stato
     * @param {Object} additionalData - Dati aggiuntivi (es. completedAt)
     * @returns {Object|null} Sessione aggiornata
     */
    async updateStatus(sessionId, status, additionalData = {}) {
        const updateData = { status, ...additionalData };

        if (status === 'completed' && !additionalData.completedAt) {
            updateData.completedAt = new Date();
        }

        return this.updateById(sessionId, updateData);
    }

    /**
     * 📊 Statistiche sessioni per periodo
     * @param {Date} startDate - Data inizio
     * @param {Date} endDate - Data fine
     * @returns {Array} Risultati aggregazione
     */
    async getSessionStats(startDate, endDate) {
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
                    _id: '$status',
                    count: { $sum: 1 },
                    totalVotes: { $sum: '$totalVotes' },
                    avgVotes: { $avg: '$totalVotes' }
                }
            },
            { $sort: { count: -1 } }
        ]);
    }
}

module.exports = VotingSessionRepository;