// services/LeaderboardService.js

// 🎯 REPOSITORY PATTERN - Accesso dati tramite Repository
const {
    PlayerLeaderboardStatsRepository,
    PlayerSeasonStatsRepository
} = require('../repositories');

const NewsService = require('./NewsService');


const AppError = require('../utils/AppError');

/**
 * LEADERBOARD SERVICE
 * 
 * 🔄 AGGIORNATO CON REPOSITORY PATTERN:
 * - Non accede più direttamente ai Model Mongoose
 * - Usa Repository per separare data access da business logic
 * 
 * Gestisce la business logic per tutte le classifiche del team:
 * - Rating (voto medio)
 * - Goals (gol totali)
 * - Assists (assist totali)  
 * - PlayerCard (overall rating)
 * - Goals per Match (media gol per partita)
 */
class LeaderboardService {

    /**
     * 🏗️ Costruttore - Inizializza i repository
     */
    constructor() {
        // Inizializza i repository per accesso dati
        this.playerStatsRepository = new PlayerLeaderboardStatsRepository();
        this.playerSeasonStatsRepository = new PlayerSeasonStatsRepository();
        this.newsService = new NewsService();


        // Standard fields per consistency
        this.STANDARD_FIELDS = 'playerId playerName totalMatches totalGoals totalAssists averageRating playerCardTOT playerCardAverage goalPerMatch assistPerMatch';
    }

    /**
     * Ottiene una classifica specifica per il team
     * @param {string} teamId - ID del team
     * @param {string} type - Tipo classifica: 'rating'|'goals'|'assists'|'playercard'|'goalPerMatch'|'assistPerMatch'
     * @param {number} limit - Numero massimo risultati
     * @param {string|null} seasonId - Stagione "YYYY-YY" oppure null (lifetime, default)
     * @returns {Promise<Object>} Classifica con metadati
     */
    async getLeaderboard(teamId, type, limit = 10, seasonId = null) {
        // Input validation
        this.validateLeaderboardInput(teamId, type, limit);

        // Se richiesta una stagione specifica, usa PlayerSeasonStats
        if (seasonId) {
            return this._getSeasonLeaderboard(teamId, type, limit, seasonId);
        }

        // Comportamento storico: usa PlayerLeaderboardStats (lifetime)
        // Build query based on type
        const queryConfig = this.buildLeaderboardQuery(teamId, type);

        // Execute query
        // 🎯 USA REPOSITORY invece di Model diretto
        const players = await this.playerStatsRepository.findAll(
            queryConfig.filter,
            {
                sort: queryConfig.sort,
                limit: limit,
                select: this.STANDARD_FIELDS
            }
        );

        return {
            success: true,
            data: players,
            type: type,
            metadata: {
                teamId,
                limit,
                count: players.length
            }
        };
    }

    /**
     * Classifica season-scoped da PlayerSeasonStats.
     *
     * Tipi supportati: rating, goals, assists → ordinati lato DB.
     * goalPerMatch, assistPerMatch → calcolati in JS (piccolo dataset).
     * playercard, form → non in PlayerSeasonStats → fallback lifetime.
     *
     * @private
     */
    async _getSeasonLeaderboard(teamId, type, limit, seasonId) {
        // playercard e form non sono in PlayerSeasonStats → lifetime
        if (type === 'playercard' || type === 'form') {
            const queryConfig = this.buildLeaderboardQuery(teamId, type);
            const players = await this.playerStatsRepository.findAll(
                queryConfig.filter,
                { sort: queryConfig.sort, limit, select: this.STANDARD_FIELDS }
            );
            return {
                success: true,
                data: players,
                type,
                seasonId: null,
                metadata: { teamId, limit, count: players.length, note: 'playercard non stagionale, dati lifetime' }
            };
        }

        const sortMap = {
            rating: { averageRating: -1 },
            goals: { totalGoals: -1, averageRating: -1 },
            assists: { totalAssists: -1, averageRating: -1 }
        };

        let players;

        if (sortMap[type]) {
            // Query diretta con sort DB
            const raw = await this.playerSeasonStatsRepository.findAll(
                { teamId, seasonId },
                { sort: sortMap[type], limit }
            );
            // Normalizza: PlayerSeasonStats usa 'matchesPlayed', il frontend si aspetta 'totalMatches'
            players = raw.map(p => {
                const plain = p.toObject ? p.toObject() : { ...p };
                plain.totalMatches = plain.matchesPlayed ?? 0;
                return plain;
            });
        } else if (type === 'goalPerMatch' || type === 'assistPerMatch') {
            // Calcolo ratio in JS (dataset piccolo).
            // Calcoliamo SEMPRE entrambi i ratios (goalPerMatch + assistPerMatch) in un unico
            // passaggio: quando il controller chiama stat=both usa solo goalPerMatch come tipo
            // principale per l'ordinamento, ma il frontend legge entrambi i campi dalla stessa riga.
            const all = await this.playerSeasonStatsRepository.findAll({ teamId, seasonId });
            players = all
                .map(p => {
                    const plain = p.toObject ? p.toObject() : { ...p };
                    const played = plain.matchesPlayed ?? 0;
                    plain.totalMatches = played;   // alias atteso dal frontend
                    plain.goalPerMatch = played > 0
                        ? Number((plain.totalGoals / played).toFixed(2))
                        : 0;
                    plain.assistPerMatch = played > 0
                        ? Number((plain.totalAssists / played).toFixed(2))
                        : 0;
                    return plain;
                })
                .sort((a, b) => b[type] - a[type])
                .slice(0, limit);
        } else {
            // Tipo sconosciuto — delega al comportamento lifetime
            return this.getLeaderboard(teamId, type, limit, null);
        }

        return {
            success: true,
            data: players,
            type,
            seasonId,
            metadata: { teamId, limit, count: players.length, season: seasonId }
        };
    }


    /**
     * IMPORTANTE: AL MOMENTO QUESTO METODO NON E' UTILIZZATO, viene utilizzato invece getLeaderboard con tipo (es) 'playercard' e 'goalPerMatch'
     * Ottiene tutte le classifiche del team (OTTIMIZZATO)
     * @param {string} teamId - ID del team  
     * @param {number} limit - Numero massimo risultati per classifica
     * @returns {Promise<Object>} Tutte le classifiche
     */
    async getAllLeaderboards(teamId, limit = 5) {
        // Input validation
        this.validateTeamId(teamId);
        this.validateLimit(limit);

        try {
            // Main aggregation per rating, goals, assists (filtro uguale)
            // 🎯 USA REPOSITORY per aggregazione
            const [mainResult] = await this.playerStatsRepository.aggregate([
                {
                    $match: {
                        teamId: teamId,
                        isActive: true
                    }
                },
                {
                    $facet: {
                        // 1. Classifica Rating
                        rating: [
                            { $sort: { averageRating: -1 } },
                            { $limit: limit },
                            { $project: this.getProjectionFields() }
                        ],
                        // 2. Classifica Goals (con tie-break rating)
                        goals: [
                            { $sort: { totalGoals: -1, averageRating: -1 } },
                            { $limit: limit },
                            { $project: this.getProjectionFields() }
                        ],
                        // 3. Classifica Assists (con tie-break rating)
                        assists: [
                            { $sort: { totalAssists: -1, averageRating: -1 } },
                            { $limit: limit },
                            { $project: this.getProjectionFields() }
                        ]
                    }
                }
            ]);

            // Separata aggregation per PlayerCard (filtro diverso)
            const playercardResult = await this.getPlayercardLeaderboard(teamId, limit);

            // Separata aggregation per Form (filtro diverso)  
            const formResult = await this.getFormLeaderboard(teamId, limit);

            return {
                success: true,
                data: {
                    rating: mainResult.rating,
                    goals: mainResult.goals,
                    assists: mainResult.assists,
                    playercard: playercardResult,
                    form: formResult
                },
                metadata: {
                    teamId,
                    limit,
                    timestamp: new Date().toISOString(),
                    performance: 'optimized_aggregation'
                }
            };

        } catch (error) {
            throw new AppError(`Failed to fetch leaderboards for team ${teamId}: ${error.message}`, 500);
        }
    }

    /**
     * Builds query configuration for specific leaderboard type
     */
    buildLeaderboardQuery(teamId, type) {
        const baseFilter = { teamId, isActive: true };

        const configs = {
            rating: {
                filter: baseFilter,
                sort: { averageRating: -1 }
            },
            goals: {
                filter: baseFilter,
                sort: { totalGoals: -1, averageRating: -1 }
            },
            assists: {
                filter: baseFilter,
                sort: { totalAssists: -1, averageRating: -1 }
            },
            playercard: {
                filter: {
                    ...baseFilter,
                    $or: [
                        { playerCardAverage: { $ne: null, $gt: 0 } },
                        { playerCardTOT: { $ne: null, $gt: 0 } }
                    ]
                },
                sort: { playerCardAverage: -1, playerCardTOT: -1 }
            },
            form: {
                filter: {
                    ...baseFilter,
                    $or: [
                        { formRating: { $ne: null, $gt: 0 } },
                        { $expr: { $gte: [{ $size: "$recentForm" }, 3] } }
                    ]
                },
                sort: { formRating: -1, averageRating: -1 }
            },
            goalPerMatch: {
                filter: baseFilter,
                sort: { goalPerMatch: -1, totalGoals: -1, averageRating: -1 }
            },
            assistPerMatch: {
                filter: baseFilter,
                sort: { assistPerMatch: -1, totalAssists: -1, averageRating: -1 }
            },
        };

        const config = configs[type];
        if (!config) {
            throw new AppError(`Invalid leaderboard type: ${type}`, 400);
        }

        return config;
    }

    /**
     * Get PlayerCard leaderboard with specific filter
     */
    async getPlayercardLeaderboard(teamId, limit) {
        // 🎯 USA REPOSITORY per aggregazione
        return await this.playerStatsRepository.aggregate([
            {
                $match: {
                    teamId: teamId,
                    isActive: true,
                    playerCardAverage: { $ne: null, $gt: 0 }
                }
            },
            { $sort: { playerCardAverage: -1, playerCardTOT: -1 } },
            { $limit: limit },
            { $project: this.getProjectionFields() }
        ]);
    }

    /**
     * Get Form leaderboard with specific filter
     */
    async getFormLeaderboard(teamId, limit) {
        // 🎯 USA REPOSITORY per aggregazione
        return await this.playerStatsRepository.aggregate([
            {
                $match: {
                    teamId: teamId,
                    isActive: true,
                    formRating: { $ne: null, $gt: 0 }
                }
            },
            { $sort: { formRating: -1, averageRating: -1 } },
            { $limit: limit },
            { $project: this.getProjectionFields() }
        ]);
    }

    /**
     * Standard projection fields for aggregations
     */
    getProjectionFields() {
        return {
            playerId: 1,
            playerName: 1,
            totalMatches: 1,
            totalGoals: 1,
            totalAssists: 1,
            averageRating: 1,
            playerCardTOT: 1,
            playerCardAverage: 1,
            formRating: 1,
            recentForm: 1
        };
    }

    /**
     * Input validation methods
     */
    validateLeaderboardInput(teamId, type, limit) {
        this.validateTeamId(teamId);
        this.validateType(type);
        this.validateLimit(limit);
    }

    validateTeamId(teamId) {
        if (!teamId || typeof teamId !== 'string') {
            throw new AppError('Team ID is required and must be a string', 400);
        }
    }

    validateType(type) {
        const validTypes = ['rating', 'goals', 'assists', 'playercard', 'goalPerMatch', 'assistPerMatch'];
        if (!type || !validTypes.includes(type)) {
            throw new AppError(`Invalid leaderboard type. Must be one of: ${validTypes.join(', ')}`, 400);
        }
    }

    validateLimit(limit) {
        const numLimit = parseInt(limit);
        if (isNaN(numLimit) || numLimit < 1 || numLimit > 100) {
            throw new AppError('Limit must be a number between 1 and 100', 400);
        }
    }
}

module.exports = LeaderboardService;