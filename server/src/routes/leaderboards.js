// routes/leaderboards.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const leaderboardController = require('../controllers/LeaderboardController');

/**
 * LEADERBOARD ROUTES
 * 
 * Base URL: /api/v1/leaderboards
 * Middleware: auth applicato a TUTTI gli endpoint
 * Access Control: Verifica membership team per accesso dati
 */

// === CLASSIFICA RATING ===
/**
 * GET /api/v1/leaderboards/:teamId/rating
 * 
 * @desc    Classifica giocatori per voto medio
 * @access  Private - Team members only
 * @params  teamId: ObjectId del team
 * @query   limit: Number (default 10, max 50)
 */
router.get('/:teamId/rating', auth, leaderboardController.getRatingLeaderboard);

// === CLASSIFICA GOL ===
/**
 * GET /api/v1/leaderboards/:teamId/goals  
 * 
 * @desc    Classifica giocatori per gol totali
 * @access  Private - Team members only
 * @params  teamId: ObjectId del team
 * @query   limit: Number (default 10, max 50)
 */
router.get('/:teamId/goals', auth, leaderboardController.getGoalsLeaderboard);

// === CLASSIFICA ASSIST ===
/**
 * GET /api/v1/leaderboards/:teamId/assists
 * 
 * @desc    Classifica giocatori per assist totali  
 * @access  Private - Team members only
 * @params  teamId: ObjectId del team
 * @query   limit: Number (default 10, max 50)
 */
router.get('/:teamId/assists', auth, leaderboardController.getAssistsLeaderboard);

// === CLASSIFICA PLAYERCARD ===
/**
 * GET /api/v1/leaderboards/:teamId/playercard
 * 
 * @desc    Classifica giocatori per overall player card
 * @access  Private - Team members only  
 * @params  teamId: ObjectId del team
 * @query   limit: Number (default 10, max 50)
 */
router.get('/:teamId/playercard', auth, leaderboardController.getPlayercardLeaderboard);

// === CLASSIFICA FORM ===
/**
 * GET /api/v1/leaderboards/:teamId/form
 * 
 * @desc    Classifica giocatori per forma recente (ultime 3+ partite)
 * @access  Private - Team members only
 * @params  teamId: ObjectId del team  
 * @query   limit: Number (default 10, max 50)
 */
router.get('/:teamId/form', auth, leaderboardController.getFormLeaderboard);

// === TUTTE LE CLASSIFICHE (ENDPOINT AGGREGATO) ===
/**
 * GET /api/v1/leaderboards/:teamId/all
 * 
 * @desc    Tutte le classifiche in una chiamata (ottimizzato per dashboard)
 * @access  Private - Team members only
 * @params  teamId: ObjectId del team
 * @query   limit: Number (default 5, max 20) - per ogni classifica
 */
router.get('/:teamId/all', auth, leaderboardController.getAllLeaderboards);

module.exports = router;