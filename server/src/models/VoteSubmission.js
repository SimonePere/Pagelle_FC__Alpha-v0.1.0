// models/VoteSubmission.js
const mongoose = require('mongoose');

/**
 * VOTE SUBMISSION MODEL
 * 
 * Rappresenta il voto individuale di un singolo utente in una VotingSession di tipo MATCH_RATING.
 * Questo è dove vengono memorizzati i dati effettivi del voto per le prestazioni di partita.
 * 
 * RESPONSABILITÀ:
 * - Memorizzare i DATI del voto (rating, gol, assist per ogni giocatore)
 * - Tracciare METADATA (tempo impiegato, IP, device)
 * - Gestire VERSIONING (per permettere modifiche ai voti)
 * - Fornire AUDIT TRAIL per trasparenza
 */

const VoteSubmissionSchema = new mongoose.Schema({
  // === RIFERIMENTI ===

  votingSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VotingSession',
    required: true,
    index: true
  },

  voterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // === DATI DEL VOTO (Solo Match Rating) ===

  voteData: {
    // Voti per ogni giocatore della partita
    playerRatings: [{
      playerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      rating: {
        type: Number,
        min: 1,
        max: 10,
        required: true
      },
      goals: {
        type: Number,
        default: 0,
        min: 0
      },
      assists: {
        type: Number,
        default: 0,
        min: 0
      },
      comment: {
        type: String,
        maxlength: 500
      }
    }],

    // Badge speciali assegnabili ai giocatori
    badges: [{
      playerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      badgeType: {
        type: String,
        enum: ['mvp', 'goleador', 'assist_man', 'difensore', 'maratoneta', 'gol_bello'],
        required: true
      }
    }],

    // Commento generale sulla partita
    overallComment: {
      type: String,
      maxlength: 1000
    }
  },

  // === TRACKING E METADATA ===

  timeSpent: {
    type: Number,
    default: 0,
    min: 0
    // Secondi impiegati dall'apertura form al submit
  },

  ipAddress: {
    type: String
  },

  userAgent: {
    type: String
  },

  deviceInfo: {
    isMobile: { type: Boolean, default: false },
    platform: { type: String },
    screenResolution: { type: String },
    browserLanguage: { type: String, default: 'it' }
  },

  // === VERSIONING E MODIFICHE ===

  version: {
    type: Number,
    default: 1,
    min: 1
  },

  isActive: {
    type: Boolean,
    default: true,
    index: true
  },

  supersededBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VoteSubmission'
  },

  modificationReason: {
    type: String,
    maxlength: 500
  },

  // === VALIDAZIONE E INTEGRITÀ ===

  submissionHash: {
    type: String
  },

  validated: {
    type: Boolean,
    default: false
  },

  validationErrors: [{
    field: String,
    message: String
  }],

  // === MODALITÀ DEMO ===
  // Voto appartenente alla squadra dimostrativa pubblica.
  // Questa collection non ha teamId: senza questo flag andrebbe ripulita
  // risalendo agli id delle sessioni demo.
  // Vedi Team.isDemo e DEMO_MODE_IMPLEMENTATION_PLAN.md §3.9
  isDemo: {
    type: Boolean,
    default: false,
    index: true
  }

}, {
  timestamps: true,

  index: [
    { votingSessionId: 1, voterId: 1 },
    { voterId: 1, createdAt: -1 },
    { isActive: 1, version: -1 },
    { 'voteData.playerRatings.playerId': 1 }
  ]
});

// === INDICI UNICI ===
VoteSubmissionSchema.index(
  { votingSessionId: 1, voterId: 1, isActive: 1 },
  {
    unique: true,
    partialFilterExpression: { isActive: true }
  }
);

// === METODI VIRTUALI ===

VoteSubmissionSchema.virtual('hasBeenModified').get(function () {
  return this.version > 1;
});

VoteSubmissionSchema.virtual('submissionAge').get(function () {
  return Date.now() - this.createdAt.getTime();
});

// === METODI ISTANZA ===

/**
 * Crea una nuova versione di questo voto (per modifiche)
 */
VoteSubmissionSchema.methods.createNewVersion = async function (newVoteData, reason) {
  this.isActive = false;
  await this.save();

  const newSubmission = new this.constructor({
    votingSessionId: this.votingSessionId,
    voterId: this.voterId,
    voteData: newVoteData,
    timeSpent: this.timeSpent,
    version: this.version + 1,
    modificationReason: reason,
    ipAddress: this.ipAddress,
    userAgent: this.userAgent,
    deviceInfo: this.deviceInfo
  });

  this.supersededBy = newSubmission._id;
  await this.save();

  await newSubmission.save();
  return newSubmission;
};

/**
 * Calcola hash dei dati per integrità
 */
VoteSubmissionSchema.methods.calculateHash = function () {
  const crypto = require('crypto');
  const dataString = JSON.stringify(this.voteData) + this.voterId + this.votingSessionId;
  return crypto.createHash('sha256').update(dataString).digest('hex');
};

/**
 * Valida i dati del voto contro la configurazione della session
 */
VoteSubmissionSchema.methods.validateAgainstSession = async function () {
  const VotingSession = mongoose.model('VotingSession');
  const session = await VotingSession.findById(this.votingSessionId);

  if (!session) throw new Error('VotingSession not found');
  if (session.type !== 'match_rating') throw new Error('Invalid session type for VoteSubmission');

  const errors = [];
  const { min, max } = session.voteConfig.ratingRange;

  this.voteData.playerRatings?.forEach((rating, index) => {
    if (rating.rating < min || rating.rating > max) {
      errors.push({
        field: `playerRatings[${index}].rating`,
        message: `Rating must be between ${min} and ${max}`
      });
    }

    if (rating.goals < 0) {
      errors.push({
        field: `playerRatings[${index}].goals`,
        message: 'Goals cannot be negative'
      });
    }

    if (rating.assists < 0) {
      errors.push({
        field: `playerRatings[${index}].assists`,
        message: 'Assists cannot be negative'
      });
    }
  });

  this.validationErrors = errors;
  this.validated = errors.length === 0;

  return this.validated;
};

// === METODI STATICI ===

/**
 * Trova l'ultimo voto attivo di un utente per una sessione
 */
VoteSubmissionSchema.statics.findActiveByUserAndSession = function (userId, sessionId) {
  return this.findOne({
    voterId: userId,
    votingSessionId: sessionId,
    isActive: true
  });
};

/**
 * Statistiche per una sessione di votazione
 */
VoteSubmissionSchema.statics.getSessionStats = async function (sessionId) {
  const submissions = await this.find({
    votingSessionId: sessionId,
    isActive: true
  });

  if (submissions.length === 0) return null;

  const stats = {
    totalVotes: submissions.length,
    averageTime: submissions.reduce((sum, s) => sum + s.timeSpent, 0) / submissions.length,
    deviceBreakdown: {
      mobile: submissions.filter(s => s.deviceInfo.isMobile).length,
      desktop: submissions.filter(s => !s.deviceInfo.isMobile).length
    },
    modificationRate: submissions.filter(s => s.hasBeenModified).length / submissions.length,
    averageRating: this.calculateAverageRating(submissions),
    totalGoals: this.calculateTotalGoals(submissions),
    totalAssists: this.calculateTotalAssists(submissions)
  };

  return stats;
};

/**
 * Calcola rating medio di tutte le submissions
 */
VoteSubmissionSchema.statics.calculateAverageRating = function (submissions) {
  let totalRatings = 0;
  let ratingCount = 0;

  submissions.forEach(submission => {
    submission.voteData.playerRatings?.forEach(rating => {
      totalRatings += rating.rating;
      ratingCount++;
    });
  });

  return ratingCount > 0 ? totalRatings / ratingCount : 0;
};

/**
 * Calcola totale gol segnalati
 */
VoteSubmissionSchema.statics.calculateTotalGoals = function (submissions) {
  let totalGoals = 0;

  submissions.forEach(submission => {
    submission.voteData.playerRatings?.forEach(rating => {
      totalGoals += rating.goals || 0;
    });
  });

  return totalGoals;
};

/**
 * Calcola totale assist segnalati
 */
VoteSubmissionSchema.statics.calculateTotalAssists = function (submissions) {
  let totalAssists = 0;

  submissions.forEach(submission => {
    submission.voteData.playerRatings?.forEach(rating => {
      totalAssists += rating.assists || 0;
    });
  });

  return totalAssists;
};

module.exports = mongoose.model('VoteSubmission', VoteSubmissionSchema);