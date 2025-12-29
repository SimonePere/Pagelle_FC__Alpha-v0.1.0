const mongoose = require('mongoose');

/**
 * VOTE RESULT MODEL
 * 
 * Contiene i risultati finali aggregati e le statistiche di una votazione MATCH_RATING.
 * Si crea automaticamente quando una VotingSession viene completata.
 * 
 * RESPONSABILITÀ:
 * - Memorizzare RISULTATI FINALI per tutti i giocatori di una partita
 * - Calcolare STATISTICHE (medie, distribuzione, confidence)
 * - Fornire BREAKDOWN DETTAGLIATO per transparency
 * - Ottimizzare QUERY per analytics e reports
 */

const VoteResultSchema = new mongoose.Schema({
  // === RIFERIMENTI ===

  votingSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VotingSession',
    required: true,
    index: true
  },

  // === RISULTATI MATCH RATING MULTI-PLAYER ===
  matchRatingResults: {
    type: Map,
    of: {
      playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      averageRating: { type: Number, min: 1, max: 10, required: true },
      medianRating: { type: Number, min: 1, max: 10 },
      goals: { type: Number, default: 0, min: 0 },
      assists: { type: Number, default: 0, min: 0 },
      voteCount: { type: Number, min: 0, required: true },
      badges: [{
        type: String,
        enum: ['mvp', 'goleador', 'assist_man', 'difensore', 'maratoneta', 'gol_bello']
      }],
      grade: {
        type: String,
        enum: ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F']
      },
      // Statistiche individuali per giocatore
      standardDeviation: { type: Number, min: 0 },
      confidence: { type: Number, min: 0, max: 1 }
    }
  },

  // === METADATI SESSIONE ===
  sessionMetadata: {
    totalVoters: { type: Number, min: 0, required: true },
    sessionType: {
      type: String,
      enum: ['match_rating'],
      default: 'match_rating',
      required: true
    },
    calculatedAt: { type: Date, default: Date.now },
    playersCount: { type: Number, min: 0 },
    completionRate: { type: Number, min: 0, max: 100 }
  },

  // === STATISTICHE GENERALI PARTITA ===
  statistics: {
    voteCount: { type: Number, required: true, min: 0 },
    overallAverageRating: { type: Number, min: 1, max: 10 },
    totalGoalsReported: { type: Number, default: 0, min: 0 },
    totalAssistsReported: { type: Number, default: 0, min: 0 },

    // Distribuzione generale dei voti
    ratingDistribution: {
      '9-10': { type: Number, default: 0 },
      '8-9': { type: Number, default: 0 },
      '7-8': { type: Number, default: 0 },
      '6-7': { type: Number, default: 0 },
      '5-6': { type: Number, default: 0 },
      'below-5': { type: Number, default: 0 }
    },

    // Badge summary
    badgesSummary: {
      mvp: { type: Number, default: 0 },
      goleador: { type: Number, default: 0 },
      assist_man: { type: Number, default: 0 },
      difensore: { type: Number, default: 0 },
      maratoneta: { type: Number, default: 0 },
      gol_bello: { type: Number, default: 0 }
    }
  },

  // === METADATI CALCOLO ===
  calculationMethod: {
    type: String,
    enum: ['average', 'median', 'weighted_average', 'trimmed_mean'],
    default: 'average'
  },

  calculationParameters: {
    excludeOutliers: { type: Boolean, default: false },
    minimumVotesRequired: { type: Number, default: 1 }
  },

  dataVersion: {
    type: Number,
    default: 1
  },

  recalculatedAt: { type: Date }

}, {
  timestamps: true,

  index: [
    { votingSessionId: 1 },
    { 'sessionMetadata.sessionType': 1, createdAt: -1 },
    { 'statistics.overallAverageRating': -1 }
  ]
});

// === METODI VIRTUALI ===

VoteResultSchema.virtual('bestPlayer').get(function () {
  if (!this.matchRatingResults || this.matchRatingResults.size === 0) return null;

  let bestPlayer = null;
  let bestRating = 0;

  for (const [playerId, playerData] of this.matchRatingResults.entries()) {
    if (playerData.averageRating > bestRating) {
      bestRating = playerData.averageRating;
      bestPlayer = { playerId, ...playerData };
    }
  }

  return bestPlayer;
});

VoteResultSchema.virtual('isHighQualityMatch').get(function () {
  return this.statistics.overallAverageRating >= 7.0 &&
    this.sessionMetadata.completionRate >= 80;
});

// === METODI STATICI ===

/**
 * Crea risultato match rating da dati aggregati
 */
VoteResultSchema.statics.createMatchRatingResult = function (sessionId, playerResults, totalVoters) {
  const matchRatingMap = new Map();
  let totalGoals = 0;
  let totalAssists = 0;
  let totalRating = 0;
  let playerCount = 0;
  const badgesSummary = {
    mvp: 0, goleador: 0, assist_man: 0,
    difensore: 0, maratoneta: 0, gol_bello: 0
  };

  // Distribuzione generale
  const ratingDistribution = {
    '9-10': 0, '8-9': 0, '7-8': 0,
    '6-7': 0, '5-6': 0, 'below-5': 0
  };

  Object.entries(playerResults).forEach(([playerId, playerData]) => {
    matchRatingMap.set(playerId, {
      playerId: playerId,
      averageRating: playerData.averageRating,
      medianRating: playerData.medianRating || playerData.averageRating,
      goals: playerData.goals || 0,
      assists: playerData.assists || 0,
      voteCount: playerData.voteCount,
      badges: playerData.badges || [],
      grade: this.calculateGrade(playerData.averageRating),
      standardDeviation: playerData.standardDeviation || 0,
      confidence: playerData.confidence || 0
    });

    // Aggrega statistiche
    totalGoals += playerData.goals || 0;
    totalAssists += playerData.assists || 0;
    totalRating += playerData.averageRating;
    playerCount++;

    // Conta badges
    (playerData.badges || []).forEach(badge => {
      if (badgesSummary[badge] !== undefined) {
        badgesSummary[badge]++;
      }
    });

    // Distribuzione rating
    const rating = playerData.averageRating;
    if (rating >= 9) ratingDistribution['9-10']++;
    else if (rating >= 8) ratingDistribution['8-9']++;
    else if (rating >= 7) ratingDistribution['7-8']++;
    else if (rating >= 6) ratingDistribution['6-7']++;
    else if (rating >= 5) ratingDistribution['5-6']++;
    else ratingDistribution['below-5']++;
  });

  const overallAverage = playerCount > 0 ? totalRating / playerCount : 0;

  return new this({
    votingSessionId: sessionId,
    matchRatingResults: matchRatingMap,

    sessionMetadata: {
      totalVoters,
      sessionType: 'match_rating',
      calculatedAt: new Date(),
      playersCount: playerCount,
      completionRate: 100
    },

    statistics: {
      voteCount: totalVoters,
      overallAverageRating: Math.round(overallAverage * 10) / 10,
      totalGoalsReported: totalGoals,
      totalAssistsReported: totalAssists,
      ratingDistribution,
      badgesSummary
    },

    calculationMethod: 'average'
  });
};

/**
 * Legge risultati match rating in formato compatibile
 */
VoteResultSchema.methods.getMatchRatingResults = function () {
  if (!this.matchRatingResults || this.sessionMetadata.sessionType !== 'match_rating') {
    return null;
  }

  const playerResults = {};

  for (const [playerId, playerData] of this.matchRatingResults.entries()) {
    playerResults[playerId] = {
      playerId: playerData.playerId,
      averageRating: playerData.averageRating,
      medianRating: playerData.medianRating,
      goals: playerData.goals,
      assists: playerData.assists,
      voteCount: playerData.voteCount,
      badges: playerData.badges,
      grade: playerData.grade
    };
  }

  return {
    playerResults,
    totalVoters: this.sessionMetadata.totalVoters,
    sessionId: this.votingSessionId,
    calculatedAt: this.sessionMetadata.calculatedAt,
    overallStats: {
      averageRating: this.statistics.overallAverageRating,
      totalGoals: this.statistics.totalGoalsReported,
      totalAssists: this.statistics.totalAssistsReported,
      badgesSummary: this.statistics.badgesSummary
    }
  };
};

/**
 * Calcola grade da rating numerico
 */
VoteResultSchema.statics.calculateGrade = function (rating) {
  if (rating >= 9.5) return 'A+';
  if (rating >= 9.0) return 'A';
  if (rating >= 8.5) return 'B+';
  if (rating >= 8.0) return 'B';
  if (rating >= 7.0) return 'C+';
  if (rating >= 6.0) return 'C';
  if (rating >= 5.0) return 'D';
  return 'F';
};

/**
 * Trova risultati per una partita specifica
 */
VoteResultSchema.statics.findBySession = function (sessionId) {
  return this.findOne({
    votingSessionId: sessionId,
    'sessionMetadata.sessionType': 'match_rating'
  });
};

/**
 * Top performers di una partita
 */
VoteResultSchema.methods.getTopPerformers = function (limit = 3) {
  if (!this.matchRatingResults) return [];

  const players = [];
  for (const [playerId, playerData] of this.matchRatingResults.entries()) {
    players.push({
      playerId,
      averageRating: playerData.averageRating,
      badges: playerData.badges,
      grade: playerData.grade
    });
  }

  return players
    .sort((a, b) => b.averageRating - a.averageRating)
    .slice(0, limit);
};

/**
 * Statistiche complete della partita
 */
VoteResultSchema.methods.getMatchSummary = function () {
  return {
    totalPlayers: this.sessionMetadata.playersCount,
    totalVoters: this.sessionMetadata.totalVoters,
    overallRating: this.statistics.overallAverageRating,
    totalGoals: this.statistics.totalGoalsReported,
    totalAssists: this.statistics.totalAssistsReported,
    badges: this.statistics.badgesSummary,
    topPerformers: this.getTopPerformers(3),
    calculatedAt: this.sessionMetadata.calculatedAt
  };
};

// === POST-SAVE HOOK ===
// ⭐ AGGIORNA AUTOMATICAMENTE LE STATISTICHE LEADERBOARD
VoteResultSchema.post('save', async function (doc) {
  try {
    console.log('🎯 VoteResult salvato - aggiornamento leaderboard automatico');

    // Import PlayerLeaderboardStats (deve essere fatto qui per evitare circular dependencies)
    const PlayerLeaderboardStats = mongoose.model('PlayerLeaderboardStats');
    const VotingSession = mongoose.model('VotingSession');
    const User = mongoose.model('User');

    // 🔧 RECUPERA DATI MANCANTI tramite populate
    const session = await VotingSession.findById(doc.votingSessionId).populate('teamId');

    if (!session) {
      console.error('❌ VotingSession non trovata per leaderboard update');
      return;
    }

    // Aggiorna statistiche per ogni giocatore della partita
    if (doc.matchRatingResults && doc.matchRatingResults.size > 0) {

      // Recupera tutti i nomi giocatori in una volta
      const playerIds = Array.from(doc.matchRatingResults.keys());
      const players = await User.find({ _id: { $in: playerIds } }).select('_id name');
      const playerNamesMap = new Map(players.map(p => [p._id.toString(), p.name]));

      for (const [playerId, playerData] of doc.matchRatingResults.entries()) {

        const playerName = playerNamesMap.get(playerId);
        if (!playerName) {
          console.error(`❌ Nome giocatore non trovato per ${playerId}`);
          continue;
        }

        const updateData = {
          teamId: session.teamId._id,
          playerName: playerName,
          rating: {
            totalMatches: 1,
            totalRating: playerData.averageRating,
            bestRating: playerData.averageRating,
            worstRating: playerData.averageRating
          },
          goals: {
            totalMatches: playerData.goals > 0 ? 1 : 0,
            totalGoals: playerData.goals || 0,
            bestMatch: playerData.goals || 0
          },
          assists: {
            totalMatches: playerData.assists > 0 ? 1 : 0,
            totalAssists: playerData.assists || 0,
            bestMatch: playerData.assists || 0
          },
          form: {
            recentMatches: [playerData.averageRating],
            currentStreak: playerData.averageRating >= 7 ? 1 : 0,
            streakType: playerData.averageRating >= 7 ? 'positive' : 'negative'
          },
          achievements: {
            totalBadges: playerData.badges ? playerData.badges.length : 0
          }
        };

        await PlayerLeaderboardStats.updateStats(playerId, updateData);
        console.log(`📊 Aggiornate statistiche leaderboard per giocatore ${playerId}`);
      }
    }

  } catch (error) {
    console.error('❌ Errore aggiornamento leaderboard da VoteResult:', error);
  }
});

// === PRE-DELETE HOOK ===
// ⭐ RICALCOLA AUTOMATICAMENTE LE STATISTICHE LEADERBOARD PRIMA DELL'ELIMINAZIONE
VoteResultSchema.pre('deleteMany', async function () {
  try {
    console.log('🗑️ VoteResult eliminazione - ricalcolo leaderboard automatico');

    // Import modelli necessari
    const PlayerLeaderboardStats = mongoose.model('PlayerLeaderboardStats');
    const VotingSession = mongoose.model('VotingSession');

    // Trova tutti i VoteResult che stanno per essere eliminati
    const voteResultsToDelete = await this.model.find(this.getFilter());

    if (!voteResultsToDelete || voteResultsToDelete.length === 0) {
      console.log('💭 Nessun VoteResult da eliminare');
      return;
    }

    console.log(`📋 Trovati ${voteResultsToDelete.length} VoteResult da eliminare - ricalcolo stats necessario`);

    // Raccoglie tutti i giocatori e team coinvolti
    const affectedPlayers = new Set();
    const affectedTeams = new Set();

    for (const voteResult of voteResultsToDelete) {
      // Popola la sessione per ottenere il teamId
      await voteResult.populate('votingSessionId');

      if (voteResult.votingSessionId && voteResult.votingSessionId.teamId) {
        affectedTeams.add(voteResult.votingSessionId.teamId.toString());
      }

      // Raccoglie tutti i player ID dal matchRatingResults
      if (voteResult.matchRatingResults) {
        for (const [playerId, playerData] of voteResult.matchRatingResults.entries()) {
          affectedPlayers.add(playerId.toString());
        }
      }
    }

    console.log(`👥 Giocatori da ricalcolare: ${affectedPlayers.size}, Team: ${affectedTeams.size}`);

    // Ricalcola le statistiche per ogni giocatore coinvolto
    for (const playerId of affectedPlayers) {
      try {
        // Trova tutte le stats esistenti per questo giocatore (che non verranno eliminate)
        const remainingVoteResults = await this.model.find({
          _id: { $nin: voteResultsToDelete.map(vr => vr._id) },
          'matchRatingResults': { $exists: true }
        }).populate('votingSessionId');

        // Filtra solo i VoteResult che contengono questo giocatore
        const playerVoteResults = remainingVoteResults.filter(vr =>
          vr.matchRatingResults && vr.matchRatingResults.has(playerId) &&
          vr.votingSessionId && vr.votingSessionId.teamId
        );

        // Ricalcola statistiche da zero basandosi sui dati rimanenti
        let totalMatches = playerVoteResults.length;
        let totalGoals = 0;
        let totalAssists = 0;
        let totalRating = 0;
        let recentMatches = [];

        for (const vr of playerVoteResults) {
          const playerData = vr.matchRatingResults.get(playerId);
          if (playerData) {
            totalGoals += playerData.goals || 0;
            totalAssists += playerData.assists || 0;
            totalRating += playerData.averageRating || 0;
            recentMatches.push(playerData.averageRating || 0);
          }
        }

        const averageRating = totalMatches > 0 ? (totalRating / totalMatches) : 0;

        // Aggiorna le statistiche con i nuovi valori ricalcolati
        await PlayerLeaderboardStats.updateOne(
          { playerId: playerId },
          {
            $set: {
              totalMatches: totalMatches,
              totalGoals: totalGoals,
              totalAssists: totalAssists,
              averageRating: averageRating,
              lastUpdatedAt: new Date()
            }
          }
        );

        console.log(`📊 Ricalcolate statistiche per giocatore ${playerId}: ${totalMatches} partite, ${totalGoals} gol, ${totalAssists} assist`);

      } catch (playerError) {
        console.error(`❌ Errore ricalcolo stats giocatore ${playerId}:`, playerError.message);
      }
    }

    console.log(`✅ Ricalcolo leaderboard completato per ${affectedPlayers.size} giocatori`);

  } catch (error) {
    console.error('❌ Errore ricalcolo leaderboard pre-delete:', error);
  }
});

module.exports = mongoose.model('VoteResult', VoteResultSchema);