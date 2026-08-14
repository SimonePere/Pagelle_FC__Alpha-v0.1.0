// controllers/LeaderboardController.js
const LeaderboardService = require('../services/LeaderboardService');
const CacheService = require("../services/CacheService");
const SeasonService = require('../services/SeasonService');
const { UserRepository } = require('../repositories');

/**
 * LEADERBOARD CONTROLLER
 *
 * Orchestration-only controller che delega tutta la business logic
 * al LeaderboardService. Gestisce solo HTTP request/response.
 *
 * Endpoint supportati:
 * - GET /leaderboard/:teamId/rating
 * - GET /leaderboard/:teamId/goals
 * - GET /leaderboard/:teamId/assists
 * - GET /leaderboard/:teamId/playercard
 * - GET /leaderboard/:teamId/goals-per-match
 * - GET /leaderboard/:teamId/all
 *
 * Parametro opzionale (Fase 4): ?season=YYYY-YY|current|all
 * Default = stagione corrente. ?season=all → dati lifetime (legacy).
 */

// Initialize services
const leaderboardService = new LeaderboardService();
const seasonService = new SeasonService();

/**
 * Helper locale: parsing + validazione del parametro ?season=
 * Restituisce { seasonId, seasonKey } oppure lancia e risponde 400.
 */
function parseSeasonParam(req, res) {
    try {
        const seasonId = seasonService.resolveSeasonParam(req.query.season);
        const seasonKey = seasonId || 'all';
        return { seasonId, seasonKey };
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
        return null;
    }
}

/**
 * Arricchisce il result della classifica con avatarUpdatedAt di ogni giocatore.
 * Usa batch-lookup su User per evitare N query in loop.
 * Pattern identico a AwardService._buildCandidates.
 * 
 * @private
 */
async function enrichLeaderboardWithAvatars(result) {
    if (!result || !result.data || result.data.length === 0) {
        return result;
    }

    try {
        // Estrai tutti i playerId dalla classifica
        const playerIds = result.data
            .filter(p => p.playerId)
            .map(p => p.playerId);

        if (playerIds.length === 0) {
            return result;
        }

        // Batch lookup su User: query singola con $in
        const userRepository = new UserRepository();
        const users = await userRepository.findAll(
            { _id: { $in: playerIds } },
            { select: 'profile.avatarUpdatedAt' }
        );

        // Mappa per lookup O(1): chiave = id stringa (ObjectId.toString())
        const userMap = new Map(users.map(u => [u._id.toString(), u]));

        // Arricchisci ogni entry con avatarUpdatedAt
        for (const player of result.data) {
            const user = userMap.get(player.playerId.toString());
            if (user && user.profile && user.profile.avatarUpdatedAt) {
                player.avatarUpdatedAt = user.profile.avatarUpdatedAt;
            }
        }
    } catch (err) {
        // Non-bloccante: se il lookup fallisce, la classifica rimane comunque valida senza avatar
        console.warn('[LeaderboardController] Avatar enrichment fallito:', err.message);
    }

    return result;
}

// === CLASSIFICA RATING (+ CACHE) ===
exports.getRatingLeaderboard = async (req, res, next) => {
    try {
        const { teamId } = req.params;
        const limit = parseInt(req.query.limit) || 10;
        const parsed = parseSeasonParam(req, res);
        if (!parsed) return;
        const { seasonId, seasonKey } = parsed;

        const cacheKey = `leaderboard:rating:${teamId}:season:${seasonKey}:limit${limit}`;

        const cached = await CacheService.get(cacheKey);
        if (cached) {
            console.log(`⚡ CLASSIFICA RAPIDA: Rating team ${teamId} season=${seasonKey} dalla cache`);
            return res.json({ ...cached, source: 'cache', cached: true });
        }

        console.log(`🗄️ CLASSIFICA DA DATABASE: Rating team ${teamId} season=${seasonKey}...`);
        const result = await leaderboardService.getLeaderboard(teamId, 'rating', limit, seasonId);
        await enrichLeaderboardWithAvatars(result);

        await CacheService.set(cacheKey, result, 30 * 60, [`team:${teamId}`, 'leaderboard', 'rating']);

        res.json({ ...result, source: 'database', cached: false });

    } catch (error) {
        next(error);
    }
};

// === CLASSIFICA GOL (+ CACHE) ===
exports.getGoalsLeaderboard = async (req, res, next) => {
    try {
        const { teamId } = req.params;
        const limit = parseInt(req.query.limit) || 10;
        const parsed = parseSeasonParam(req, res);
        if (!parsed) return;
        const { seasonId, seasonKey } = parsed;

        const cacheKey = `leaderboard:goals:${teamId}:season:${seasonKey}:limit${limit}`;

        const cached = await CacheService.get(cacheKey);
        if (cached) {
            console.log(`⚡ Cache HIT: Goals leaderboard team ${teamId} season=${seasonKey}`);
            return res.json({ ...cached, source: 'cache', cached: true });
        }

        console.log(`🗄️ Cache MISS: Fetching goals leaderboard team ${teamId} season=${seasonKey}`);
        const result = await leaderboardService.getLeaderboard(teamId, 'goals', limit, seasonId);
        await enrichLeaderboardWithAvatars(result);

        await CacheService.set(cacheKey, result, 30 * 60, [`team:${teamId}`, 'leaderboard', 'goals']);

        res.json({ ...result, source: 'database', cached: false });

    } catch (error) {
        next(error);
    }
};

// === CLASSIFICA ASSIST (+ CACHE) ===
exports.getAssistsLeaderboard = async (req, res, next) => {
    try {
        const { teamId } = req.params;
        const limit = parseInt(req.query.limit) || 10;
        const parsed = parseSeasonParam(req, res);
        if (!parsed) return;
        const { seasonId, seasonKey } = parsed;

        const cacheKey = `leaderboard:assists:${teamId}:season:${seasonKey}:limit${limit}`;

        const cached = await CacheService.get(cacheKey);
        if (cached) {
            console.log(`⚡ Cache HIT: Assists leaderboard team ${teamId} season=${seasonKey}`);
            return res.json({ ...cached, source: 'cache', cached: true });
        }

        console.log(`🗄️ Cache MISS: Fetching assists leaderboard team ${teamId} season=${seasonKey}`);
        const result = await leaderboardService.getLeaderboard(teamId, 'assists', limit, seasonId);
        await enrichLeaderboardWithAvatars(result);

        await CacheService.set(cacheKey, result, 30 * 60, [`team:${teamId}`, 'leaderboard', 'assists']);

        res.json({ ...result, source: 'database', cached: false });

    } catch (error) {
        next(error);
    }
};

// === CLASSIFICA PLAYERCARD ===
// I dati carta (playerCardTOT) vengono da PlayerLeaderboardStats (lifetime), non da
// PlayerSeasonStats. Tuttavia il parametro ?season= viene passato a LeaderboardService
// perché _getSeasonLeaderboard applica i bonus GoldenTot (Pallone d'Oro / Scarpa d'Oro)
// quando è selezionata una stagione specifica. Senza ?season= (o ?season=all) → lifetime puro.
exports.getPlayercardLeaderboard = async (req, res, next) => {
    try {
        const { teamId } = req.params;
        const limit = parseInt(req.query.limit) || 10;

        const parsed = parseSeasonParam(req, res);
        if (!parsed) return;
        const { seasonId, seasonKey } = parsed;

        const cacheKey = `leaderboard:playercard:${teamId}:season:${seasonKey}:limit${limit}`;
        const cached = await CacheService.get(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        const result = await leaderboardService.getLeaderboard(teamId, 'playercard', limit, seasonId);
        await enrichLeaderboardWithAvatars(result);

        await CacheService.set(cacheKey, result, 30 * 60, [`team:${teamId}`, 'leaderboard', 'playercard']);
        res.json(result);

    } catch (error) {
        next(error);
    }
};

// === MEDIA GOLxPARTITA ===
exports.getStatsPerMatchLeaderboard = async (req, res, next) => {
    try {
        const { teamId } = req.params;
        const stat = req.query.stat || 'goals';
        const limit = parseInt(req.query.limit) || 10;
        const parsed = parseSeasonParam(req, res);
        if (!parsed) return;
        const { seasonId } = parsed;

        if (!['goals', 'assists', 'both'].includes(stat)) {
            return res.status(400).json({
                success: false,
                message: 'stat deve essere: "goals", "assists", oppure "both"'
            });
        }

        let result;
        if (stat === 'goals') {
            result = await leaderboardService.getLeaderboard(teamId, 'goalPerMatch', limit, seasonId);
        } else if (stat === 'assists') {
            result = await leaderboardService.getLeaderboard(teamId, 'assistPerMatch', limit, seasonId);
        } else {
            result = await leaderboardService.getLeaderboard(teamId, 'goalPerMatch', limit, seasonId);
        }
        await enrichLeaderboardWithAvatars(result);

        res.json(result);

    } catch (error) {
        next(error);
    }
};


// === TUTTE LE CLASSIFICHE (OTTIMIZZATO + CACHE) ===
// * IMPORTANTE: AL MOMENTO QUESTO METODO NON E' UTILIZZATO,
// viene utilizzato invece getLeaderboard con tipo (es) 'playercard' e 'goalPerMatch'
exports.getAllLeaderboards = async (req, res, next) => {
    try {
        const { teamId } = req.params;
        const limit = parseInt(req.query.limit) || 5;

        const cacheKey = `leaderboard:all:${teamId}:limit${limit}`;

        console.log(`🔍 Checking cache for leaderboards team ${teamId}`);
        const cached = await CacheService.get(cacheKey);

        if (cached) {
            console.log(`⚡ Cache HIT: Returning cached leaderboards for team ${teamId}`);
            return res.json({
                ...cached,
                source: 'cache',
                cached: true,
                timestamp: new Date().toISOString()
            });
        }

        console.log(`🗄️ Cache MISS: Fetching fresh leaderboards for team ${teamId}`);
        const result = await leaderboardService.getAllLeaderboards(teamId, limit);

        await CacheService.set(cacheKey, result, 30 * 60, [`team:${teamId}`, 'leaderboard']);

        console.log(`💾 Cached leaderboards for team ${teamId} (30min TTL)`);

        res.json({
            ...result,
            source: 'database',
            cached: false,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ getAllLeaderboards error:', error.message);
        next(error);
    }
};

module.exports = exports;