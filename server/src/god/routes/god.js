const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');

const requireScope = require('../../middleware/requireScope');
const requireGod = require('../../god/middleware/requireGod');
const godController = require('../../god/controllers/GodController');

/**
 * OVERVIEW
 * Serve a riempire le card principali del God Dashboard.
 *
 * Input query:
 * - range=7d|30d|90d|total
 * - oppure start=ISO&end=ISO
 * Esempio: GET /api/v1/god/overview?range=30d
 *
 * Response JSON:
 * {
 *   success: true,
 *   data: {
 *     source: 'live',
 *     range: '30d',
 *     generatedAt: '2026-08-01T10:00:00.000Z',
 *     metrics: {
 *       users: { totalRegistered: 1240, newInWindow: 87 },
 *       teams: { total: 96, createdInWindow: 12 },
 *       matches: { total: 1580, createdInWindow: 141 },
 *       voting: { sessionsCreatedInWindow: 141, submissionsInWindow: 932 },
 *       playerCards: { submissionsInWindow: 210 },
 *       awards: { eventsInWindow: 44 }
 *     }
 *   }
 * }
 */
router.get('/overview', auth, requireScope('full'), requireGod, godController.getOverview);

/**
 * DASHBOARD GRAPH DATA
 * Serve a riempire il grafico temporale del dashboard.
 *
 * Input query:
 * - range=30d|90d
 * - granularity=hour|day
 * Esempio: GET /api/v1/god/dashboard-graph-data?range=90d&granularity=day
 *
 * Response JSON:
 * {
 *   success: true,
 *   data: {
 *     labels: ['01/06', '02/06', '03/06', '04/06'],
 *     series: [
 *       { key: 'matches', label: 'Partite', data: [4, 6, 3, 7] },
 *       { key: 'votes', label: 'Voti', data: [18, 29, 11, 34] },
 *       { key: 'playerCards', label: 'Player Cards', data: [2, 5, 1, 4] }
 *     ]
 *   }
 * }
 *
 * Stato attuale: placeholder V1 -> labels e series vuoti.
 */
router.get('/dashboard-graph-data', auth, requireScope('full'), requireGod, godController.getDashboardGraphData);

/**
 * GUEST CONVERSION DATA
 * Serve a riempire la parte ospiti / inviti / conversione in registrati.
 *
 * Input query:
 * - range=30d|90d
 * Esempio: GET /api/v1/god/guest-conversion?range=90d
 *
 * Response JSON:
 * {
 *   success: true,
 *   data: {
 *     invited: 320,
 *     guestLogins: 240,
 *     promoted: 61,
 *     conversionRate: 25.4
 *   }
 * }
 *
 * Stato attuale: placeholder V1 con valori a zero.
 */
router.get('/guest-conversion', auth, requireScope('full'), requireGod, godController.getGuestConversionData);

/**
 * ENGAGEMENT
 * Serve a misurare uso reale di votazioni e player cards.
 *
 * Input query:
 * - range=7d|30d|90d
 * Esempio: GET /api/v1/god/engagement?range=30d
 *
 * Response JSON:
 * {
 *   success: true,
 *   data: {
 *     voting: {
 *       sessionsCreated: 141,
 *       submissions: 932,
 *       avgParticipationRate: 78.2,
 *       completionRate: 64.5,
 *       activeUsers7d: 188
 *     },
 *     playerCards: {
 *       sessionsCreated: 22,
 *       submissions: 210,
 *       completionRate: 57.1
 *     }
 *   }
 * }
 *
 * Stato attuale: placeholder V1 con oggetti vuoti.
 */
router.get('/engagement', auth, requireScope('full'), requireGod, godController.getEngagement);

/**
 * AWARDS KPI
 * Serve a misurare visualizzazioni, share e download del dominio award.
 *
 * Input query:
 * - range=30d|90d
 * Esempio: GET /api/v1/god/awards?range=30d
 *
 * Response JSON:
 * {
 *   success: true,
 *   data: {
 *     pending: 12,
 *     viewed: 98,
 *     shared: 31,
 *     publicVisits: 420,
 *     downloads: 77
 *   }
 * }
 *
 * Stato attuale: placeholder V1 con valori a zero.
 */
router.get('/awards', auth, requireScope('full'), requireGod, godController.getAwardsKpi);

/**
 * TOP TEAMS
 * Serve a riempire la card "Top 5 Team per partite" del God Dashboard.
 *
 * Input query:
 * - range=7d|30d|90d|total  (o start=ISO&end=ISO)
 * - limit=1..20 (default 5)
 * Esempio: GET /api/v1/god/top-teams?range=30d&limit=5
 *
 * Response JSON:
 * {
 *   success: true,
 *   data: [
 *     { teamId: '66...', teamName: 'DosiMele', matchCount: 25, memberCount: 6 }
 *   ]
 * }
 */
router.get('/top-teams', auth, requireScope('full'), requireGod, godController.getTopTeams);

/**
 * GOD USAGE
 * Serve a mostrare la tabella tecnica delle chiamate fatte alle API god.
 *
 * Input query:
 * - limit=1..500
 * Esempio: GET /api/v1/god/audit/usage?limit=50
 *
 * Response JSON:
 * {
 *   success: true,
 *   data: [
 *     {
 *       userId: 'abc123',
 *       path: '/api/v1/god/overview?range=30d',
 *       method: 'GET',
 *       statusCode: 200,
 *       latencyMs: 38,
 *       query: { range: '30d' },
 *       userAgent: 'Mozilla/5.0',
 *       at: '2026-08-01T09:58:00.000Z'
 *     }
 *   ]
 * }
 */
router.get('/audit/usage', auth, requireScope('full'), requireGod, godController.getGodUsage);

module.exports = router;