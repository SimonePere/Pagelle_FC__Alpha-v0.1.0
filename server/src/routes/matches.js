const express = require('express');
const router = express.Router();
const matchController = require('../controllers/MatchController');
const auth = require('../middleware/auth');
const requireScope = require('../middleware/requireScope');
const requireRole = require('../middleware/requireRole');
const requireMatchAdmin = require('../middleware/requireMatchAdmin');

// =============================================
// 🔒 ALL MATCH ROUTES ARE PRIVATE
// (Authentication Required for All Endpoints)
//
// Lettura: full + guest
// Mutazioni create/update/delete/activate/complete/reactivate-voter:
//   solo admin globali (Six/Dux/Gaga). Vedi requireRole.
// Mutazioni roster (add/remove player su match già creato):
//   admin globale OPPURE admin del Team del match. Vedi requireMatchAdmin.
// =============================================

router.post('/', auth, requireScope('full'), requireRole('admin'), matchController.createMatch);
router.put('/:id', auth, requireScope('full'), requireRole('admin'), matchController.updateMatch);
router.delete('/:id', auth, requireScope('full'), requireRole('admin'), matchController.deleteMatch);
router.get('/team/:teamId', auth, requireScope('full', 'guest'), matchController.getTeamMatches);
router.get('/:id', auth, requireScope('full', 'guest'), matchController.getMatch);
router.patch('/:id/activate', auth, requireScope('full'), requireRole('admin'), matchController.activateMatch);
router.patch('/:id/complete', auth, requireScope('full'), requireRole('admin'), matchController.completeMatch);
router.post('/:matchId/reactivate-voter/:userId', auth, requireScope('full'), requireRole('admin'), matchController.reactivateVoter);

// === GESTIONE ROSTER POST-CREAZIONE ===
router.get('/:id/roster-editable', auth, requireScope('full'), requireMatchAdmin, matchController.getRosterEditable);
router.post('/:id/players', auth, requireScope('full'), requireMatchAdmin, matchController.addRegisteredPlayer);
router.post('/:id/guest-players', auth, requireScope('full'), requireMatchAdmin, matchController.addGuestPlayerToMatch);
router.delete('/:id/players/:playerId', auth, requireScope('full'), requireMatchAdmin, matchController.removePlayerFromMatch);

module.exports = router;