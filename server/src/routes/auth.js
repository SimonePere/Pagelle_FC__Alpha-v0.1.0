const express = require('express');
const router = express.Router();
const authController = require('../controllers/AuthController');
const auth = require('../middleware/auth');
const requireScope = require('../middleware/requireScope');

// @route   POST /api/v1/auth/register
// @desc    Register user
// @access  Public
router.post('/register', authController.register);

// @route   POST /api/v1/auth/login
// @desc    Login user
// @access  Public
router.post('/login', authController.login);

// @route   GET /api/v1/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, authController.getMe);

// @route   PUT /api/v1/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, authController.updateProfile);

// @route   PUT /api/v1/auth/password
// @desc    Change user password
// @access  Private
router.put('/password', auth, authController.changePassword);

// @route   POST /api/v1/auth/guest-login
// @desc    Autentica guest tramite invite token → JWT scope guest
// @access  Public
router.post('/guest-login', authController.guestLogin);

// @route   POST /api/v1/auth/demo-login
// @desc    Autentica un visitatore nella squadra demo → JWT scope demo
// @access  Public (rate limiter dedicato in app.js)
router.post('/demo-login', authController.demoLogin);

// @route   POST /api/v1/auth/promote-guest-by-invite-token
// @desc    Converte guest in utente reale (storico intatto, stesso _id)
// @access  Public
router.post('/promote-guest-by-invite-token', authController.promoteGuestByInviteToken);

// @route   POST /api/v1/auth/promote-guest-by-id
// @desc    Converte il guest autenticato in utente reale (usa JWT, senza inviteToken)
// @access  Private (scope guest)
router.post('/promote-guest-by-id', auth, requireScope('guest'), authController.promoteGuestById);

module.exports = router;