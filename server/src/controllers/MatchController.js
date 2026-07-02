const MatchService = require('../services/MatchService');
const CacheService = require('../services/CacheService');
const SeasonService = require('../services/SeasonService');

const seasonService = new SeasonService();

/**
 * MATCH CONTROLLER
 * 
 * Orchestration-only controller che delega tutta la business logic
 * al MatchService. Gestisce solo HTTP request/response.
 * 
 * Endpoint supportati:
 * - POST /api/v1/matches
 * - GET /api/v1/matches/team/:teamId
 * - GET /api/v1/matches/:id
 * - PATCH /api/v1/matches/:id/activate
 * - PATCH /api/v1/matches/:id/complete
 * - POST /api/v1/matches/:matchId/reactivate-voter/:userId
 * - POST /api/v1/matches/:matchId/guest-player
 */

// Initialize service
const matchService = new MatchService();

/**
// @desc    Create new match
// @route   POST /api/v1/matches
// @access  Private
*/
const createMatch = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const matchData = req.body;

    const result = await matchService.createMatch(userId, matchData);

    res.status(201).json(result);

  } catch (error) {
    next(error);
  }
};

/**
// @desc    Update match
// @route   PUT /api/v1/matches/:id
// @access  Private (team members only)
*/
const updateMatch = async (req, res, next) => {
  try {
    const matchId = req.params.id;
    const userId = req.user.id;
    const updateData = req.body;

    const result = await matchService.updateMatch(matchId, userId, updateData);

    res.json(result);

  } catch (error) {
    next(error);
  }
};

/**
// @desc    Delete match
// @route   DELETE /api/v1/matches/:id
// @access  Private (team members only)
*/
const deleteMatch = async (req, res, next) => {
  try {
    const matchId = req.params.id;
    const userId = req.user.id;

    const result = await matchService.deleteMatch(matchId, userId);

    res.json(result);

  } catch (error) {
    next(error);
  }
};

/**
// @desc    Get matches for a team
// @route   GET /api/v1/matches/team/:teamId
// @access  Private
*/
const getTeamMatches = async (req, res, next) => {
  try {
    const { teamId } = req.params;
    const userId = req.user.id;

    // Risolve il parametro ?season= (default: stagione corrente)
    let seasonId;
    try {
      seasonId = seasonService.resolveSeasonParam(req.query.season);
    } catch (seasonErr) {
      return res.status(400).json({ success: false, error: seasonErr.message });
    }

    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 100,
      seasonId
    };

    // 🎯 CACHE STRATEGY: Solo per history match (completed), non per match attivi.
    // La cache key include il seasonId per evitare collisioni tra stagioni.
    const seasonKey = seasonId || 'all';
    const cacheKey = `matches:team:${teamId}:season:${seasonKey}:page${options.page}:limit${options.limit}:completed:history`;
    const cached = await CacheService.get(cacheKey);

    if (cached) {
      // Get fresh data per avere match aggiornati post-completion
      const freshResult = await matchService.getTeamMatches(teamId, userId, options);

      // 🎯 FIX: Check se ci sono nuovi completed rispetto al cache
      const freshCompleted = freshResult.matches.filter(m => m.status === 'completed');
      const cachedCompleted = cached.matches;

      // Se nuovi completed, invalida cache e usa fresh data
      if (freshCompleted.length > cachedCompleted.length) {
        console.log(`🔄 NEW COMPLETED: ${freshCompleted.length} vs ${cachedCompleted.length} cached - usando fresh data`);
        // NON usare cache, continua con fresh data flow
      } else {
        // Safe merge: cache completed + fresh active
        const activeMatches = freshResult.matches.filter(m => m.status === 'active');
        const allMatches = [...cachedCompleted, ...activeMatches];

        // Sort by date descending
        allMatches.sort((a, b) => new Date(b.date) - new Date(a.date));

        console.log(`📊 SAFE MERGE: ${cachedCompleted.length} cached + ${activeMatches.length} active = ${allMatches.length} total`);

        return res.json({
          matches: allMatches,
          total: allMatches.length,
          page: options.page,
          limit: options.limit,
          source: 'hybrid_cache',
          cache_stats: {
            cached_completed: cachedCompleted.length,
            fresh_active: activeMatches.length
          }
        });
      }
    }

    console.log(`🗄️ CACHE VUOTO: Recupero match team ${teamId} dal database...`);
    const result = await matchService.getTeamMatches(teamId, userId, options);

    // 💾 CACHE STRATEGY: Cache solo completed, ma RITORNA tutti i match
    const now = new Date();
    const oneYearAgo = new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000));

    const completedMatches = result.matches.filter(m => {
      const matchDate = new Date(m.date);
      return m.status === 'completed' &&
        matchDate <= now &&
        matchDate >= oneYearAgo; // Solo completed recenti per cache
    });

    if (completedMatches.length > 0) {
      // Cache solo i completed, ma response include TUTTI
      const cacheableResult = {
        ...result,
        matches: completedMatches,
        total: completedMatches.length, // Total cache diverso da total response
        cached_matches_count: completedMatches.length,
        filtered_future_dates: result.matches.filter(m => {
          const matchDate = new Date(m.date);
          return m.status === 'completed' && (matchDate > now || matchDate < oneYearAgo);
        }).length
      };

      await CacheService.set(cacheKey, cacheableResult, 3600, [`team:${teamId}`, 'matches:completed']);
      console.log(`💾 CACHE: ${completedMatches.length} completed memorizzati per performance`);
      console.log(`📋 RESPONSE: ${result.matches.length} total match (attivi + completed)`);
      if (result.matches.length > completedMatches.length) {
        console.log(`   ⚡ ${result.matches.length - completedMatches.length} match attivi mostrati fresh dal DB`);
      }
    }

    // Disabilita browser cache per dati real-time
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    res.json({
      ...result,
      source: 'database'
    });

  } catch (error) {
    next(error);
  }
};

/**
// @desc    Get single match details
// @route   GET /api/v1/matches/:id
// @access  Private
*/
const getMatch = async (req, res, next) => {
  try {
    const matchId = req.params.id;
    const userId = req.user.id;

    // 🎯 CACHE STRATEGY: Solo per match completed, skip per active/draft
    const cacheKey = `match:${matchId}:details:completed`;

    console.log('🔍 Controllo cache per dettagli match...');
    const cached = await CacheService.get(cacheKey);

    if (cached) {
      console.log(`⚡ DETTAGLI RAPIDI: Match ${matchId} servito dalla cache (completed)`);
      return res.json({
        ...cached,
        source: 'cache'
      });
    }

    console.log(`🗄️ CACHE VUOTO: Recupero dettagli match ${matchId} dal database...`);
    const result = await matchService.getMatchDetails(matchId, userId);

    // 💾 CACHE STRATEGY: Salva solo se match è completed
    if (result.match && result.match.status === 'completed') {
      await CacheService.set(cacheKey, result, 3600, [`match:${matchId}`, 'match:completed']);
      console.log(`💾 DETTAGLI SALVATI: Match completed ${matchId} memorizzato per 60 minuti`);
    } else {
      console.log(`⚠️ Match ${matchId} non completed - cache skippato per garantire freshness`);
    }

    res.json({
      ...result,
      source: 'database'
    });

  } catch (error) {
    next(error);
  }
};

/**
// @desc    Activate match to start voting sessions
// @route   PATCH /api/v1/matches/:id/activate
// @access  Private  
*/
const activateMatch = async (req, res, next) => {
  try {
    const matchId = req.params.id;
    const userId = req.user.id;

    const result = await matchService.activateMatch(matchId, userId);

    res.json(result);

  } catch (error) {
    next(error);
  }
};

/**
// @desc    Mark match as completed
// @route   PATCH /api/v1/matches/:id/complete
// @access  Private
*/
const completeMatch = async (req, res, next) => {
  try {
    const matchId = req.params.id;
    const userId = req.user.id;

    const result = await matchService.completeMatch(matchId, userId);

    res.json(result);

  } catch (error) {
    next(error);
  }
};

/**
// @desc    Riattiva un utente astenuto
// @route   POST /api/v1/matches/:matchId/reactivate-voter/:userId
// @access  Private
*/
const reactivateVoter = async (req, res, next) => {
  try {
    const { matchId, userId } = req.params;
    const reactivatingUserId = req.user.id;

    const result = await matchService.reactivateVoter(matchId, userId, reactivatingUserId);

    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
// @desc Aggiunge un utente registrato (o guest esistente del team) al roster di un match già creato
// @route POST /api/v1/matches/:id/players
// @body  { userId }
// @access Private (admin globale o admin del team)
*/
const addRegisteredPlayer = async (req, res, next) => {
  try {
    const matchId = req.params.id;
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId è obbligatorio' });
    }

    const result = await matchService.addRegisteredPlayerToMatch(matchId, userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
// @desc Crea un nuovo guest player e lo aggiunge al roster del match (e al Team)
// @route POST /api/v1/matches/:id/guest-players
// @body  { name, position? }
// @access Private (admin globale o admin del team)
*/
const addGuestPlayerToMatch = async (req, res, next) => {
  try {
    const matchId = req.params.id;
    const { name, position } = req.body;
    const requesterId = req.user.id;

    const result = await matchService.addGuestPlayerToMatch(
      matchId,
      { name, position },
      requesterId
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
// @desc Rimuove un giocatore dal roster di un match (NON cancella l'utente)
// @route DELETE /api/v1/matches/:id/players/:playerId
// @access Private (admin globale o admin del team)
*/
const removePlayerFromMatch = async (req, res, next) => {
  try {
    const { id: matchId, playerId } = req.params;
    const result = await matchService.removePlayerFromMatch(matchId, playerId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
// @desc Stato editabilità roster (per la UI)
// @route GET /api/v1/matches/:id/roster-editable
// @access Private (admin globale o admin del team)
*/
const getRosterEditable = async (req, res, next) => {
  try {
    const matchId = req.params.id;
    const result = await matchService.getRosterEditableStatus(matchId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createMatch,
  getTeamMatches,
  getMatch,
  activateMatch,
  completeMatch,
  updateMatch,
  deleteMatch,
  reactivateVoter,
  addRegisteredPlayer,
  addGuestPlayerToMatch,
  removePlayerFromMatch,
  getRosterEditable
};