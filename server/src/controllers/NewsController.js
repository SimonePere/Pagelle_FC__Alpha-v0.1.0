// controllers/NewsController.js
const NewsService = require('../services/NewsService');

/**
 * NEWS CONTROLLER
 * 
 * Orchestration-only controller che delega tutta la business logic
 * al NewsService. Gestisce solo HTTP request/response.
 * 
 * Endpoint supportati:
 * - GET /api/v1/news/:teamId/recent
 * - GET /api/v1/news/:teamId/category/:category
 * - GET /api/v1/news/:teamId/priority/:priority
 * - GET /api/v1/news/:teamId/urgent
 * - GET /api/v1/news/:newsId
 * - DELETE /api/v1/news/:newsId
 */

// Initialize services
const newsService = new NewsService();

// @desc    Get recent news for team
// @route   GET /api/v1/news/:teamId/recent
// @access  Private
const getRecentNews = async (req, res, next) => {
    try {
        const { teamId } = req.params;
        const limit = parseInt(req.query.limit) || 10;

        const result = await newsService.getRecentNews(teamId, limit);

        res.json(result);

    } catch (error) {
        next(error);
    }
};


// @desc    Get news by category
// @route   GET /api/v1/news/:teamId/category/:category
// @access  Private
const getNewsByCategory = async (req, res, next) => {
    try {
        const { teamId, category } = req.params;
        const limit = parseInt(req.query.limit) || 10;

        const result = await newsService.getNewsByCategory(teamId, {
            category: category,
            limit: limit
        });

        res.json(result);

    } catch (error) {
        next(error);
    }
};

// @desc    Get news by priority
// @route   GET /api/v1/news/:teamId/priority/:priority
// @access  Private
const getNewsByPriority = async (req, res, next) => {
    try {
        const { teamId, priority } = req.params;
        const limit = parseInt(req.query.limit) || 10;

        const result = await newsService.getNewsByTeam(teamId, {
            priority: priority,
            limit: limit
        });

        res.json(result);

    } catch (error) {
        next(error);
    }
}


// @desc    Get urgent news for dashboard
// @route   GET /api/v1/news/:teamId/urgent
// @access  Private
const getUrgentNews = async (req, res, next) => {
    try {
        const { teamId } = req.params;
        const limit = parseInt(req.query.limit) || 10;

        const result = await newsService.getNewsByTeam(teamId, {
            priority: 'urgent',
            limit: limit
        });

        res.json(result);

    } catch (error) {
        next(error);
    }
};

// @desc    Get specific news item
// @route   GET /api/v1/news/:newsId
// @access  Private
const getNewsById = async (req, res, next) => {
    try {
        const { newsId } = req.params;

        // Note: Questo metodo potrebbe richiedere implementazione specifica nel Service
        // Per ora uso accesso diretto al repository fino a implementazione Service
        const result = await newsService.newsRepository.findById(newsId);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete news item (admin only) INUTILE E NON UTILIZZATO
// @route   DELETE /api/v1/news/:newsId
// @access  Private/Admin
const deleteNews = async (req, res, next) => {
    try {
        const { newsId } = req.params;

        // Note: Metodo dichiarato inutilizzato - mantengo per compatibility
        const result = await newsService.newsRepository.delete(newsId);

        res.json({
            success: true,
            message: 'News deleted successfully',
            deletedId: newsId
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getRecentNews,
    getNewsByCategory,
    getNewsByPriority,
    getUrgentNews,
    getNewsById,
    deleteNews
};