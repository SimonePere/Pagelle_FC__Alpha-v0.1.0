const express = require('express');
const router = express.Router();
const authController = require('../controllers/AuthController');

// @route   GET /api/v1/invite/:token
// @desc    Valida token di invito e restituisce info pubbliche su partita e giocatore
// @access  Public (nessuna auth richiesta)
router.get('/:token', authController.validateInvite);

module.exports = router;
