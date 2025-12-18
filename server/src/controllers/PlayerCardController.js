const PlayerCardService = require('../services/PlayerCardService');

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
        const voteData = req.body;

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

        const result = await playerCardService.getPlayerCardCalculation(sessionId);

        res.json(result);

    } catch (error) {
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

        const result = await playerCardService.completePlayerCardSession(sessionId, options);

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

        const result = await playerCardService.getPlayerCardResults(filters);

        res.json(result);

    } catch (error) {
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