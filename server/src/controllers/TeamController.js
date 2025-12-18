const TeamService = require('../services/TeamService');

/**
 * TEAM CONTROLLER
 * 
 * Orchestration-only controller che delega tutta la business logic
 * al TeamService. Gestisce solo HTTP request/response.
 * 
 * Endpoint supportati:
 * - POST /api/v1/teams
 * - GET /api/v1/teams
 * - GET /api/v1/teams/:id
 * - POST /api/v1/teams/join
 * - GET /api/v1/teams/my-teams
 * - DELETE /api/v1/teams/:id/leave
 */

// Initialize service
const teamService = new TeamService();

// @desc    Create new team
// @route   POST /api/v1/teams
// @access  Private
const createTeam = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const teamData = req.body;

    const result = await teamService.createTeam(userId, teamData);

    res.status(201).json(result);

  } catch (error) {
    next(error);
  }
};

// @desc    Get all public teams
// @route   GET /api/v1/teams
// @access  Public
const getAllTeams = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;

    const result = await teamService.getAllTeams({
      page: parseInt(page),
      limit: parseInt(limit),
      search
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};

// @desc    Get team details
// @route   GET /api/v1/teams/:id
// @access  Private
const getTeam = async (req, res, next) => {
  try {
    const result = await teamService.getTeam(req.params.id, req.user.id);

    res.json(result);
  } catch (error) {
    next(error);
  }
};

// @desc    Join team with invite code
// @route   POST /api/v1/teams/join
// @access  Private
const joinTeam = async (req, res, next) => {
  try {
    const { inviteCode } = req.body;

    const result = await teamService.joinTeam(req.user.id, inviteCode);

    res.json(result);
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's teams
// @route   GET /api/v1/teams/my-teams
// @access  Private
const getMyTeams = async (req, res, next) => {
  try {
    const result = await teamService.getMyTeams(req.user.id);

    res.json(result);
  } catch (error) {
    next(error);
  }
};

// @desc    Leave team
// @route   DELETE /api/v1/teams/:id/leave
// @access  Private
const leaveTeam = async (req, res, next) => {
  try {
    const result = await teamService.leaveTeam(req.params.id, req.user.id);

    res.json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllTeams,
  createTeam,
  getTeam,
  joinTeam,
  getMyTeams,
  leaveTeam
};
