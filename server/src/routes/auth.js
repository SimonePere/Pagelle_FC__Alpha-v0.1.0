const express = require('express');
const router = express.Router();
const authController = require('../controllers/AuthController');
const auth = require('../middleware/auth');

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

module.exports = router;