const MatchService = require('../services/MatchService');

/**
 * MATCH CONTROLLER
 * 
 * Orchestration-only controller che delega tutta la business logic
 * al MatchService. Gestisce solo HTTP request/response.
 * 
 * Endpoint supportati:
 * - POST /api/v1/matches
 * - GET /api/v1/matches/team/:teamId
 * - GET /api/v1/matches/:id
 * - PATCH /api/v1/matches/:id/activate
 * - PATCH /api/v1/matches/:id/complete
 */

// Initialize service
const matchService = new MatchService();

// @desc    Create new match
// @route   POST /api/v1/matches
// @access  Private
const createMatch = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const matchData = req.body;

    const result = await matchService.createMatch(userId, matchData);

    res.status(201).json(result);

  } catch (error) {
    next(error);
  }
};

// @desc    Get matches for a team
// @route   GET /api/v1/matches/team/:teamId
// @access  Private
const getTeamMatches = async (req, res, next) => {
  try {
    const { teamId } = req.params;
    const userId = req.user.id;
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10
    };

    const result = await matchService.getTeamMatches(teamId, userId, options);

    // Disabilita cache per dati real-time
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

/// @desc    Get single match details
// @route   GET /api/v1/matches/:id
// @access  Private
const getMatch = async (req, res, next) => {
  try {
    const matchId = req.params.id;
    const userId = req.user.id;

    const result = await matchService.getMatchDetails(matchId, userId);

    res.json(result);

  } catch (error) {
    next(error);
  }
};
// @desc    Activate match to start voting sessions
// @route   PATCH /api/v1/matches/:id/activate
// @access  Private  
const activateMatch = async (req, res, next) => {
  try {
    const matchId = req.params.id;
    const userId = req.user.id;

    const result = await matchService.activateMatch(matchId, userId);

    res.json(result);

  } catch (error) {
    next(error);
  }
};

// @desc    Mark match as completed
// @route   PATCH /api/v1/matches/:id/complete
// @access  Private
const completeMatch = async (req, res, next) => {
  try {
    const matchId = req.params.id;
    const userId = req.user.id;

    const result = await matchService.completeMatch(matchId, userId);

    res.json(result);

  } catch (error) {
    next(error);
  }
};

module.exports = {
  createMatch,
  getTeamMatches,
  getMatch,
  activateMatch,
  completeMatch
};