const BaseRepository = require('./BaseRepository');
const VoteResult = require('../models/VoteResult');

class VoteResultRepository extends BaseRepository {
    constructor() {
        super(VoteResult);
    }

    /**
     * Trova un risultato per votingSessionId
     * @param {string} votingSessionId 
     * @param {Object} projection 
     * @returns {Promise<Object|null>}
     */
    async findByVotingSession(votingSessionId, projection = {}) {
        return await this.model.findOne({
            votingSessionId: votingSessionId
        }, projection);
    }

    /**
     * Trova risultati per sessionType specifico
     * @param {string} votingSessionId 
     * @param {string} sessionType 
     * @returns {Promise<Object|null>}
     */
    async findBySessionType(votingSessionId, sessionType) {
        return await this.model.findOne({
            votingSessionId: votingSessionId,
            'sessionMetadata.sessionType': sessionType
        });
    }

    /**
     * Crea un nuovo risultato usando il metodo statico del Model
     * @param {string} sessionId 
     * @param {Object} finalResults 
     * @param {number} submissionsCount 
     * @returns {Object} Nuovo VoteResult (non salvato)
     */
    createMatchRatingResult(sessionId, finalResults, submissionsCount) {
        return VoteResult.createMatchRatingResult(sessionId, finalResults, submissionsCount);
    }

    /**
     * Trova risultati per team specifico
     * @param {string} teamId 
     * @param {Object} options 
     * @returns {Promise<Array>}
     */
    async findByTeam(teamId, options = {}) {
        const query = {
            'sessionMetadata.teamId': teamId
        };

        if (options.limit) {
            return await this.model.find(query)
                .sort({ createdAt: -1 })
                .limit(options.limit);
        }

        return await this.model.find(query).sort({ createdAt: -1 });
    }
}

module.exports = VoteResultRepository;