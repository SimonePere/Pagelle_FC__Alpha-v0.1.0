const VotingSession = require('../models/VotingSession');
const VoteSubmission = require('../models/VoteSubmission');
const VoteResult = require('../models/VoteResult');
const Match = require('../models/Match');
const Team = require('../models/Team');
const PlayerLeaderboardStats = require('../models/PlayerLeaderboardStats');

// Funzione per aggiornare best/worst rating di un giocatore
const updatePlayerBestWorstRating = async (playerId, newRating) => {
  try {
    const playerStats = await PlayerLeaderboardStats.findOne({ playerId: playerId });
    if (!playerStats) return;

    let updateFields = {};

    // Aggiorna best rating se è il primo voto o se è migliore
    if (playerStats.bestRating === null || newRating > playerStats.bestRating) {
      updateFields.bestRating = newRating;
      console.log(`🏆 Nuovo best rating per ${playerStats.playerName}: ${newRating}`);
    }

    // Aggiorna worst rating se è il primo voto o se è peggiore  
    if (playerStats.worstRating === null || newRating < playerStats.worstRating) {
      updateFields.worstRating = newRating;
      console.log(`📉 Nuovo worst rating per ${playerStats.playerName}: ${newRating}`);
    }

    // Aggiorna solo se necessario
    if (Object.keys(updateFields).length > 0) {
      await PlayerLeaderboardStats.findOneAndUpdate(
        { playerId: playerId },
        updateFields
      );
      console.log(`✅ Best/worst rating aggiornati per ${playerStats.playerName}`);
    }

  } catch (error) {
    console.error(`❌ Errore aggiornamento best/worst rating per ${playerId}:`, error.message);
  }
};

// ✨ UTILITY FUNCTION: Auto-complete quando tutti hanno votato
const checkAndAutoCompleteMatchVoting = async (sessionId) => {
  try {
    console.log('🔍 === CHECK AUTO-COMPLETE MATCH VOTING ===');
    console.log('📊 Session ID:', sessionId);
    console.log('📊 Session ID type:', typeof sessionId);

    const session = await VotingSession.findById(sessionId);
    console.log('📊 Sessione trovata:', !!session);
    console.log('📊 Session status:', session?.status);

    if (!session || session.status !== 'active') {
      console.log('⚠️ Sessione non trovata o non attiva, skip auto-complete');
      console.log('⚠️ Session exists:', !!session);
      console.log('⚠️ Session status:', session?.status);
      return false;
    }

    // Conta submissions attive
    const submissionsCount = await VoteSubmission.countDocuments({
      votingSessionId: sessionId,
      isActive: true
    });

    const totalEligibleVoters = session.eligibleVoters.length;

    console.log(`📊 Voti raccolti: ${submissionsCount}/${totalEligibleVoters}`);

    // Se tutti hanno votato, auto-complete!
    if (submissionsCount === totalEligibleVoters && submissionsCount > 0) {
      console.log('🎉 TUTTI HANNO VOTATO! Avvio auto-complete...');

      // Chiama la funzione completeVotingSession esistente
      // Simula una req/res per riutilizzare la logica esistente
      const mockReq = { params: { id: sessionId }, body: { autoCompleted: true, completionType: 'automatic' } };
      const mockRes = {
        status: () => mockRes,
        json: (data) => {
          console.log('✅ Auto-complete completato:', data.success ? 'SUCCESS' : 'FAILED');
          return data;
        }
      };

      await completeVotingSession(mockReq, mockRes);
      return true;
    }

    console.log('⏳ Non tutti hanno ancora votato, nessun auto-complete');
    return false;

  } catch (error) {
    console.error('❌ ERRORE AUTO-COMPLETE MATCH VOTING:', error.message);
    return false;
  }
};

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

    const { targetId, title, description, deadline } = req.body;
    const type = 'match_rating'; // Fisso per match rating

    // Validazione campi obbligatori
    if (!targetId) {
      return res.status(400).json({
        error: 'targetId (matchId) is required'
      });
    }

    // Verifica che la partita esista
    const match = await Match.findById(targetId);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    // Verifica che il team esista
    const team = await Team.findById(match.teamId);
    if (!team) {
      return res.status(403).json({ error: 'Team not found' });
    }

    // Crea la voting session per match rating
    const votingSession = await VotingSession.create({
      type: 'match_rating',
      targetId: match._id,
      teamId: match.teamId,
      createdBy: req.user.id,
      title: title || `Vota la partita vs ${match.opponent}`,
      description: description || `Valuta le prestazioni dei tuoi compagni nella partita del ${match.date?.toLocaleDateString('it-IT')}`,
      deadline: deadline ? new Date(deadline) : null,
      eligibleVoters: team.memberIds,
      status: 'active', // Match rating sessions are immediately active
      voteConfig: {
        ratingRange: { min: 1, max: 10, step: 0.5 },
        allowBadges: true,
        requiredFields: ['rating'],
        allowComments: true
      },
      field: match.field,
      date: match.date,
      playersCount: match.playersCount
    });

    console.log(' Match VotingSession creata:', votingSession._id);
    console.log(' === FINE CREATE VOTING SESSION ===\n');

    res.status(201).json({
      success: true,
      votingSession: {
        id: votingSession._id,
        type: votingSession.type,
        targetId: votingSession.targetId,
        title: votingSession.title,
        description: votingSession.description,
        status: votingSession.status,
        deadline: votingSession.deadline,
        eligibleVoters: votingSession.eligibleVoters.length,
        createdAt: votingSession.createdAt,
        matchInfo: {
          field: match.field,
          date: match.date,
          teamId: match.teamId,
          playersCount: match.playersCount
        }
      }
    });

  } catch (error) {
    console.log(' ERRORE CREATE VOTING SESSION:', error.message);
    console.log(' Stack trace:', error.stack);
    console.log(' === FINE CREATE VOTING SESSION (ERRORE) ===\n');
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

    // Trova tutte le sessioni match_rating dove l'utente è eligible voter
    const votingSessions = await VotingSession.find({
      eligibleVoters: req.user.id,
      type: 'match_rating'
    })
      .populate('targetId', 'opponent date venue')
      .sort({ createdAt: -1 })
      .limit(50);

    console.log('📊 Match rating sessions trovate:', votingSessions.length);

    // Adatta le sessioni per il frontend
    const adaptedSessions = await Promise.all(votingSessions.map(async session => {
      // Verifica se user ha già votato
      const hasVoted = await VoteSubmission.exists({
        votingSessionId: session._id,
        voterId: req.user.id
      });

      // Conta submissions totali
      const submissionsCount = await VoteSubmission.countDocuments({
        votingSessionId: session._id,
        isActive: true
      });

      return {
        id: session._id,
        type: session.type,
        targetId: session.targetId._id,
        teamId: session.teamId,
        createdBy: session.createdBy,
        title: session.title,
        description: session.description,
        status: session.status,
        deadline: session.deadline,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        eligibleVoters: session.eligibleVoters,
        eligibleVotersCount: session.eligibleVoters.length,
        submissionsCount,
        participationRate: Math.round((submissionsCount / session.eligibleVoters.length) * 100),
        isActive: session.status === 'active',
        hasVoted: !!hasVoted,
        canVote: session.status === 'active' && !hasVoted,
        matchInfo: {
          field: session.field,
          date: session.targetId.date,
          venue: session.targetId.venue,
          playersCount: session.playersCount,
        }
      };
    }));

    console.log('✅ Match sessions adattate per frontend');
    console.log('🟢 === FINE GET USER VOTING SESSIONS ===\n');

    res.json({
      success: true,
      votingSessions: adaptedSessions,
      total: adaptedSessions.length
    });

  } catch (error) {
    console.log('❌ ERRORE GET USER VOTING SESSIONS:', error.message);
    console.log('📋 Stack:', error.stack);
    console.log('🟢 === FINE GET USER VOTING SESSIONS (ERRORE) ===\n');
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

    const votingSession = await VotingSession.findById(req.params.id)
      .populate('targetId', 'opponent date venue teamMemberIds');

    if (!votingSession) {
      return res.status(404).json({ error: 'Voting session not found' });
    }

    // Verifica che sia una sessione match_rating
    if (votingSession.type !== 'match_rating') {
      return res.status(400).json({ error: 'Invalid session type' });
    }

    // Verifica che l'utente sia eligible voter
    if (!votingSession.eligibleVoters.includes(req.user.id)) {
      return res.status(403).json({ error: 'Not authorized to access this voting session' });
    }

    console.log('✅ Match session trovata:', votingSession.title);
    console.log('🟡 === FINE GET VOTING SESSION ===\n');

    res.json({
      success: true,
      votingSession: {
        id: votingSession._id,
        type: votingSession.type,
        title: votingSession.title,
        description: votingSession.description,
        status: votingSession.status,
        deadline: votingSession.deadline,
        createdAt: votingSession.createdAt,
        updatedAt: votingSession.updatedAt,
        voteConfig: votingSession.voteConfig,
        matchInfo: {
          field: votingSession.targetId.field,
          date: votingSession.targetId.date,
          venue: votingSession.targetId.venue,
          playersCount: votingSession.targetId.playersCount,
          playersToRate: votingSession.targetId.teamMemberIds
        }
      }
    });

  } catch (error) {
    console.log('❌ ERRORE GET VOTING SESSION:', error.message);
    console.log('🟡 === FINE GET VOTING SESSION (ERRORE) ===\n');
    res.status(500).json({ error: 'Server error fetching voting session' });
  }
};

// @desc    Submit vote for match rating session
// @route   POST /api/v1/voting-sessions/:id/vote
// @access  Private
const submitVote = async (req, res) => {
  console.log('\n🟣 === SUBMIT MATCH VOTE ===');
  console.log('📋 Session ID:', req.params.id);
  console.log('👤 User ID:', req.user.id);

  try {
    // 1. Trova la sessione di votazione
    const session = await VotingSession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Voting session not found' });
    }

    // 2. Validazioni specifiche per match rating
    if (session.type !== 'match_rating') {
      return res.status(400).json({ error: 'Invalid session type' });
    }

    if (session.status !== 'active') {
      return res.status(400).json({ error: 'Voting session is not active' });
    }

    if (!session.eligibleVoters.includes(req.user.id)) {
      return res.status(403).json({ error: 'User not eligible to vote' });
    }

    console.log('🔍 Cercando voto esistente per:', req.user.id, session._id);

    // 3. Controlla se ha già votato
    const existingVote = await VoteSubmission.findOne({
      votingSessionId: session._id,
      voterId: req.user.id,
      isActive: true
    });

    if (existingVote) {
      console.log('⚠️ Utente ha già votato');
      return res.status(400).json({ error: 'User has already voted' });
    }

    // 4. Trasforma i dati dal frontend al formato database
    console.log('🔄 Trasformando dati match rating...');
    console.log('📥 Dati ricevuti dal frontend:', JSON.stringify(req.body.vote, null, 2));

    // Mapping dei badge types dal frontend al database
    const badgeMapping = {
      'gol_piu_bello': 'gol_bello',
      'muro_difensivo': 'difensore',
      'assist_man': 'assist_man',
      'mvp': 'mvp',
      'maratoneta': 'maratoneta',
      'uomo_partita': 'mvp',
      'goleador': 'goleador'
    };

    const transformedVoteData = {
      playerRatings: [],
      badges: [],
      overallComment: req.body.vote.matchComments || ''
    };

    // Trasforma playerRatings da oggetto ad array
    if (req.body.vote.playerRatings) {
      Object.entries(req.body.vote.playerRatings).forEach(([playerId, playerData]) => {
        // Validazione rating range
        const rating = playerData.rating;
        if (rating < 1 || rating > 10) {
          throw new Error(`Invalid rating ${rating} for player ${playerId}. Must be between 1 and 10.`);
        }

        transformedVoteData.playerRatings.push({
          playerId: playerId,
          rating: rating,
          goals: Math.max(0, playerData.goals || 0),
          assists: Math.max(0, playerData.assists || 0),
          comment: playerData.comments || ''
        });

        // Aggiungi badges per questo giocatore con mapping
        if (playerData.badges && playerData.badges.length > 0) {
          playerData.badges.forEach(frontendBadgeType => {
            const dbBadgeType = badgeMapping[frontendBadgeType] || frontendBadgeType;

            // Verifica che il badge sia valido per match rating
            const validBadges = ['mvp', 'goleador', 'assist_man', 'difensore', 'maratoneta', 'gol_bello'];
            if (validBadges.includes(dbBadgeType)) {
              transformedVoteData.badges.push({
                playerId: playerId,
                badgeType: dbBadgeType
              });
              console.log(`✅ Badge mappato: ${frontendBadgeType} -> ${dbBadgeType}`);
            } else {
              console.log(`⚠️ Badge sconosciuto ignorato: ${frontendBadgeType} -> ${dbBadgeType}`);
            }
          });
        }
      });
    }

    console.log('📤 Dati trasformati per database:', JSON.stringify(transformedVoteData, null, 2));

    // 5. Crea e salva il voto
    const newVote = new VoteSubmission({
      votingSessionId: session._id,
      voterId: req.user.id,
      voteData: transformedVoteData,
      deviceInfo: req.body.deviceInfo || {},
      timeSpent: req.body.timeSpent || 0,
      version: 1,
      isActive: true,
      validated: false
    });

    console.log('🔍 DEBUG - newVote creato con successo');

    await newVote.save();

    console.log('✅ Voto match rating salvato con successo nel database');

    // 🎯 AUTO-COMPLETE: Controlla se tutti hanno votato PRIMA di updateSummary()
    const autoCompleted = await checkAndAutoCompleteMatchVoting(session._id);

    // 6. Aggiorna statistiche sessione DOPO auto-complete
    await session.updateSummary();

    console.log('🟣 === FINE SUBMIT MATCH VOTE ===\n');

    res.json({
      success: true,
      submission: {
        id: newVote._id,
        submittedAt: newVote.createdAt,
        type: 'match_rating'
      },
      autoCompleted, // 🎉 Informa frontend se session è stata completata automaticamente
      message: autoCompleted ? 'Voto salvato e votazione completata automaticamente!' : 'Voto salvato con successo'
    });

  } catch (error) {
    console.log('❌ ERRORE SUBMIT MATCH VOTE:', error.message);
    console.log('📋 Stack:', error.stack);
    console.log('🟣 === FINE SUBMIT MATCH VOTE (ERRORE) ===\n');
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

    // 1. Verifica che la sessione esista e sia match_rating
    const session = await VotingSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Voting session not found' });
    }

    if (session.type !== 'match_rating') {
      return res.status(400).json({ error: 'Invalid session type' });
    }

    // 2. Se la sessione è completed, cerca risultati ufficiali
    if (session.status === 'completed') {
      const officialResult = await VoteResult.findOne({
        votingSessionId: sessionId,
        'sessionMetadata.sessionType': 'match_rating'
      });

      if (officialResult) {
        console.log('📊 Restituendo risultati match rating ufficiali salvati');
        const savedResults = officialResult.getMatchRatingResults();
        if (savedResults) {
          return res.json({
            success: true,
            calculation: savedResults,
            isOfficial: true,
            completedAt: savedResults.calculatedAt
          });
        }
      }
    }

    // 3. Calcola risultati live
    console.log('🔄 Calcolando risultati match rating al volo per sessione', session.status);

    const submissions = await VoteSubmission.find({
      votingSessionId: sessionId,
      isActive: true
    }).populate('voterId', 'name');

    if (submissions.length === 0) {
      return res.status(404).json({ error: 'No votes found for this session' });
    }

    // 4. Aggrega risultati per giocatore
    const playerStats = {};

    submissions.forEach(submission => {
      const voterId = submission.voterId._id.toString();

      submission.voteData.playerRatings.forEach(playerRating => {
        const playerId = playerRating.playerId.toString();

        if (!playerStats[playerId]) {
          playerStats[playerId] = {
            ratings: [],
            selfReportedGoals: 0,
            selfReportedAssists: 0,
            badges: []
          };
        }

        // Aggiungi rating (tutti possono votare tutti)
        playerStats[playerId].ratings.push(playerRating.rating);

        // Gol/Assist SOLO self-reported
        if (voterId === playerId) {
          playerStats[playerId].selfReportedGoals = playerRating.goals || 0;
          playerStats[playerId].selfReportedAssists = playerRating.assists || 0;
        }
      });

      // Raccogli badge
      submission.voteData.badges?.forEach(badge => {
        const playerId = badge.playerId.toString();
        if (!playerStats[playerId]) {
          playerStats[playerId] = {
            ratings: [],
            selfReportedGoals: 0,
            selfReportedAssists: 0,
            badges: []
          };
        }
        playerStats[playerId].badges.push(badge.badgeType);
      });
    });

    // 5. Calcola risultati finali
    const results = {};
    Object.keys(playerStats).forEach(playerId => {
      const stats = playerStats[playerId];
      const voteCount = stats.ratings.length;

      if (voteCount > 0) {
        const ratings = stats.ratings;
        const average = ratings.reduce((sum, r) => sum + r, 0) / voteCount;

        // Calcola mediana
        const sortedRatings = [...ratings].sort((a, b) => a - b);
        const median = sortedRatings.length % 2 === 0
          ? (sortedRatings[Math.floor(sortedRatings.length / 2) - 1] + sortedRatings[Math.floor(sortedRatings.length / 2)]) / 2
          : sortedRatings[Math.floor(sortedRatings.length / 2)];

        results[playerId] = {
          averageRating: parseFloat(average.toFixed(1)),
          medianRating: parseFloat(median.toFixed(1)),
          goals: stats.selfReportedGoals,
          assists: stats.selfReportedAssists,
          voteCount: voteCount,
          badges: [...new Set(stats.badges)]
        };
      }
    });

    console.log('✅ Calcoli match rating live completati per', Object.keys(results).length, 'giocatori');

    res.json({
      success: true,
      calculation: {
        playerResults: results,
        totalVoters: submissions.length,
        sessionId: sessionId
      },
      isOfficial: false,
      calculatedAt: new Date()
    });

  } catch (error) {
    console.error('❌ ERRORE GET MATCH RATING CALCULATION:', error);
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

    // 1. Verifica che la sessione esista e sia match_rating
    const session = await VotingSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Voting session not found' });
    }

    if (session.type !== 'match_rating') {
      return res.status(400).json({ error: 'Invalid session type' });
    }

    // 2. Gestione force reopen
    if (session.status === 'completed' && !forceReopen) {
      const existingResult = await VoteResult.findOne({
        votingSessionId: sessionId,
        'sessionMetadata.sessionType': 'match_rating'
      });
      if (existingResult) {
        return res.status(400).json({
          error: 'Match rating session already completed',
          completedAt: existingResult.createdAt,
          canReopen: true
        });
      }
    }

    if (forceReopen && session.status === 'completed') {
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

    // 3. Calcola risultati finali
    const submissions = await VoteSubmission.find({
      votingSessionId: sessionId,
      isActive: true
    }).populate('voterId', 'name');

    if (submissions.length === 0) {
      return res.status(400).json({ error: 'Cannot complete session with no votes' });
    }

    // 4. Aggrega risultati (identica logica di getVotingCalculation)
    const playerStats = {};

    submissions.forEach(submission => {
      const voterId = submission.voterId._id.toString();

      submission.voteData.playerRatings.forEach(playerRating => {
        const playerId = playerRating.playerId.toString();

        if (!playerStats[playerId]) {
          playerStats[playerId] = {
            ratings: [],
            selfReportedGoals: 0,
            selfReportedAssists: 0,
            badges: []
          };
        }

        playerStats[playerId].ratings.push(playerRating.rating);

        if (voterId === playerId) {
          playerStats[playerId].selfReportedGoals = playerRating.goals || 0;
          playerStats[playerId].selfReportedAssists = playerRating.assists || 0;
        }
      });

      submission.voteData.badges?.forEach(badge => {
        const playerId = badge.playerId.toString();
        if (!playerStats[playerId]) {
          playerStats[playerId] = {
            ratings: [],
            selfReportedGoals: 0,
            selfReportedAssists: 0,
            badges: []
          };
        }
        playerStats[playerId].badges.push(badge.badgeType);
      });
    });

    // 5. Calcola risultati finali con statistiche avanzate
    const finalResults = {};
    Object.keys(playerStats).forEach(playerId => {
      const stats = playerStats[playerId];
      const voteCount = stats.ratings.length;

      if (voteCount > 0) {
        const ratings = stats.ratings;
        const average = ratings.reduce((sum, r) => sum + r, 0) / voteCount;

        const sortedRatings = [...ratings].sort((a, b) => a - b);
        const median = sortedRatings.length % 2 === 0
          ? (sortedRatings[Math.floor(sortedRatings.length / 2) - 1] + sortedRatings[Math.floor(sortedRatings.length / 2)]) / 2
          : sortedRatings[Math.floor(sortedRatings.length / 2)];

        finalResults[playerId] = {
          averageRating: parseFloat(average.toFixed(1)),
          medianRating: parseFloat(median.toFixed(1)),
          goals: stats.selfReportedGoals,
          assists: stats.selfReportedAssists,
          voteCount: voteCount,
          badges: [...new Set(stats.badges)]
        };
      }
    });

    // 6. Salva in VoteResult usando il metodo statico
    const voteResult = VoteResult.createMatchRatingResult(
      sessionId,
      finalResults,
      submissions.length
    );

    await voteResult.save();

    // 🎯 NUOVO: Aggiorna best/worst rating per ogni giocatore
    console.log('🔄 Aggiornamento best/worst rating...');
    for (const [playerId, results] of Object.entries(finalResults)) {
      await updatePlayerBestWorstRating(playerId, results.averageRating);
    }
    console.log('✅ Best/worst rating aggiornati per tutti i giocatori');

    // 7. Aggiorna session status
    session.status = 'completed';
    session.completedAt = new Date();
    session.completionType = req.body?.completionType || 'manual'; // 'automatic' se chiamato da auto-complete
    await session.save();

    // 🎯 NUOVO: Aggiorna anche Match status per coerenza dati
    try {
      const match = await Match.findById(session.targetId);
      if (match && match.status === 'active') {
        console.log('🔄 Aggiornando Match status da active → completed');
        match.status = 'completed';
        await match.save();
        console.log('✅ Match status aggiornato a completed');
      } else {
        console.log('ℹ️ Match non trovato o già completed, skip aggiornamento status');
      }
    } catch (error) {
      console.log('⚠️ Errore aggiornamento Match status:', error.message);
      // Non blocchiamo il flusso principale se c'è errore nel Match update
    }

    console.log('✅ Match rating session completata e risultati salvati');
    console.log('📊 Giocatori elaborati:', Object.keys(finalResults).length);
    console.log('🗳️ Votanti totali:', submissions.length);

    // 8. Leggi i risultati salvati per la risposta
    const savedResults = voteResult.getMatchRatingResults();

    res.json({
      success: true,
      message: 'Match rating session completed successfully',
      officialResults: savedResults || finalResults,
      completedAt: session.completedAt,
      voteResultId: voteResult._id
    });

  } catch (error) {
    console.error('❌ ERRORE COMPLETE MATCH RATING SESSION:', error);
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

    const votingSession = await VotingSession.findById(req.params.id);

    if (!votingSession) {
      return res.status(404).json({ error: 'Voting session not found' });
    }

    if (votingSession.type !== 'match_rating') {
      return res.status(400).json({ error: 'Invalid session type' });
    }

    // Verifica che l'utente sia il creatore
    if (votingSession.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Only session creator can activate' });
    }

    if (votingSession.status !== 'draft') {
      return res.status(400).json({ error: 'Can only activate draft sessions' });
    }

    // Attiva la sessione
    votingSession.status = 'active';
    votingSession.startedAt = new Date();
    await votingSession.save();

    console.log('✅ Match rating session attivata:', votingSession.title);
    console.log('🟠 === FINE ACTIVATE VOTING SESSION ===\n');

    res.json({
      success: true,
      message: 'Match rating session activated successfully',
      votingSession: {
        id: votingSession._id,
        type: votingSession.type,
        status: votingSession.status,
        startedAt: votingSession.startedAt
      }
    });

  } catch (error) {
    console.log('❌ ERRORE ACTIVATE VOTING SESSION:', error.message);
    console.log('🟠 === FINE ACTIVATE VOTING SESSION (ERRORE) ===\n');
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

    // 1. Verifica che la sessione esista e sia match_rating
    const session = await VotingSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Voting session not found' });
    }

    if (session.type !== 'match_rating') {
      return res.status(400).json({ error: 'Invalid session type' });
    }

    // 2. Verifica che l'utente abbia accesso alla sessione
    if (!session.eligibleVoters.includes(req.user.id)) {
      return res.status(403).json({ error: 'Access denied to this voting session' });
    }

    // 3. Recupera tutti i submissions attivi con tutti i dettagli
    const submissions = await VoteSubmission.find({
      votingSessionId: sessionId,
      isActive: true
    })
      .populate('voterId', 'name email')
      .populate('voteData.playerRatings.playerId', 'name email')
      .sort({ createdAt: -1 });

    // 4. Formatta tutti i submissions completi per il frontend
    const completeSubmissions = submissions.map(submission => ({
      // Info del votante
      voter: {
        id: submission.voterId._id,
        name: submission.voterId.name
      },

      // Metadata della submission
      submissionInfo: {
        submittedAt: submission.createdAt,
        timeSpent: submission.timeSpent || null,
        hasBeenModified: submission.hasBeenModified,
        lastModifiedAt: submission.updatedAt,
        overallComment: submission.voteData.overallComment || ''
      },

      // Tutti i voti che ha dato questo votante
      playerVotes: submission.voteData.playerRatings.map(playerRating => ({
        player: {
          id: playerRating.playerId._id,
          name: playerRating.playerId.name
        },
        rating: playerRating.rating,
        goals: playerRating.goals || 0,
        assists: playerRating.assists || 0,
        comment: playerRating.comment || ''
      })),

      // Badge assegnati
      badges: submission.voteData.badges?.map(badge => ({
        playerId: badge.playerId,
        badgeType: badge.badgeType
      })) || []
    }));

    console.log('✅ Trovati', completeSubmissions.length, 'voti completi');
    console.log('📊 Totale giocatori votati:', completeSubmissions.reduce((sum, sub) => sum + sub.playerVotes.length, 0));

    res.json({
      success: true,
      sessionId,
      submissions: completeSubmissions,
      totalSubmissions: completeSubmissions.length,
      sessionInfo: {
        title: session.title,
        status: session.status,
        totalEligibleVoters: session.eligibleVoters.length
      }
    });

  } catch (error) {
    console.error('❌ ERRORE GET SESSION SUBMISSIONS:', error);
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

    // 1. Verifica che la sessione esista
    const session = await VotingSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Voting session not found' });
    }

    if (session.type !== 'match_rating') {
      return res.status(400).json({ error: 'Invalid session type' });
    }

    // 2. Verifica che l'utente abbia accesso
    if (!session.eligibleVoters.includes(req.user.id)) {
      return res.status(403).json({ error: 'Access denied to this voting session' });
    }

    // 3. Trova il submission specifico
    const submission = await VoteSubmission.findOne({
      votingSessionId: sessionId,
      voterId: voterId,
      isActive: true
    })
      .populate('voterId', 'name email')
      .populate('voteData.playerRatings.playerId', 'name email');

    if (!submission) {
      return res.status(404).json({ error: 'Vote submission not found for this voter' });
    }

    // 4. Formatta i dettagli per il frontend
    const voterDetails = {
      voter: {
        id: submission.voterId._id,
        name: submission.voterId.name,
        email: submission.voterId.email
      },
      submissionInfo: {
        submittedAt: submission.submittedAt,
        timeSpent: submission.timeSpent || null,
        hasBeenModified: submission.hasBeenModified,
        lastModifiedAt: submission.lastModifiedAt,
        overallComment: submission.voteData.overallComment || ''
      },
      playerVotes: submission.voteData.playerRatings.map(playerRating => ({
        player: {
          id: playerRating.playerId._id,
          name: playerRating.playerId.name
        },
        rating: playerRating.rating,
        goals: playerRating.goals || 0,
        assists: playerRating.assists || 0,
        comment: playerRating.comment || ''
      })),
      badges: submission.voteData.badges?.map(badge => ({
        playerId: badge.playerId,
        badgeType: badge.badgeType
      })) || []
    };

    console.log('✅ Dettagli voto trovati per:', submission.voterId.name);
    console.log('📊 Giocatori votati:', voterDetails.playerVotes.length);

    res.json({
      success: true,
      sessionId,
      voterSubmission: voterDetails
    });

  } catch (error) {
    console.error('❌ ERRORE GET VOTER SUBMISSION:', error);
    res.status(500).json({ error: 'Server error fetching voter submission' });
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
  getSessionSubmissions
};