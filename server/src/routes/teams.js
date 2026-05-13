const express = require('express');
const router = express.Router();
const teamController = require('../controllers/TeamController');
const auth = require('../middleware/auth');
const requireScope = require('../middleware/requireScope');
const requireTeamAdmin = require('../middleware/requireTeamAdmin');

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

module.exports = router;