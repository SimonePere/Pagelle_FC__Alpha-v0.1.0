const Match = require('../models/Match');
const Team = require('../models/Team');
const VotingSession = require('../models/VotingSession');

// @desc    Create new match
// @route   POST /api/v1/matches
// @access  Private
const createMatch = async (req, res) => {
  try {
    console.log('\n⚽ === CREATE MATCH with VOTING ===');
    console.log('👤 User:', req.user?.name);
    console.log('📥 Match data:', req.body);

    const { field, date, playersCount, notes, teamMemberIds } = req.body;

    // Validazione
    if (!field || !date) {
      return res.status(400).json({ error: 'Field and date are required' });
    }

    // 1. CREA IL MATCH (come prima)
    const match = await Match.create({
      createdBy: req.user.id,
      teamId: req.body.teamId,
      field: req.body.field,
      playersCount: req.body.playersCount,
      date: new Date(date),
      notes: notes || '',
      teamMemberIds: teamMemberIds || [req.user.id],
      status: 'active',
      finalResults: { teamGoals: 0, opponentGoals: 0 }
    });

    console.log('✅ Match creato:', match._id);

    // 2. AUTO-CREA VOTING SESSION
    const votingSession = await VotingSession.create({
      type: 'match_rating',
      targetType: 'match',
      targetId: match._id,
      teamId: req.body.teamId,
      createdBy: req.user.id,
      title: `📊 Creazione sessione votazione per Partita a ${playersCount}`,
      description: `Valuta i tuoi compagni nella partita a ${field} del ${new Date(date).toLocaleDateString('it-IT')}`,
      status: 'active',
      eligibleVoters: teamMemberIds || [req.user.id],
      tags: ['auto-generated', 'match-linked'],
      environment: 'production'
    });

    console.log('✅ VotingSession auto-creata:', votingSession._id);
    console.log('🔗 Match e Voting collegati!');
    console.log('⚽ === FINE CREATE MATCH + AUTO VOTING ===\n');

    // 3. RITORNA ENTRAMBI
    res.status(201).json({
      success: true,
      message: 'Match e sessione di votazione creati con successo!',
      match: {
        id: match._id,
        field: match.field,
        playersCount: match.playersCount,
        date: match.date,
        status: match.status,
        createdAt: match.createdAt
      },
      votingSession: {
        id: votingSession._id,
        title: votingSession.title,
        status: votingSession.status,
        type: votingSession.type
      }
    });

  } catch (error) {
    console.log('❌ ERRORE CREATE MATCH + VOTING:', error.message);
    console.log('📋 Stack:', error.stack);
    res.status(500).json({ error: 'Server error creating match and voting session' });
  }
};

// @desc    Get matches for a team
// @route   GET /api/v1/matches/team/:teamId
// @access  Private
const getTeamMatches = async (req, res) => {
  console.log('\n🟢 === GET TEAM MATCHES ===');
  console.log('📥 Team ID:', req.params.teamId);

  try {
    const { teamId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Check if user is team member
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    if (!team.isMember(req.user.id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // 🐛 DEBUG: Matches PRIMA del populate
    const matchesBeforePopulate = await Match.find({ teamId })
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    console.log('🔍 BEFORE populate - teamMemberIds raw data:');
    matchesBeforePopulate.forEach((match, idx) => {
      console.log(`  Match ${idx + 1} (${match._id}):`, {
        teamMemberIds: match.teamMemberIds,
        teamMemberIdsType: typeof match.teamMemberIds,
        teamMemberIdsLength: match.teamMemberIds?.length || 0,
        isArray: Array.isArray(match.teamMemberIds)
      });
    });

    // Get matches with pagination and populate
    const matches = await Match.find({ teamId })
      .populate('createdBy', 'name birthdate teamName')
      .populate('teamMemberIds', 'name birthdate profile.position teamName')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    // 🐛 DEBUG: Matches DOPO il populate  
    console.log('🔍 AFTER populate - teamMemberIds populated data:');
    matches.forEach((match, idx) => {
      console.log(`  Match ${idx + 1} (${match._id}):`, {
        teamMemberIds: match.teamMemberIds,
        teamMemberIdsType: typeof match.teamMemberIds,
        teamMemberIdsLength: match.teamMemberIds?.length || 0,
        isArray: Array.isArray(match.teamMemberIds),
        firstElement: match.teamMemberIds?.[0]
      });
    });

    const totalMatches = await Match.countDocuments({ teamId });

    console.log('✅ Matches trovati:', matches.length);
    console.log('🟢 === FINE GET TEAM MATCHES ===\n');

    // Prima di res.json(), aggiungi questo debug:
    console.log('🚨 DEBUG RESPONSE - cosa stiamo inviando al frontend:');
    console.log('First match teamMemberIds nella response:', matches[0]?.teamMemberIds);
    console.log('Type:', typeof matches[0]?.teamMemberIds);
    console.log('Length:', matches[0]?.teamMemberIds?.length);
    console.log('First element:', matches[0]?.teamMemberIds?.[0]);

    res.json({
      success: true,
      matches: matches.map(match => ({
        id: match._id,
        date: match.date,
        field: match.field,
        playersCount: match.playersCount,
        weather: match.weather,
        notes: match.notes,
        status: match.status,
        createdBy: match.createdBy,
        teamMemberIds: match.teamMemberIds,
        createdAt: match.createdAt,
        updatedAt: match.updatedAt,
        hasActiveVoting: false,
        votingSessionsCount: 0
      })),
      pagination: {
        page,
        limit,
        total: totalMatches,
        pages: Math.ceil(totalMatches / limit)
      }
    });

  } catch (error) {
    console.log('❌ ERRORE GET TEAM MATCHES:', error.message);
    console.log('🟢 === FINE GET TEAM MATCHES (ERRORE) ===\n');
    res.status(500).json({ error: 'Server error fetching matches' });
  }
};

/// @desc    Get single match details
// @route   GET /api/v1/matches/:id
// @access  Private
const getMatch = async (req, res) => {
  console.log('\n🟡 === GET MATCH DETAILS ===');
  console.log('📥 Match ID:', req.params.id);

  try {
    const match = await Match.findById(req.params.id)
      .populate('createdBy', 'name birthdate teamName')
      .populate('teamMemberIds', 'name birthdate profile.position teamName');

    // 🚨 AGGIUNGI QUESTI LOG QUI:
    console.log('🔍 match.teamMemberIds dopo populate:', match.teamMemberIds);
    console.log('🔍 Tipo:', typeof match.teamMemberIds);
    console.log('🔍 Length:', match.teamMemberIds?.length);
    console.log('🔍 Primo elemento:', match.teamMemberIds?.[0]);

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    // Check if user has access (team member)
    const team = await Team.findById(match.teamId);
    if (!team || !team.isMember(req.user.id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // 🆕 POPULATE VOTING SESSION
    const votingSession = await VotingSession.findOne({
      targetId: req.params.id,
      type: 'match_rating'
    });

    console.log('✅ Match details recuperati');
    console.log('🗳️ Voting session trovata:', votingSession?._id);
    console.log('🟡 === FINE GET MATCH DETAILS ===\n');

    res.json({
      success: true,
      match: {
        id: match._id,
        teamId: match.teamId,
        date: match.date,
        field: match.field,
        playersCount: match.playersCount,
        weather: match.weather,
        notes: match.notes,
        status: match.status,
        createdBy: match.createdBy,
        teamMemberIds: match.teamMemberIds,
        createdAt: match.createdAt,
        updatedAt: match.updatedAt,
        finalResults: match.finalResults || {},

        // 🆕 VOTING SESSION POPOLATA
        votingSession: votingSession ? {
          id: votingSession._id,
          status: votingSession.status,
          totalSubmissions: votingSession.summary.totalSubmissions,
          participationRate: votingSession.summary.participationRate,
          requiredVotes: votingSession.requiredVotes
        } : null,

        // 🆕 Future: questi campi verranno popolati dalle VotingSession
        activeVotingSessions: [], // Da implementare
        completedVotingSessions: [], // Da implementare
        canStartVoting: match.status === 'active'
      }
    });

  } catch (error) {
    console.log('❌ ERRORE GET MATCH:', error.message);
    console.log('🟡 === FINE GET MATCH (ERRORE) ===\n');
    res.status(500).json({ error: 'Server error fetching match' });
  }
};
// 🆕 NUOVO: Activate match for voting
// @desc    Activate match to start voting sessions
// @route   PATCH /api/v1/matches/:id/activate
// @access  Private  
const activateMatch = async (req, res) => {
  console.log('\n🟠 === ACTIVATE MATCH ===');
  console.log('📥 Match ID:', req.params.id);

  try {
    const match = await Match.findById(req.params.id);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    // Check if user has access (team admin)
    const team = await Team.findById(match.teamId);
    if (!team || !team.isAdmin(req.user.id)) {
      return res.status(403).json({ error: 'Only team admins can activate matches' });
    }

    if (match.status !== 'draft') {
      return res.status(400).json({ error: 'Can only activate draft matches' });
    }

    // Activate match
    match.status = 'active';
    await match.save();

    // 🆕 Future: Create VotingSession here
    // const votingSession = await VotingSession.create({...});

    console.log('✅ Match attivato per voting');
    console.log('🟠 === FINE ACTIVATE MATCH ===\n');

    res.json({
      success: true,
      message: 'Match activated for voting',
      match: {
        id: match._id,
        status: match.status,
        updatedAt: match.updatedAt
      }
    });

  } catch (error) {
    console.log('❌ ERRORE ACTIVATE MATCH:', error.message);
    console.log('🟠 === FINE ACTIVATE MATCH (ERRORE) ===\n');
    res.status(500).json({ error: 'Server error activating match' });
  }
};

// 🆕 NUOVO: Complete match
// @desc    Mark match as completed
// @route   PATCH /api/v1/matches/:id/complete
// @access  Private
const completeMatch = async (req, res) => {
  console.log('\n🟤 === COMPLETE MATCH ===');
  console.log('📥 Match ID:', req.params.id);

  try {
    const match = await Match.findById(req.params.id);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    // Check if user has access (team admin)
    const team = await Team.findById(match.teamId);
    if (!team || !team.isAdmin(req.user.id)) {
      return res.status(403).json({ error: 'Only team admins can complete matches' });
    }

    if (match.status === 'completed') {
      return res.status(400).json({ error: 'Match already completed' });
    }

    // Complete match
    match.status = 'completed';
    await match.save();

    // 🆕 Future: Close all VotingSessions and calculate final results
    // await VotingSession.updateMany({targetId: matchId}, {status: 'completed'});

    console.log('✅ Match completato');
    console.log('🟤 === FINE COMPLETE MATCH ===\n');

    res.json({
      success: true,
      message: 'Match completed',
      match: {
        id: match._id,
        status: match.status,
        updatedAt: match.updatedAt
      }
    });

  } catch (error) {
    console.log('❌ ERRORE COMPLETE MATCH:', error.message);
    console.log('🟤 === FINE COMPLETE MATCH (ERRORE) ===\n');
    res.status(500).json({ error: 'Server error completing match' });
  }
};

module.exports = {
  createMatch,
  getTeamMatches,
  getMatch,
  activateMatch,
  completeMatch
};