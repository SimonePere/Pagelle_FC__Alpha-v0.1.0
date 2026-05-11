const express = require('express');
const router = express.Router();
const matchController = require('../controllers/MatchController');
const auth = require('../middleware/auth');
const requireScope = require('../middleware/requireScope');

// =============================================
// 🔒 ALL MATCH ROUTES ARE PRIVATE
// (Authentication Required for All Endpoints)
// =============================================

router.post('/', auth, requireScope('full'), matchController.createMatch);
router.put('/:id', auth, requireScope('full'), matchController.updateMatch);
router.delete('/:id', auth, requireScope('full'), matchController.deleteMatch);
router.get('/team/:teamId', auth, requireScope('full', 'guest'), matchController.getTeamMatches);
router.get('/:id', auth, requireScope('full', 'guest'), matchController.getMatch);
router.patch('/:id/activate', auth, requireScope('full'), matchController.activateMatch);
router.patch('/:id/complete', auth, requireScope('full'), matchController.completeMatch);
router.post('/:matchId/reactivate-voter/:userId', auth, requireScope('full'), matchController.reactivateVoter);

// Rotta guest-player commentata — gestita inline in createMatch (Percorso B)
// router.post('/:matchId/guest-player', auth, requireScope('full'), matchController.addGuestPlayer);

module.exports = router;