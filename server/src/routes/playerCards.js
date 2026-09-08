// routes/playerCards.js
const express = require('express');
const router = express.Router();

// Import controller methods
const {
  createPlayerCardSession,
  getUserPlayerCardSessions,
  getPlayerCardSession,
  submitPlayerCardVote,
  getPlayerCardCalculation,
  completePlayerCardSession,
  getPlayerCardResults
} = require('../controllers/PlayerCardController');

// Import middleware
const auth = require('../middleware/auth'); // Assumendo middleware auth esistente
const requireScope = require('../middleware/requireScope');
const requireRole = require('../middleware/requireRole');

console.log('📋 Loading PlayerCard routes...');

// === PLAYER CARD SESSION MANAGEMENT ===
//
// Permessi:
//   - Create / Complete sessione: solo admin globali (Six/Dux/Gaga)
//   - Submit voto / lettura: tutti gli user 'full' (non guest)
//   - I guest NON accedono alle PlayerCards: sono valutazioni interne
//     al team, fuori dal perimetro guest "votazione singola match".

/**
 * @desc    Create new PlayerCard voting session
 * @route   POST /api/v1/player-cards/sessions
 * @access  Private (admin only)
 * @body    { targetPlayerId, title?, description?, deadline?, teamId? }
 */
router.post('/sessions', auth, requireScope('full'), requireRole('admin'), createPlayerCardSession);

/**
 * @desc    Get all PlayerCard sessions for current user
 * @route   GET /api/v1/player-cards/sessions
 * @access  Private
 * @query   ?status=active|completed&limit=20
 */
router.get('/sessions', auth, requireScope('full', 'demo'), getUserPlayerCardSessions);

/**
 * @desc    Get specific PlayerCard session by ID
 * @route   GET /api/v1/player-cards/sessions/:id
 * @access  Private
 */
router.get('/sessions/:id', auth, requireScope('full', 'demo'), getPlayerCardSession);

// === PLAYER CARD VOTING ===

/**
 * @desc    Submit vote for PlayerCard session
 * @route   POST /api/v1/player-cards/sessions/:id/vote
 * @access  Private (any full user)
 * @body    { 
 *            vote: {
 *              attributes: { tir, pas, dri, fin, vis, res, for },
 *              additionalAttributes?: { piedeDebole, skill },
 *              playerProfile?: { position },
 *              comment?
 *            },
 *            deviceInfo?, timeSpent?
 *          }
 */
router.post('/sessions/:id/vote', auth, requireScope('full'), submitPlayerCardVote);



// === PLAYER CARD RESULTS ===

/**
 * @desc    Get PlayerCard calculation (live or official)
 * @route   GET /api/v1/player-cards/sessions/:id/calculation
 * @access  Private
 */
router.get('/sessions/:id/calculation', auth, requireScope('full', 'demo'), getPlayerCardCalculation);

/**
 * @desc    Complete PlayerCard session and save official results
 * @route   POST /api/v1/player-cards/sessions/:id/complete
 * @access  Private (admin only)
 * @body    { forceReopen?: boolean }
 */
router.post('/sessions/:id/complete', auth, requireScope('full'), requireRole('admin'), completePlayerCardSession);

/**
 * @desc    Get PlayerCard results for specific user
 * @route   GET /api/v1/player-cards/results/user/:userId
 * @access  Private (team members only)
 * @query   ?limit=10 (optional limit for results)
 */
router.get('/results/user/:userId', auth, requireScope('full', 'demo'), getPlayerCardResults);




// === ADVANCED PLAYER CARD ROUTES ===
// Logica inline per semplicità, ma potrebbe essere spostata in un controller separato se sono utili al fine dell'app.

// /**
//  * @desc    Get player comparison between two players
//  * @route   GET /api/v1/player-cards/compare/:playerId1/:playerId2
//  * @access  Private
//  */
// router.get('/compare/:playerId1/:playerId2', auth, async (req, res) => {
//   try {
//     const PlayerCardResult = require('../models/PlayerCardResult');

//     const comparison = await PlayerCardResult.comparePlayerCards(
//       req.params.playerId1,
//       req.params.playerId2
//     );

//     if (!comparison) {
//       return res.status(404).json({
//         error: 'Cannot compare players - missing evaluation data'
//       });
//     }

//     res.json({
//       success: true,
//       comparison
//     });

//   } catch (error) {
//     console.error('Error comparing players:', error);
//     res.status(500).json({ error: 'Server error comparing players' });
//   }
// });

// /**
//  * @desc    Get top players by specific attribute
//  * @route   GET /api/v1/player-cards/leaderboard/:attribute
//  * @access  Private
//  * @query   ?limit=10
//  */
// router.get('/leaderboard/:attribute', auth, async (req, res) => {
//   try {
//     const PlayerCardResult = require('../models/PlayerCardResult');
//     const { attribute } = req.params;
//     const limit = parseInt(req.query.limit) || 10;

//     const validAttributes = ['tir', 'pas', 'dri', 'fin', 'vis', 'res', 'for'];
//     if (!validAttributes.includes(attribute)) {
//       return res.status(400).json({
//         error: `Invalid attribute. Must be one of: ${validAttributes.join(', ')}`
//       });
//     }

//     const topPlayers = await PlayerCardResult.getTopPlayersByAttribute(attribute, limit);

//     res.json({
//       success: true,
//       attribute,
//       topPlayers
//     });

//   } catch (error) {
//     console.error('Error getting leaderboard:', error);
//     res.status(500).json({ error: 'Server error getting leaderboard' });
//   }
// });

// /**
//  * @desc    Get PlayerCard history for specific player
//  * @route   GET /api/v1/player-cards/player/:playerId/history
//  * @access  Private
//  * @query   ?limit=10&sortBy=createdAt
//  */
// router.get('/player/:playerId/history', auth, async (req, res) => {
//   try {
//     const PlayerCardResult = require('../models/PlayerCardResult');
//     const limit = parseInt(req.query.limit) || 10;

//     const results = await PlayerCardResult.find({
//       targetPlayerId: req.params.playerId,
//       'sessionMetadata.sessionType': 'player_card_rating'
//     })
//       .sort({ createdAt: -1 })
//       .limit(limit)
//       .populate('votingSessionId', 'title createdAt');

//     const history = results.map(result => ({
//       id: result._id,
//       sessionTitle: result.votingSessionId?.title || 'Valutazione PlayerCard',
//       evaluationDate: result.createdAt,
//       finalOverallRating: result.finalOverallRating,
//       finalAttributes: result.finalAttributes,
//       voteCount: result.statistics.voteCount,
//       grade: result.grade
//     }));

//     res.json({
//       success: true,
//       playerId: req.params.playerId,
//       history,
//       total: history.length
//     });

//   } catch (error) {
//     console.error('Error getting player history:', error);
//     res.status(500).json({ error: 'Server error getting player history' });
//   }
// });

// /**
//  * @desc    Get PlayerCard statistics for team
//  * @route   GET /api/v1/player-cards/team/:teamId/stats
//  * @access  Private
//  */
// router.get('/team/:teamId/stats', auth, async (req, res) => {
//   try {
//     const PlayerCardResult = require('../models/PlayerCardResult');
//     const VotingSession = require('../models/VotingSession');

//     // Trova tutte le sessioni player card per questo team
//     const sessions = await VotingSession.find({
//       teamId: req.params.teamId,
//       type: 'player_card_rating',
//       status: 'completed'
//     });

//     const sessionIds = sessions.map(s => s._id);

//     // Trova tutti i risultati per queste sessioni
//     const results = await PlayerCardResult.find({
//       votingSessionId: { $in: sessionIds }
//     }).populate('targetPlayerId', 'name');

//     // Calcola statistiche team
//     const teamStats = {
//       totalEvaluations: results.length,
//       averageOverallRating: 0,
//       attributeAverages: {
//         tir: 0, pas: 0, dri: 0, fin: 0, vis: 0, res: 0, for: 0
//       },
//       topPerformers: [],
//       positionDistribution: {}
//     };

//     if (results.length > 0) {
//       // Media overall
//       const totalOverall = results.reduce((sum, r) => sum + r.finalOverallRating, 0);
//       teamStats.averageOverallRating = Math.round(totalOverall / results.length);

//       // Medie attributi
//       ['tir', 'pas', 'dri', 'fin', 'vis', 'res', 'for'].forEach(attr => {
//         const total = results.reduce((sum, r) => sum + r.finalAttributes[attr], 0);
//         teamStats.attributeAverages[attr] = Math.round(total / results.length);
//       });

//       // Top performers (top 5)
//       teamStats.topPerformers = results
//         .sort((a, b) => b.finalOverallRating - a.finalOverallRating)
//         .slice(0, 5)
//         .map(r => ({
//           playerId: r.targetPlayerId._id,
//           playerName: r.targetPlayerId.name,
//           overallRating: r.finalOverallRating,
//           grade: r.grade,
//           mostVotedPosition: r.consensusProfile.mostVotedPosition
//         }));

//       // Distribuzione posizioni
//       results.forEach(r => {
//         const pos = r.consensusProfile.mostVotedPosition;
//         if (pos) {
//           teamStats.positionDistribution[pos] = (teamStats.positionDistribution[pos] || 0) + 1;
//         }
//       });
//     }

//     res.json({
//       success: true,
//       teamId: req.params.teamId,
//       teamStats
//     });

//   } catch (error) {
//     console.error('Error getting team stats:', error);
//     res.status(500).json({ error: 'Server error getting team statistics' });
//   }
// });

// console.log('✅ PlayerCard routes loaded successfully');

module.exports = router;