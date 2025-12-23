const PlayerCardService = require('../services/PlayerCardService');
const cacheService = require('../services/CacheService');

/**
 * PLAYER CARD CONTROLLER
 * 
 * Orchestration-only controller che delega tutta la business logic
 * al PlayerCardService. Gestisce solo HTTP request/response.
 * 
 * Endpoint supportati:
 * - POST /api/v1/player-cards/sessions
 * - GET /api/v1/player-cards/sessions
 * - GET /api/v1/player-cards/sessions/:id
 * - POST /api/v1/player-cards/sessions/:id/vote
 * - GET /api/v1/player-cards/sessions/:id/calculation
 * - POST /api/v1/player-cards/sessions/:id/complete
 * - GET /api/v1/player-cards/results
 */

// Initialize service
const playerCardService = new PlayerCardService();

// @desc    Create new PlayerCard evaluation request with AUTO voting session  
// @route   POST /api/v1/player-cards/sessions
// @access  Private
const createPlayerCardSession = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const sessionData = req.body;

        const result = await playerCardService.createPlayerCardSession(userId, sessionData);

        res.status(201).json(result);

    } catch (error) {
        next(error);
    }
};

// @desc    Get PlayerCard voting sessions for user
// @route   GET /api/v1/player-cards/sessions
// @access  Private
const getUserPlayerCardSessions = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const result = await playerCardService.getUserPlayerCardSessions(userId);

        // Disabilita cache per evitare 304 Not Modified
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });

        res.json(result);

    } catch (error) {
        next(error);
    }
};

// @desc    Get specific PlayerCard voting session by ID
// @route   GET /api/v1/player-cards/sessions/:id
// @access  Private
const getPlayerCardSession = async (req, res, next) => {
    try {
        const sessionId = req.params.id;
        const userId = req.user.id;

        const result = await playerCardService.getPlayerCardSession(sessionId, userId);

        res.json(result);

    } catch (error) {
        next(error);
    }
};


// @desc    Submit PlayerCard vote with multi-range validation
// @route   POST /api/v1/player-cards/sessions/:id/vote
// @access  Private
const submitPlayerCardVote = async (req, res, next) => {
    try {
        const sessionId = req.params.id;
        const userId = req.user.id;
        const voteData = req.body;  // RAW DATA dal Front End{ attributes: { tir: 85, pas: 90, ... }, comments: "..." }

        const result = await playerCardService.submitPlayerCardVote(sessionId, userId, voteData);

        res.json(result);

    } catch (error) {
        next(error);
    }
};

// @desc    Get PlayerCard calculation results (live or official)
// @route   GET /api/v1/player-cards/sessions/:id/calculation
// @access  Private
const getPlayerCardCalculation = async (req, res, next) => {
    try {
        const sessionId = req.params.id;

        // 🎯 CACHE INTEGRATION - Calculation results
        const cacheKey = `playercard:calculation:${sessionId}`;

        // 🔍 Try cache first
        console.log(`🔍 Controllo cache per calcoli PlayerCard sessione ${sessionId}`);
        const cached = await cacheService.get(cacheKey);

        if (cached) {
            // Cache HIT - return immediately
            console.log(`⚡ CALCOLI RAPIDI: PlayerCard sessione ${sessionId} servita dalla cache (calcoli già pronti)`);
            return res.json({
                ...cached,
                source: 'cache',
                cached: true,
                timestamp: new Date().toISOString()
            });
        }

        // 💾 Cache MISS - fetch from service
        console.log(`🗄️ CACHE VUOTO: Esecuzione calcoli PlayerCard sessione ${sessionId} dal database...`);
        const result = await playerCardService.getPlayerCardCalculation(sessionId);

        // ✅ Save in cache for future requests
        // TTL: 30 minuti (calcoli complessi, ma possono cambiare)
        await cacheService.set(cacheKey, result, 30 * 60, [`playercard:${sessionId}`, 'calculation']);

        console.log(`💾 CALCOLI SALVATI: PlayerCard sessione ${sessionId} memorizzata per 30 minuti (scadenza: ${new Date(Date.now() + 30 * 60 * 1000).toLocaleTimeString('it-IT')})`);

        // Return fresh data
        res.json({
            ...result,
            source: 'database',
            cached: false,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ getPlayerCardCalculation error:', error.message);
        next(error);
    }
};

// @desc    Complete PlayerCard session and finalize results
// @route   POST /api/v1/player-cards/sessions/:id/complete
// @access  Private
const completePlayerCardSession = async (req, res, next) => {
    try {
        const sessionId = req.params.id;
        const options = req.body;

        // console.log(`🚀------  DEBUG COMPLETE PLAYERCARD \n  Session: ${sessionId} \n options:`, options);

        if (filteredSubmissions.length === 0) {
            throw new AppError('Cannot complete session with no valid votes after filtering', 400);
        }

        const result = await playerCardService.completePlayerCardSession(sessionId, options);

        // console.log(`🚀------  DEBUG result \n  Session: ${sessionId} \n options:`, options);


        res.json(result);

    } catch (error) {
        next(error);
    }
};

// @desc    Get PlayerCard historical results with filters  
// @route   GET /api/v1/player-cards/results (general results)
// @route   GET /api/v1/player-cards/results/user/:userId (specific user results)
// @access  Private
const getPlayerCardResults = async (req, res, next) => {
    try {
        const filters = {
            // Use route parameter userId if present, otherwise fall back to query parameter
            targetPlayerId: req.params.userId || req.query.targetPlayerId,
            teamId: req.query.teamId,
            limit: parseInt(req.query.limit) || 10,
            offset: parseInt(req.query.offset) || 0
        };

        // 🎯 CACHE INTEGRATION - Historical results
        // Generate cache key che include tutti i filtri importanti
        const cacheKey = `playercard:results:${filters.targetPlayerId || 'all'}:team${filters.teamId || 'all'}:limit${filters.limit}:offset${filters.offset}`;

        // 🔍 Try cache first
        console.log(`🔍 Controllo cache per risultati PlayerCard user ${filters.targetPlayerId || 'multipli'}`);
        const cached = await cacheService.get(cacheKey);

        if (cached) {
            // Cache HIT - return immediately
            console.log(`⚡ DATI RAPIDI: PlayerCard serviti dalla cache (aggiornati di recente)`);
            return res.json({
                ...cached,
                source: 'cache',
                cached: true,
                timestamp: new Date().toISOString()
            });
        }

        // 💾 Cache MISS - fetch from service
        console.log(`🗄️ CACHE VUOTO: Recupero risultati PlayerCard dal database in corso...`);
        const result = await playerCardService.getPlayerCardResults(filters);

        // ✅ Save in cache for future requests
        // TTL: 60 minuti (risultati storici cambiano raramente)
        const tags = ['playercard', 'results'];
        if (filters.targetPlayerId) tags.push(`player:${filters.targetPlayerId}`);
        if (filters.teamId) tags.push(`team:${filters.teamId}`);

        await cacheService.set(cacheKey, result, 60 * 60, tags);

        console.log(`💾 RISULTATI SALVATI: PlayerCard memorizzati in cache per 60 minuti (scadenza: ${new Date(Date.now() + 60 * 60 * 1000).toLocaleTimeString('it-IT')})`);

        // Return fresh data
        res.json({
            ...result,
            source: 'database',
            cached: false,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ getPlayerCardResults error:', error.message);
        next(error);
    }
};

module.exports = {
    createPlayerCardSession,
    getUserPlayerCardSessions,
    getPlayerCardSession,
    submitPlayerCardVote,
    getPlayerCardCalculation,
    completePlayerCardSession,
    getPlayerCardResults
};