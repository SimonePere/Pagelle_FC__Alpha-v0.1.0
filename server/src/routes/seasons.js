/**
 * SEASONS ROUTES
 *
 * Base URL: /api/v1/seasons
 *
 * GET /api/v1/seasons
 *   Lista di tutte le stagioni in ordine cronologico DESC.
 *   Usata dal frontend per popolare il <SeasonSelector />.
 *   Accesso: utenti autenticati.
 */
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const SeasonService = require('../services/SeasonService');
const { runSeasonRollover } = require('../jobs/seasonRolloverJob');

const seasonService = new SeasonService();

// @route   GET /api/v1/seasons
// @desc    Lista stagioni (DESC) per dropdown UI
// @access  Private
router.get('/', auth, async (req, res, next) => {
    try {
        const seasons = await seasonService.listSeasons();
        res.json({ success: true, seasons });
    } catch (error) {
        next(error);
    }
});

// @route   POST /api/v1/seasons/rollover
// @desc    Trigger manuale rollover stagione (admin only)
// @access  Private — admin
router.post('/rollover', auth, requireRole('admin'), async (req, res, next) => {
    try {
        const result = await runSeasonRollover();
        res.json({ success: true, ...result });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
