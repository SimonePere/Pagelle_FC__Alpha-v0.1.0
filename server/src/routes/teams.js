const express = require('express');
const router = express.Router();
const teamController = require('../controllers/TeamController');
const auth = require('../middleware/auth');
const requireScope = require('../middleware/requireScope');
const requireTeamAdmin = require('../middleware/requireTeamAdmin');
const uploadAvatar = require('../middleware/uploadAvatar');
const avatarController = require('../controllers/AvatarController');

// =============================================
// 🌍 PUBLIC ROUTES (No Authentication Required)
// =============================================

router.get('/', teamController.getAllTeams);

// =============================================
// 🔒 PRIVATE ROUTES (Authentication Required)
//
// Lettura: full + guest
// Creazione team / join: qualsiasi user 'full' (creatore diventa team-admin)
// Modifica team / rimozione membri: solo team-admin (in adminIds o createdBy)
//   o admin globale. Vedi requireTeamAdmin.
// Leave: sempre permesso (uno può sempre uscire dai propri team)
// =============================================

router.post('/', auth, requireScope('full'), teamController.createTeam);
router.get('/my-teams', auth, requireScope('full', 'guest'), teamController.getMyTeams);
router.post('/join', auth, requireScope('full'), teamController.joinTeam);
router.get('/:id', auth, requireScope('full', 'guest'), teamController.getTeam);
router.put('/:id', auth, requireScope('full'), requireTeamAdmin(), teamController.updateTeam);
router.delete('/:id/leave', auth, requireScope('full'), teamController.leaveTeam);
router.delete('/:id/members/:userId', auth, requireScope('full'), requireTeamAdmin(), teamController.removeMember);

// 🔒 Gestione guest del team (solo team-admin o admin globale)
router.get('/:id/guests', auth, requireScope('full'), requireTeamAdmin(), teamController.listTeamGuests);
router.patch('/:id/guests/:userId/promotion', auth, requireScope('full'), requireTeamAdmin(), teamController.setGuestPromotionAllowed);

// ===== AVATAR ROUTES =====

/**
 * @route   POST /api/v1/teams/:id/avatar
 * @desc    Upload/replace team avatar (admin only)
 * @access  Private (team admin)
 */
router.post('/:id/avatar', auth, uploadAvatar, avatarController.uploadTeamAvatar);

/**
 * @route   DELETE /api/v1/teams/:id/avatar
 * @desc    Delete team avatar (admin only)
 * @access  Private (team admin)
 */
router.delete('/:id/avatar', auth, avatarController.deleteTeamAvatar);

/**
 * @route   GET /api/v1/teams/:id/avatar
 * @desc    Get team avatar (public)
 * @access  Public
 */
router.get('/:id/avatar', avatarController.getTeamAvatar);

module.exports = router;