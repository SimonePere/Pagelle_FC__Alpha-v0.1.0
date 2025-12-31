const express = require('express');
const router = express.Router();
const newsController = require('../controllers/NewsController');
const auth = require('../middleware/auth');

// =============================================
// 🔒 ALL NEWS ROUTES ARE PRIVATE
// (Authentication Required for All Endpoints)
// =============================================

// @route   GET /api/v1/news/:teamId/recent
// @desc    Get recent news for team
// @access  Private
router.get('/:teamId/recent', auth, newsController.getRecentNews);

// @route   GET /api/v1/news/:teamId/category/:category
// @desc    Get news by category
// @access  Private
router.get('/:teamId/category/:category', auth, newsController.getNewsByCategory);

// @route   GET /api/v1/news/:teamId/priority/:priority
// @desc    Get news by priority level
// @access  Private
// router.get('/:teamId/priority/:priority', auth, newsController.getNewsByPriority);

// @route   GET /api/v1/news/:teamId/urgent
// @desc    Get urgent/breaking news for dashboard
// @access  Private
// router.get('/:teamId/urgent', auth, newsController.getUrgentNews);

// @route   GET /api/v1/news/:newsId
// @desc    Get specific news item details
// @access  Private
// router.get('/:newsId', auth, newsController.getNewsById);

// @route   DELETE /api/v1/news/:newsId
// @desc    Delete news item (admin only)
// @access  Private
// router.delete('/:newsId', auth, newsController.deleteNews);

module.exports = router;
