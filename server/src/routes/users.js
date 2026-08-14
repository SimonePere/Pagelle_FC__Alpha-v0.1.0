const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const uploadAvatar = require('../middleware/uploadAvatar');
const avatarController = require('../controllers/AvatarController');

/**
// @route   GET /api/v1/users/team/:teamId
// @desc    Get team members
// @access  Private
*/
router.get('/team/:teamId', auth, (req, res) => {
  res.json({ message: 'Get team members - TODO' });
});

/**
// @route   GET /api/v1/users/:id/stats
// @desc    Get user stats
// @access  Private
*/
router.get('/:id/stats', auth, (req, res) => {
  res.json({ message: 'Get user stats - TODO' });
});

// ===== AVATAR ROUTES =====

/**
 * @route   POST /api/v1/users/me/avatar
 * @desc    Upload/replace user profile photo
 * @access  Private (self)
 */
router.post('/me/avatar', auth, uploadAvatar, avatarController.uploadMyAvatar);

/**
 * @route   DELETE /api/v1/users/me/avatar
 * @desc    Delete user profile photo
 * @access  Private (self)
 */
router.delete('/me/avatar', auth, avatarController.deleteMyAvatar);

/**
 * @route   GET /api/v1/users/:id/avatar
 * @desc    Get user profile photo (public)
 * @access  Public
 */
router.get('/:id/avatar', avatarController.getUserAvatar);

/**
 * @route   DELETE /api/v1/users/:id/avatar
 * @desc    Admin removes user avatar (moderation)
 * @access  Private (team admin)
 */
router.delete('/:id/avatar', auth, avatarController.adminDeleteUserAvatar);

module.exports = router;