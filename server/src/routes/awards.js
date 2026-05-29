/**
 * AWARD ROUTES
 * 
 * Tutte le route relative agli Award (card celebrative).
 * 
 * PRIVATE (JWT required):
 *   GET    /api/v1/awards/team/:teamId       → Bacheca award team
 *   GET    /api/v1/awards/pending            → Award non viste dall'utente
 *   GET    /api/v1/awards/:awardId           → Dettaglio singolo award
 *   POST   /api/v1/awards/:awardId/viewed    → Marca come vista
 *   POST   /api/v1/awards/:awardId/share     → Tracking condivisione
 * 
 * PUBLIC (no auth):
 *   GET    /api/v1/awards/public/:awardId    → Dati card per pagina pubblica
 */

const express = require('express');
const router = express.Router();
const awardController = require('../controllers/AwardController');
const auth = require('../middleware/auth');

// =============================================
// 🌐 PUBLIC ROUTES (no authentication)
// =============================================

// @route   GET /api/v1/awards/public/:awardId
// @desc    Pagina pubblica card (per link condivisi, no login richiesto)
// @access  Public
router.get('/public/:awardId', awardController.getPublicAward);

// @route   GET /api/v1/awards/public/:awardId/download
// @desc    Download PNG della card (Content-Disposition attachment).
//          ?variant=square|story|thumb (default: square)
// @access  Public (card già pubblicamente esposta via /c/:id)
router.get('/public/:awardId/download', awardController.downloadAwardImage);

// =============================================
// 🔒 PRIVATE ROUTES (authentication required)
// =============================================

// @route   GET /api/v1/awards/pending
// @desc    Award READY non ancora viste dall'utente (tutti i team)
// @access  Private
router.get('/pending', auth, awardController.getPendingAwards);

// @route   GET /api/v1/awards/team/:teamId
// @desc    Bacheca award di un team (filtro ?type=&status=&limit=&skip=)
// @access  Private (membro team)
router.get('/team/:teamId', auth, awardController.getTeamAwards);

// @route   GET /api/v1/awards/:awardId
// @desc    Dettaglio singolo award
// @access  Private (membro team)
router.get('/:awardId', auth, awardController.getAwardById);

// @route   POST /api/v1/awards/:awardId/viewed
// @desc    Marca award come vista (dopo reveal animation)
// @access  Private
router.post('/:awardId/viewed', auth, awardController.markViewed);

// @route   POST /api/v1/awards/:awardId/share
// @desc    Tracking condivisione (body: {channel: 'whatsapp'|...})
// @access  Private
router.post('/:awardId/share', auth, awardController.trackShare);

module.exports = router;
