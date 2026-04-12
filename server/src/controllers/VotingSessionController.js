const VotingSession = require('../models/VotingSession');
const VoteSubmission = require('../models/VoteSubmission');
const VoteResult = require('../models/VoteResult');
const Match = require('../models/Match');
const Team = require('../models/Team');
const PlayerLeaderboardStats = require('../models/PlayerLeaderboardStats');
const VotingService = require('../services/VotingService');

// ✨ DEBUG INFO per VoteSubmission
console.log('🔍 DEBUG - VoteSubmission type:', typeof VoteSubmission);
console.log('🔍 DEBUG - VoteSubmission:', VoteSubmission);
console.log('🔍 DEBUG - VoteSubmission.name:', VoteSubmission?.name);
console.log('🔍 DEBUG - Is function:', typeof VoteSubmission === 'function');

// @desc    Create new voting session for match rating
// @route   POST /api/v1/voting-sessions
// @access  Private
const createVotingSession = async (req, res, next) => {
  try {
    console.log('\n === CREATE VOTING SESSION ===');
    console.log(' User:', req.user?.name);
    console.log(' Dati ricevuti:', req.body);

    // Delega tutta la business logic al service
    const votingService = new VotingService();
    const result = await votingService.createVotingSession(
      { id: req.user.id },
      req.body
    );

    const { session, matchInfo } = result;

    console.log(' Match VotingSession creata via service:', session._id);
    console.log(' === FINE CREATE VOTING SESSION ===\n');

    res.status(201).json({
      success: true,
      votingSession: {
        id: session._id,
        type: session.type,
        targetId: session.targetId,
        title: session.title,
        description: session.description,
        status: session.status,
        deadline: session.deadline,
        eligibleVoters: session.eligibleVoters.length,
        createdAt: session.createdAt,
        matchInfo: matchInfo
      }
    });

  } catch (error) {
    console.log(' ERRORE CREATE VOTING SESSION:', error.message);
    console.log(' Stack trace:', error.stack);
    console.log(' === FINE CREATE VOTING SESSION (ERRORE) ===\n');

    // Error handling appropriato
    if (error.message.includes('required')) {
      return res.status(400).json({ error: error.message });
    }
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({ error: 'Server error creating voting session' });
  }
};

// @desc    Get voting sessions for user (only match_rating)
// @route   GET /api/v1/voting-sessions
// @access  Private
const getUserVotingSessions = async (req, res) => {
  try {
    console.log('\n🟢 === GET USER VOTING SESSIONS ===');
    console.log('👤 User ID:', req.user.id);

    // Delega tutta la business logic al service
    const votingService = new VotingService();
    const sessionsWithStats = await votingService.getUserSessionsWithStats(req.user.id);

    console.log('✅ Sessions recuperate via service:', sessionsWithStats.length);
    console.log('🟢 === FINE GET USER VOTING SESSIONS ===\n');

    // Disabilita cache per dati real-time
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    res.json({
      success: true,
      votingSessions: sessionsWithStats,
      total: sessionsWithStats.length
    });

  } catch (error) {
    console.log('❌ ERRORE GET USER VOTING SESSIONS:', error.message);
    console.log('📋 Stack:', error.stack);
    console.log('🟢 === FINE GET USER VOTING SESSIONS (ERRORE) ===\n');

    if (error.message.includes('required')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Server error fetching voting sessions' });
  }
};

// @desc    Get specific voting session by ID
// @route   GET /api/v1/voting-sessions/:id
// @access  Private
const getVotingSession = async (req, res) => {
  try {
    console.log('\n🟡 === GET VOTING SESSION ===');
    console.log('📋 Session ID:', req.params.id);

    // Delega authorization e retrieval al service
    const votingService = new VotingService();
    const sessionData = await votingService.getSessionWithAuth(req.params.id, req.user.id);

    console.log('✅ Match session recuperata via service:', sessionData.title);
    console.log('🟡 === FINE GET VOTING SESSION ===\n');

    res.json({
      success: true,
      votingSession: sessionData
    });

  } catch (error) {
    console.log('❌ ERRORE GET VOTING SESSION:', error.message);
    console.log('🟡 === FINE GET VOTING SESSION (ERRORE) ===\n');

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('Invalid')) {
      return res.status(400).json({ error: error.message });
    }
    if (error.message.includes('Not authorized')) {
      return res.status(403).json({ error: error.message });
    }
    if (error.message.includes('required')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Server error fetching voting session' });
  }
};

// @desc    Submit vote for match rating session
// @route   POST /api/v1/voting-sessions/:id/vote
// @access  Private
const submitVote = async (req, res) => {
  console.log('\n🟣 === SUBMIT MATCH VOTE (CONTROLLER) ===');
  console.log('📋 Session ID:', req.params.id);
  console.log('👤 User ID:', req.user.id);

  try {
    // Crea istanza del service
    const votingService = new VotingService();

    // Delega tutta la business logic al service
    const result = await votingService.submitVote(
      req.params.id,
      req.user.id,
      req.body.vote
    );

    console.log('✅ Vote submission completata via service');
    console.log('🟣 === FINE SUBMIT MATCH VOTE (CONTROLLER) ===\n');

    // Restituisce response HTTP con dati dal service
    res.json({
      success: result.success,
      submission: {
        id: result.submission.id,
        submittedAt: result.submission.submittedAt,
        type: result.submission.type,
        playersRated: result.submission.playersRated,
        badgesAwarded: result.submission.badgesAwarded
      },
      autoCompleted: result.autoCompletion.autoCompleted,
      message: result.message
    });

  } catch (error) {
    console.log('❌ ERRORE SUBMIT MATCH VOTE (CONTROLLER):', error.message);
    console.log('🟣 === FINE SUBMIT MATCH VOTE (CONTROLLER - ERRORE) ===\n');

    // Gestione errori HTTP appropriata
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('not eligible') || error.message.includes('not authorized')) {
      return res.status(403).json({ error: error.message });
    }
    if (error.message.includes('already voted') || error.message.includes('not active') || error.message.includes('Invalid')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Server error submitting match vote' });
  }
};

// @desc    Get match rating calculation results
// @route   GET /api/v1/voting-sessions/:id/calculation
// @access  Private
const getVotingCalculation = async (req, res) => {
  try {
    console.log('\n🧮 === GET MATCH RATING CALCULATION ===');
    console.log('📊 User:', req.user?.name);
    console.log('📊 Session ID:', req.params.id);

    const { id: sessionId } = req.params;

    // Delega tutta la business logic al service
    const votingService = new VotingService();
    const result = await votingService.calculateVotingResults(sessionId);

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('❌ ERRORE GET MATCH RATING CALCULATION:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('Invalid')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Server error calculating match rating results' });
  }
};

// @desc    Complete match rating session and save official results
// @route   POST /api/v1/voting-sessions/:id/complete
// @access  Private
const completeVotingSession = async (req, res) => {
  try {
    console.log('\n🏁 === COMPLETE MATCH RATING SESSION ===');
    console.log('📊 User:', req.user?.name);
    console.log('📊 Session ID:', req.params.id);

    const { id: sessionId } = req.params;
    const { forceReopen } = req.body || {};

    // Gestione force reopen (logica specifica del controller)
    if (forceReopen) {
      const session = await VotingSession.findById(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Voting session not found' });
      }

      if (session.status === 'completed') {
        session.status = 'active';
        await session.save();
        await VoteResult.deleteOne({
          votingSessionId: sessionId,
          'sessionMetadata.sessionType': 'match_rating'
        });

        console.log('🔄 Match rating session riaperta per modifiche');
        return res.json({
          success: true,
          message: 'Match rating session reopened successfully',
          status: 'active'
        });
      }
    }

    // Delega completion al service
    const votingService = new VotingService();
    const result = await votingService.completeSession(sessionId, 'manual');

    // Gestisce caso già completata
    if (result.alreadyCompleted) {
      return res.status(400).json({
        error: 'Match rating session already completed',
        completedAt: result.completedAt,
        canReopen: true
      });
    }

    res.json({
      success: true,
      message: result.message,
      officialResults: result.officialResults,
      completedAt: result.completedAt,
      voteResultId: result.voteResultId
    });

  } catch (error) {
    console.error('❌ ERRORE COMPLETE MATCH RATING SESSION:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('Invalid')) {
      return res.status(400).json({ error: error.message });
    }
    if (error.message.includes('no votes')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Server error completing match rating session' });
  }
};

// @desc    Activate voting session (draft to active)
// @route   PATCH /api/v1/voting-sessions/:id/activate
// @access  Private
const activateVotingSession = async (req, res) => {
  try {
    console.log('\n🟠 === ACTIVATE VOTING SESSION ===');
    console.log('📋 Session ID:', req.params.id);

    // Delega business logic al service
    const votingService = new VotingService();
    const result = await votingService.activateSession(req.params.id, req.user.id);

    console.log('✅ Match rating session attivata via service:', result.title);
    console.log('🟠 === FINE ACTIVATE VOTING SESSION ===\n');

    res.json({
      success: true,
      message: 'Match rating session activated successfully',
      votingSession: result
    });

  } catch (error) {
    console.log('❌ ERRORE ACTIVATE VOTING SESSION:', error.message);
    console.log('🟠 === FINE ACTIVATE VOTING SESSION (ERRORE) ===\n');

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('Invalid') || error.message.includes('Can only')) {
      return res.status(400).json({ error: error.message });
    }
    if (error.message.includes('Only session creator')) {
      return res.status(403).json({ error: error.message });
    }
    if (error.message.includes('required')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Server error activating voting session' });
  }
};

// @desc    Get all individual submissions for a voting session (complete with vote details)
// @route   GET /api/v1/voting-sessions/:id/submissions
// @access  Private
const getSessionSubmissions = async (req, res) => {
  try {
    console.log('\n📋 === GET SESSION SUBMISSIONS (COMPLETE) ===');
    console.log('👤 User:', req.user?.name);
    console.log('📊 Session ID:', req.params.id);

    const { id: sessionId } = req.params;

    // Delega tutta la business logic al service
    const votingService = new VotingService();
    const result = await votingService.getSessionSubmissionsFormatted(sessionId, req.user.id);

    res.json({
      success: true,
      sessionId,
      submissions: result.submissions,
      totalSubmissions: result.submissions.length,
      sessionInfo: result.sessionInfo
    });

  } catch (error) {
    console.error('❌ ERRORE GET SESSION SUBMISSIONS:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('Invalid')) {
      return res.status(400).json({ error: error.message });
    }
    if (error.message.includes('Access denied')) {
      return res.status(403).json({ error: error.message });
    }
    if (error.message.includes('required')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Server error fetching session submissions' });
  }
};

// @desc    Get specific voter submission details
// @route   GET /api/v1/voting-sessions/:id/submissions/:voterId
// @access  Private
const getVoterSubmission = async (req, res) => {
  try {
    console.log('\n🔍 === GET VOTER SUBMISSION ===');
    console.log('👤 User:', req.user?.name);
    console.log('📊 Session ID:', req.params.id);
    console.log('🗳️ Voter ID:', req.params.voterId);

    const { id: sessionId, voterId } = req.params;

    // Delega business logic al service
    const votingService = new VotingService();
    const voterDetails = await votingService.getVoterSubmissionDetails(sessionId, voterId, req.user.id);

    res.json({
      success: true,
      sessionId,
      voterSubmission: voterDetails
    });

  } catch (error) {
    console.error('❌ ERRORE GET VOTER SUBMISSION:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('Invalid')) {
      return res.status(400).json({ error: error.message });
    }
    if (error.message.includes('Access denied')) {
      return res.status(403).json({ error: error.message });
    }
    if (error.message.includes('required')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Server error fetching voter submission' });
  }
};

// @desc    Get current user's active vote for a session
// @route   GET /api/v1/voting-sessions/:id/my-vote
// @access  Private
const getMyVote = async (req, res) => {
  try {
    console.log('\n🔵 === GET MY VOTE (CONTROLLER) ===');
    console.log('📋 Session ID:', req.params.id);
    console.log('👤 User ID:', req.user.id);

    const votingService = new VotingService();
    const result = await votingService.getMyVote(req.params.id, req.user.id);

    console.log('✅ My vote recuperato via service');
    console.log('🔵 === FINE GET MY VOTE (CONTROLLER) ===\n');

    res.json({
      success: true,
      vote: result
    });

  } catch (error) {
    console.log('❌ ERRORE GET MY VOTE (CONTROLLER):', error.message);
    console.log('🔵 === FINE GET MY VOTE (CONTROLLER - ERRORE) ===\n');

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('not eligible')) {
      return res.status(403).json({ error: error.message });
    }
    if (error.message.includes('Invalid') || error.message.includes('required')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Server error fetching user vote' });
  }
};

// @desc    Update user's vote for a match rating session
// @route   PATCH /api/v1/voting-sessions/:id/vote
// @access  Private
const updateVote = async (req, res) => {
  console.log('\n🟠 === UPDATE MATCH VOTE (CONTROLLER) ===');
  console.log('📋 Session ID:', req.params.id);
  console.log('👤 User ID:', req.user.id);

  try {
    const votingService = new VotingService();
    const result = await votingService.updateVote(
      req.params.id,
      req.user.id,
      req.body.vote
    );

    console.log('✅ Vote update completato via service');
    console.log('🟠 === FINE UPDATE MATCH VOTE (CONTROLLER) ===\n');

    res.json({
      success: result.success,
      submission: result.submission,
      message: result.message
    });

  } catch (error) {
    console.log('❌ ERRORE UPDATE MATCH VOTE (CONTROLLER):', error.message);
    console.log('🟠 === FINE UPDATE MATCH VOTE (CONTROLLER - ERRORE) ===\n');

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('not eligible') || error.message.includes('abstained')) {
      return res.status(403).json({ error: error.message });
    }
    if (error.message.includes('not active') || error.message.includes('Invalid') || error.message.includes('required')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Server error updating vote' });
  }
};

module.exports = {
  createVotingSession,
  getUserVotingSessions,
  getVotingSession,
  submitVote,
  activateVotingSession,
  getVotingCalculation,
  completeVotingSession,
  getSessionSubmissions,
  getMyVote,
  updateVote
};