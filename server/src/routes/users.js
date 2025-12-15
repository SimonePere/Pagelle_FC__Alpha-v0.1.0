const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
// Controllers will be created next

// @route   GET /api/v1/users/team/:teamId
// @desc    Get team members
// @access  Private
router.get('/team/:teamId', auth, (req, res) => {
  res.json({ message: 'Get team members - TODO' });
});

// @route   GET /api/v1/users/:id/stats
// @desc    Get user stats
// @access  Private
router.get('/:id/stats', auth, (req, res) => {
  res.json({ message: 'Get user stats - TODO' });
});

module.exports = router;