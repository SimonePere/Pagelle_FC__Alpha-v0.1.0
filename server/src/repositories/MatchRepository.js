const BaseRepository = require('./BaseRepository');
const Match = require('../models/Match');

/**
 * ⚽ MATCH REPOSITORY - Gestione accesso dati Match
 * 
 * 📝 RESPONSABILITÀ:
 * - Operazioni CRUD su Match
 * - Query per partite per data, team, stagione
 * - Ricerca partite attive/completate
 */
class MatchRepository extends BaseRepository {
    
    constructor() {
        super(Match);
    }

    // ==============================
    // 🎯 METODI SPECIFICI PER MATCH
    // ==============================

    /**
     * 🔍 Trova partite per data
     * @param {Date} date - Data partita
     * @returns {Array} Lista partite
     */
    async findByDate(date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        return this.findAll({
            date: {
                $gte: startOfDay,
                $lte: endOfDay
            }
        }, {
            sort: { date: 1 },
            populate: 'homeTeam awayTeam'
        });
    }

    /**
     * 🔍 Trova partite per team
     * @param {string} teamId - ID del team
     * @returns {Array} Lista partite del team
     */
    async findByTeam(teamId) {
        return this.findAll({
            $or: [
                { homeTeam: teamId },
                { awayTeam: teamId }
            ]
        }, {
            sort: { date: -1 },
            populate: 'homeTeam awayTeam'
        });
    }

    /**
     * 🔍 Trova partite attive (in corso)
     * @returns {Array} Lista partite attive
     */
    async findActiveMatches() {
        return this.findAll({
            status: 'in_progress'
        }, {
            sort: { date: 1 },
            populate: 'homeTeam awayTeam'
        });
    }

    /**
     * 🔍 Trova partite completate
     * @param {Object} options - Opzioni filtro (limit, team, dateRange)
     * @returns {Array} Lista partite completate
     */
    async findCompletedMatches(options = {}) {
        const filter = { status: 'completed' };
        
        if (options.team) {
            filter.$or = [
                { homeTeam: options.team },
                { awayTeam: options.team }
            ];
        }
        
        if (options.dateRange) {
            filter.date = {
                $gte: options.dateRange.start,
                $lte: options.dateRange.end
            };
        }

        return this.findAll(filter, {
            sort: { date: -1 },
            limit: options.limit || null,
            populate: 'homeTeam awayTeam'
        });
    }

    /**
     * 🔍 Trova prossime partite
     * @param {number} limit - Numero massimo di partite
     * @returns {Array} Lista prossime partite
     */
    async findUpcomingMatches(limit = 10) {
        return this.findAll({
            date: { $gte: new Date() },
            status: { $in: ['scheduled', 'not_started'] }
        }, {
            sort: { date: 1 },
            limit,
            populate: 'homeTeam awayTeam'
        });
    }

    /**
     * 📊 Trova statistiche partite per stagione
     * @param {string} season - Stagione (es. '2024-25')
     * @returns {Array} Risultati aggregazione
     */
    async getMatchStatsBySeason(season) {
        return this.aggregate([
            { $match: { season: season } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    matches: { $push: '$_id' }
                }
            },
            { $sort: { count: -1 } }
        ]);
    }
}

module.exports = MatchRepository;