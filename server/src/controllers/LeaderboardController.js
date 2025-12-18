// controllers/LeaderboardController.js
const LeaderboardService = require('../services/LeaderboardService');

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
 * - GET /leaderboard/:teamId/form
 * - GET /leaderboard/:teamId/all
 */

// Initialize service
const leaderboardService = new LeaderboardService();

// === CLASSIFICA RATING ===
exports.getRatingLeaderboard = async (req, res, next) => {
    try {
        const { teamId } = req.params;
        const limit = parseInt(req.query.limit) || 10;

        const result = await leaderboardService.getLeaderboard(teamId, 'rating', limit);

        res.json(result);

    } catch (error) {
        next(error);
    }
};

// === CLASSIFICA GOL ===
exports.getGoalsLeaderboard = async (req, res, next) => {
    try {
        const { teamId } = req.params;
        const limit = parseInt(req.query.limit) || 10;

        const result = await leaderboardService.getLeaderboard(teamId, 'goals', limit);

        res.json(result);

    } catch (error) {
        next(error);
    }
};

// === CLASSIFICA ASSIST ===
exports.getAssistsLeaderboard = async (req, res, next) => {
    try {
        const { teamId } = req.params;
        const limit = parseInt(req.query.limit) || 10;

        const result = await leaderboardService.getLeaderboard(teamId, 'assists', limit);

        res.json(result);

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

// === CLASSIFICA FORM ===
exports.getFormLeaderboard = async (req, res, next) => {
    try {
        const { teamId } = req.params;
        const limit = parseInt(req.query.limit) || 10;

        const result = await leaderboardService.getLeaderboard(teamId, 'form', limit);

        res.json(result);

    } catch (error) {
        next(error);
    }
};

// === TUTTE LE CLASSIFICHE (OTTIMIZZATO) ===
exports.getAllLeaderboards = async (req, res, next) => {
    try {
        const { teamId } = req.params;
        const limit = parseInt(req.query.limit) || 5;

        const result = await leaderboardService.getAllLeaderboards(teamId, limit);

        res.json(result);

    } catch (error) {
        next(error);
    }
};

module.exports = exports;