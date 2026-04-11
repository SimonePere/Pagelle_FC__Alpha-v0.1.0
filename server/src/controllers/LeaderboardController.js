// controllers/LeaderboardController.js
const LeaderboardService = require('../services/LeaderboardService');
const CacheService = require("../services/CacheService")
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
 */

// Initialize service
const leaderboardService = new LeaderboardService();

// === CLASSIFICA RATING (+ CACHE) ===
exports.getRatingLeaderboard = async (req, res, next) => {
    try {
        const { teamId } = req.params;
        const limit = parseInt(req.query.limit) || 10;

        // Cache key specifico per rating leaderboard
        const cacheKey = `leaderboard:rating:${teamId}:limit${limit}`;

        // Try cache first
        const cached = await CacheService.get(cacheKey);
        if (cached) {
            console.log(`⚡ CLASSIFICA RAPIDA: Rating team ${teamId} servita dalla cache (${limit} posizioni)`);
            return res.json({ ...cached, source: 'cache', cached: true });
        }

        // Cache miss - fetch fresh data
        console.log(`🗄️ CLASSIFICA DA DATABASE: Caricamento Rating team ${teamId} in corso...`);
        const result = await leaderboardService.getLeaderboard(teamId, 'rating', limit);

        // Cache for 30 minutes
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

        const cacheKey = `leaderboard:goals:${teamId}:limit${limit}`;

        const cached = await CacheService.get(cacheKey);
        if (cached) {
            console.log(`⚡ Cache HIT: Goals leaderboard team ${teamId}`);
            return res.json({ ...cached, source: 'cache', cached: true });
        }

        console.log(`🗄️ Cache MISS: Fetching goals leaderboard team ${teamId}`);
        const result = await leaderboardService.getLeaderboard(teamId, 'goals', limit);

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

        const cacheKey = `leaderboard:assists:${teamId}:limit${limit}`;

        const cached = await CacheService.get(cacheKey);
        if (cached) {
            console.log(`⚡ Cache HIT: Assists leaderboard team ${teamId}`);
            return res.json({ ...cached, source: 'cache', cached: true });
        }

        console.log(`🗄️ Cache MISS: Fetching assists leaderboard team ${teamId}`);
        const result = await leaderboardService.getLeaderboard(teamId, 'assists', limit);

        await CacheService.set(cacheKey, result, 30 * 60, [`team:${teamId}`, 'leaderboard', 'assists']);

        res.json({ ...result, source: 'database', cached: false });

    } catch (error) {
        next(error);
    }
};

// === CLASSIFICA PLAYERCARD ===
exports.getPlayercardLeaderboard = async (req, res, next) => {
    try {
        const { teamId } = req.params;
        const limit = parseInt(req.query.limit) || 10;

        const result = await leaderboardService.getLeaderboard(teamId, 'playercard', limit);

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

        let result;

        if (!['goals', 'assists', 'both'].includes(stat)) {
            return res.status(400).json({
                success: false,
                message: 'stat deve essere: "goals", "assists", oppure "both"'
            });
        }

        if (stat === 'goals') {
            result = await leaderboardService.getLeaderboard(teamId, 'goalPerMatch', limit);
        } else if (stat === 'assists') {
            result = await leaderboardService.getLeaderboard(teamId, 'assistPerMatch', limit);
        } else {
            // Per il frontend mobile-first usiamo una lista unica con dati completi del player.
            result = await leaderboardService.getLeaderboard(teamId, 'goalPerMatch', limit);
        }

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

        // 🎯 CACHE INTEGRATION
        // Generate cache key che include parametri importanti
        const cacheKey = `leaderboard:all:${teamId}:limit${limit}`;

        // 🔍 Try cache first
        console.log(`🔍 Checking cache for leaderboards team ${teamId}`);
        const cached = await CacheService.get(cacheKey);

        if (cached) {
            // Cache HIT - return immediately
            console.log(`⚡ Cache HIT: Returning cached leaderboards for team ${teamId}`);
            return res.json({
                ...cached,
                source: 'cache',
                cached: true,
                timestamp: new Date().toISOString()
            });
        }

        // 💾 Cache MISS - fetch from database
        console.log(`🗄️ Cache MISS: Fetching fresh leaderboards for team ${teamId}`);
        const result = await leaderboardService.getAllLeaderboards(teamId, limit);

        // ✅ Save in cache for future requests
        // TTL: 30 minuti (le classifiche non cambiano spesso)
        await CacheService.set(cacheKey, result, 30 * 60, [`team:${teamId}`, 'leaderboard']);

        console.log(`💾 Cached leaderboards for team ${teamId} (30min TTL)`);

        // Return fresh data
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