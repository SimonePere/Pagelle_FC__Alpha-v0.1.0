const express = require('express');
const router = express.Router();
const votingSessionController = require('../controllers/VotingSessionController');
const auth = require('../middleware/auth');

// =============================================
//  ALL VOTING SESSION ROUTES ARE PRIVATE
// (Authentication Required for All Endpoints)
// =============================================

// @route   POST /api/v1/voting-sessions
// @desc    Create new voting session
// @access  Private
router.post('/', auth, votingSessionController.createVotingSession);

// @route   GET /api/v1/voting-sessions
// @desc    Get voting sessions for current user
// @access  Private
router.get('/', auth, votingSessionController.getUserVotingSessions);

// --- Sub-resource routes FIRST (before /:id catch-all) ---

// @route   GET /api/v1/voting-sessions/:id/my-vote
// @desc    Get current user's active vote for a session
// @access  Private
router.get('/:id/my-vote', auth, votingSessionController.getMyVote);

// @route   GET /api/v1/voting-sessions/:id/calculation
// @desc    Calculate and get voting results (average ratings, self-reported goals/assists)
// @access  Private
// @note    Uses simplified calculation: average ratings with dynamic divisor, self-reported stats
router.get('/:id/calculation', auth, votingSessionController.getVotingCalculation);

// @route   GET /api/v1/voting-sessions/:id/submissions
// @desc    Get all individual vote submissions for a session (complete with vote details)
// @access  Private
router.get('/:id/submissions', auth, votingSessionController.getSessionSubmissions);

// @route   POST /api/v1/voting-sessions/:id/vote
// @desc    Submit vote for a voting session
// @access  Private
router.post('/:id/vote', auth, votingSessionController.submitVote);

// @route   PATCH /api/v1/voting-sessions/:id/vote
// @desc    Update user's vote for a match rating session
// @access  Private
router.patch('/:id/vote', auth, votingSessionController.updateVote);

// @route   PATCH /api/v1/voting-sessions/:id/activate
// @desc    Activate a voting session (change from draft to active)
// @access  Private
router.patch('/:id/activate', auth, votingSessionController.activateVotingSession);

// @route   POST /api/v1/voting-sessions/:id/complete
// @desc    Complete session and save official results (allow reopen)
// @access  Private
router.post('/:id/complete', auth, votingSessionController.completeVotingSession);

// --- Catch-all :id route LAST ---

// @route   GET /api/v1/voting-sessions/:id
// @desc    Get specific voting session details
// @access  Private
router.get('/:id', auth, votingSessionController.getVotingSession);

module.exports = router;