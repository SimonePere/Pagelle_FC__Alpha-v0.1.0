const express = require('express');
const router = express.Router();
const matchController = require('../controllers/matchController');
const auth = require('../middleware/auth');

// =============================================
// 🔒 ALL MATCH ROUTES ARE PRIVATE
// (Authentication Required for All Endpoints)
// =============================================

// @route   POST /api/v1/matches
// @desc    Create new match
// @access  Private
router.post('/', auth, matchController.createMatch);

// @route   GET /api/v1/matches/team/:teamId
// @desc    Get team matches
// @access  Private
router.get('/team/:teamId', auth, matchController.getTeamMatches);

// @route   GET /api/v1/matches/:id
// @desc    Get match details
// @access  Private
router.get('/:id', auth, matchController.getMatch);

// 🆕 NUOVE ROUTE PER GESTIONE STATO MATCH
// @route   PATCH /api/v1/matches/:id/activate
// @desc    Activate match for voting
// @access  Private (Admin only)
router.patch('/:id/activate', auth, matchController.activateMatch);

// @route   PATCH /api/v1/matches/:id/complete
// @desc    Complete match
// @access  Private (Admin only)
router.patch('/:id/complete', auth, matchController.completeMatch);



module.exports = router;