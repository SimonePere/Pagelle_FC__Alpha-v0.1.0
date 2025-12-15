const express = require('express');
const router = express.Router();
const votingSessionController = require('../controllers/votingSessionController');
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

// @route   GET /api/v1/voting-sessions/:id
// @desc    Get specific voting session details
// @access  Private
router.get('/:id', auth, votingSessionController.getVotingSession);

// @route   POST /api/v1/voting-sessions/:id/vote
// @desc    Submit vote for a voting session
// @access  Private
router.post('/:id/vote', auth, votingSessionController.submitVote);

// @route   PATCH /api/v1/voting-sessions/:id/activate
// @desc    Activate a voting session (change from draft to active)
// @access  Private
router.patch('/:id/activate', auth, votingSessionController.activateVotingSession);

// @route   GET /api/v1/voting-sessions/:id/calculation
// @desc    Calculate and get voting results (average ratings, self-reported goals/assists)
// @access  Private
// @note    Uses simplified calculation: average ratings with dynamic divisor, self-reported stats
router.get('/:id/calculation', auth, votingSessionController.getVotingCalculation);


// @route   POST /api/v1/voting-sessions/:id/complete
// @desc    Complete session and save official results (allow reopen)
// @access  Private
router.post('/:id/complete', auth, votingSessionController.completeVotingSession);

// @route   GET /api/v1/voting-sessions/:id/submissions
// @desc    Get all individual vote submissions for a session (complete with vote details)
// @access  Private
router.get('/:id/submissions', auth, votingSessionController.getSessionSubmissions);

//  FUTURE ENDPOINTS - Implementare quando necessario
// router.patch('/:id/complete', auth, votingSessionController.completeVotingSession);
// router.delete('/:id', auth, votingSessionController.cancelVotingSession);
// router.get('/:id/audit', auth, votingSessionController.getVotingAudit);

module.exports = router;