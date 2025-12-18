const BaseRepository = require('./BaseRepository');
const Team = require('../models/Team');

/**
 * ⚽ TEAM REPOSITORY - Gestione accesso dati Team
 * 
 * 📝 RESPONSABILITÀ:
 * - Operazioni CRUD su Team
 * - Query per nome, stato, statistiche
 * - Ricerca giocatori per team
 */
class TeamRepository extends BaseRepository {

    constructor() {
        super(Team);
    }

    // =============================
    // 🎯 METODI SPECIFICI PER TEAM
    // =============================

    /**
     * 🔍 Trova team per nome
     * @param {string} name - Nome team
     * @returns {Object|null} Team trovato
     */
    async findByName(name) {
        return this.findOne({ name });
    }

    /**
     * 🔍 Trova team attivi
     * @returns {Array} Lista team attivi
     */
    async findActiveTeams() {
        return this.findAll(
            { isActive: true },
            {
                sort: { name: 1 },
                select: 'name description isActive createdAt'
            }
        );
    }

    /**
     * ✅ Verifica se nome team esiste già
     * @param {string} name - Nome da verificare
     * @param {string} excludeId - ID team da escludere (per update)
     * @returns {boolean} True se nome già in uso
     */
    async nameExists(name, excludeId = null) {
        const filter = { name };
        if (excludeId) {
            filter._id = { $ne: excludeId };
        }
        return this.exists(filter);
    }

    /**
     * 📊 Statistiche team
     * @param {string} teamId - ID team
     * @returns {Object} Statistiche aggregate
     */
    async getTeamStats(teamId) {
        // Esempio di aggregazione custom per team
        return this.aggregate([
            { $match: { _id: teamId } },
            {
                $lookup: {
                    from: 'matches',
                    let: { teamId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $or: [
                                        { $eq: ['$homeTeam', '$$teamId'] },
                                        { $eq: ['$awayTeam', '$$teamId'] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'matches'
                }
            },
            {
                $project: {
                    name: 1,
                    totalMatches: { $size: '$matches' },
                    wins: {
                        $size: {
                            $filter: {
                                input: '$matches',
                                cond: { $eq: ['$$this.winner', '$_id'] }
                            }
                        }
                    }
                }
            }
        ]);
    }
}

module.exports = TeamRepository;