const express = require('express');
const router = express.Router();
const teamController = require('../controllers/TeamController');
const auth = require('../middleware/auth');
const requireScope = require('../middleware/requireScope');

// =============================================
// 🌍 PUBLIC ROUTES (No Authentication Required)
// =============================================

router.get('/', teamController.getAllTeams);

// =============================================  
// 🔒 PRIVATE ROUTES (Authentication Required)
// =============================================

router.post('/', auth, requireScope('full'), teamController.createTeam);
router.get('/my-teams', auth, requireScope('full', 'guest'), teamController.getMyTeams);
router.post('/join', auth, requireScope('full'), teamController.joinTeam);
router.get('/:id', auth, requireScope('full', 'guest'), teamController.getTeam);
router.put('/:id', auth, requireScope('full'), teamController.updateTeam);
router.delete('/:id/leave', auth, requireScope('full'), teamController.leaveTeam);
router.delete('/:id/members/:userId', auth, requireScope('full'), teamController.removeMember);

module.exports = router;