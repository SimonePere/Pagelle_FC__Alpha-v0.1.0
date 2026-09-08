const express = require('express');
const router = express.Router();
const votingSessionController = require('../controllers/VotingSessionController');
const auth = require('../middleware/auth');
const requireScope = require('../middleware/requireScope');
const requireRole = require('../middleware/requireRole');
const requireMatchAccess = require('../middleware/requireMatchAccess');

// =============================================
//  ALL VOTING SESSION ROUTES ARE PRIVATE
// (Authentication Required for All Endpoints)
// =============================================

// @route   POST /api/v1/voting-sessions
// @desc    Create new voting session
// @access  Private (solo utenti registrati)
router.post('/', auth, requireScope('full'), votingSessionController.createVotingSession);

// @route   GET /api/v1/voting-sessions
// @desc    Get voting sessions for current user
// @access  Private
router.get('/', auth, requireScope('full', 'guest', 'demo'), votingSessionController.getUserVotingSessions);

// --- Sub-resource routes FIRST (before /:id catch-all) ---

// @route   GET /api/v1/voting-sessions/:id/my-vote
// @desc    Get current user's active vote for a session
// @access  Private
router.get('/:id/my-vote', auth, requireScope('full', 'guest', 'demo'), votingSessionController.getMyVote);

// @route   GET /api/v1/voting-sessions/:id/calculation
// @desc    Calculate and get voting results
// @access  Private
router.get('/:id/calculation', auth, requireScope('full', 'guest', 'demo'), votingSessionController.getVotingCalculation);

// @route   GET /api/v1/voting-sessions/:id/submissions
// @desc    Get all individual vote submissions for a session
// @access  Private (guest vede solo sessioni completate)
router.get('/:id/submissions', auth, requireScope('full', 'guest', 'demo'), votingSessionController.getSessionSubmissions);

// @route   POST /api/v1/voting-sessions/:id/vote
// @desc    Submit vote for a voting session
// @access  Private (guest può votare solo la sua partita)
router.post('/:id/vote', auth, requireScope('full', 'guest'), requireMatchAccess, votingSessionController.submitVote);

// @route   PATCH /api/v1/voting-sessions/:id/vote
// @desc    Update user's vote for a match rating session
// @access  Private (guest può modificare solo la sua partita)
router.patch('/:id/vote', auth, requireScope('full', 'guest'), requireMatchAccess, votingSessionController.updateVote);

// @route   PATCH /api/v1/voting-sessions/:id/activate
// @desc    Activate a voting session
// @access  Private (solo utenti registrati)
router.patch('/:id/activate', auth, requireScope('full'), votingSessionController.activateVotingSession);

// @route   POST /api/v1/voting-sessions/:id/complete
// @desc    Complete session and save official results
// @access  Private (solo utenti registrati)
router.post('/:id/complete', auth, requireScope('full'), votingSessionController.completeVotingSession);

// @route   POST /api/v1/voting-sessions/:id/force-close
// @desc    Forza la chiusura di una votazione: i pending vengono astenuti d'ufficio
//          (reason='deadline_expired') e la sessione viene completata.
//          Se nessuno ha votato → status diventa 'cancelled'.
// @access  Private (solo admin globali Six/Dux/Gaga)
router.post(
    '/:id/force-close',
    auth,
    requireScope('full'),
    requireRole('admin'),
    votingSessionController.forceCloseVotingSession
);

// --- Catch-all :id route LAST ---

// @route   GET /api/v1/voting-sessions/:id
// @desc    Get specific voting session details
// @access  Private
router.get('/:id', auth, requireScope('full', 'guest', 'demo'), votingSessionController.getVotingSession);

module.exports = router;