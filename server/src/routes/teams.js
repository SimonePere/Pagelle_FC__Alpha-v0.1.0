const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');
const auth = require('../middleware/auth');

// =============================================
// 🌍 PUBLIC ROUTES (No Authentication Required)
// =============================================

// @route   GET /api/v1/teams
// @desc    Get all public teams
// @access  Public
router.get('/', teamController.getAllTeams);

// =============================================  
// 🔒 PRIVATE ROUTES (Authentication Required)
// =============================================

// @route   POST /api/v1/teams
// @desc    Create new team
// @access  Private
router.post('/', auth, teamController.createTeam);

// @route   GET /api/v1/teams/my-teams
// @desc    Get user's teams
// @access  Private
router.get('/my-teams', auth, teamController.getMyTeams);

// @route   POST /api/v1/teams/join
// @desc    Join team with invite code
// @access  Private
router.post('/join', auth, teamController.joinTeam);

// @route   GET /api/v1/teams/:id
// @desc    Get team details
// @access  Private
router.get('/:id', auth, teamController.getTeam);

// @route   DELETE /api/v1/teams/:id/leave
// @desc    Leave team
// @access  Private
router.delete('/:id/leave', auth, teamController.leaveTeam);

module.exports = router;