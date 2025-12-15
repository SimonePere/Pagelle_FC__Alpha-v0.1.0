// models/VotingSession.js
const mongoose = require('mongoose');

/**
 * VOTING SESSION MODEL
 * 
 * Questo è il documento master che coordina tutto il processo di votazione.
 * Pensa a VotingSession come al "contenitore" di una votazione specifica.
 * 
 * RESPONSABILITÀ:
 * - Definire CHI può votare (eligibleVoters)
 * - Definire COSA si sta votando (type, targetId)
 * - Gestire lo STATO della votazione (draft/active/completed)
 * - Configurare le REGOLE (quorum, deadline, configurazioni specifiche)
 * - Tracciare il PROGRESSO (summary con statistiche real-time)
 */

const VotingSessionSchema = new mongoose.Schema({
  // === IDENTIFICAZIONE ===

  type: {
    type: String,
    enum: [
      'match_rating',        // Voto prestazioni partita
      'player_card_rating'   // Valutazione skill giocatore (separata)
    ],
    required: true,
    index: true
  },

  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
    // Per match_rating: riferimento a Match
    // Per player_card_rating: riferimento a User (target player)
  },

  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true,
    index: true
  },

  // === METADATI DESCRITTIVI ===

  title: {
    type: String,
    required: true,
    maxlength: 200,
    // Esempi: "Vota partita vs Juventus", "Valuta Mario Rossi"
  },

  description: {
    type: String,
    maxlength: 1000,
  },

  // === CONFIGURAZIONE PARTECIPANTI ===

  eligibleVoters: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],

  requiredVotes: {
    type: Number,
    default: function () {
      return this.eligibleVoters.length;
    },
    min: 1
  },

  allowSelfVoting: {
    type: Boolean,
    default: false
    // Sempre false per match_rating, può essere true per player_card
  },

  // === GESTIONE TEMPORALE ===

  startedAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  deadline: {
    type: Date,
    index: true
  },

  completedAt: {
    type: Date,
    index: true
  },

  // Traccia HOW la sessione è stata completata
  completionType: {
    type: String,
    enum: ['manual', 'automatic'],
    // manual: completata manualmente da utente
    // automatic: completata automaticamente quando tutti hanno votato
  },

  // === STATO E CONTROLLO ===

  status: {
    type: String,
    enum: ['draft', 'active', 'completed', 'cancelled', 'expired'],
    default: 'draft',
    required: true,
    index: true
  },

  // === CONFIGURAZIONE SPECIFICA PER TIPO ===

  voteConfig: {
    // PER MATCH_RATING:
    ratingRange: {
      min: { type: Number, default: 1 },
      max: { type: Number, default: 10 },
      step: { type: Number, default: 0.5 }
    },
    allowBadges: { type: Boolean, default: true },
    requiredFields: [{ type: String }], // ["rating", "goals", "assists"]

    // PER PLAYER_CARD_RATING (configurazione futura):
    attributesToRate: [{ type: String }], // ["tir", "pas", "dri", "fin", "vis", "res", "for"]
    attributeRange: {
      min: { type: Number, default: 10 },
      max: { type: Number, default: 100 }
    },

    // CONFIGURAZIONI COMUNI:
    allowComments: { type: Boolean, default: true },
    allowVoteModification: { type: Boolean, default: true },
    anonymousVoting: { type: Boolean, default: false }
  },

  // === METADATI E TRACKING ===

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  version: {
    type: Number,
    default: 1
  },

  // === RIASSUNTO REAL-TIME ===

  summary: {
    totalSubmissions: { type: Number, default: 0 },
    pendingVoters: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    participationRate: { type: Number, default: 0 },
    averageTimeToVote: { type: Number, default: 0 },
    lastActivity: { type: Date }
  }

}, {
  timestamps: true,

  index: [
    { teamId: 1, status: 1, createdAt: -1 },
    { type: 1, targetId: 1 },
    { 'eligibleVoters': 1, status: 1 },
    { deadline: 1, status: 1 }
  ]
});

// === METODI VIRTUALI ===

VotingSessionSchema.virtual('isActive').get(function () {
  return this.status === 'active' &&
    (!this.deadline || new Date() < this.deadline);
});

VotingSessionSchema.virtual('isExpired').get(function () {
  return this.deadline && new Date() > this.deadline && this.status === 'active';
});

VotingSessionSchema.virtual('progressPercentage').get(function () {
  if (this.requiredVotes === 0) return 100;
  return Math.round((this.summary.totalSubmissions / this.requiredVotes) * 100);
});

// === METODI ISTANZA ===

VotingSessionSchema.methods.canUserVote = function (userId) {
  if (!this.eligibleVoters.includes(userId)) return false;
  if (!this.isActive) return false;
  if (this.isExpired) return false;

  return true;
};

VotingSessionSchema.methods.updateSummary = async function () {
  const VoteSubmission = mongoose.model('VoteSubmission');

  const submissions = await VoteSubmission.find({
    votingSessionId: this._id,
    isActive: true
  });

  const submittedVoters = submissions.map(s => s.voterId);
  const pendingVoters = this.eligibleVoters.filter(
    voter => !submittedVoters.includes(voter)
  );

  const avgTime = submissions.length > 0
    ? submissions.reduce((sum, s) => sum + (s.timeSpent || 0), 0) / submissions.length
    : 0;

  this.summary = {
    totalSubmissions: submissions.length,
    pendingVoters,
    participationRate: Math.round((submissions.length / this.eligibleVoters.length) * 100),
    averageTimeToVote: Math.round(avgTime),
    lastActivity: submissions.length > 0 ? submissions[submissions.length - 1].submittedAt : this.createdAt
  };

  if (submissions.length >= this.requiredVotes && this.status === 'active') {
    this.status = 'completed';
    this.completedAt = new Date();
  }

  await this.save();
};

// === METODI STATICI ===

VotingSessionSchema.statics.findActiveForUser = function (userId) {
  return this.find({
    eligibleVoters: userId,
    status: 'active',
    $or: [
      { deadline: { $exists: false } },
      { deadline: { $gte: new Date() } }
    ]
  }).populate('targetId');
};

VotingSessionSchema.statics.createForMatch = async function (matchId, teamId, eligibleVoters) {
  const Match = mongoose.model('Match');
  const match = await Match.findById(matchId);

  if (!match) throw new Error('Match not found');

  return this.create({
    type: 'match_rating',
    targetId: matchId,
    teamId,
    title: `Vota la partita vs ${match.opponent}`,
    description: `Valuta le prestazioni dei tuoi compagni nella partita del ${match.date.toLocaleDateString('it-IT')}`,
    eligibleVoters,
    voteConfig: {
      ratingRange: { min: 1, max: 10, step: 0.5 },
      allowBadges: true,
      requiredFields: ['rating'],
      allowComments: true
    },
    createdBy: match.createdBy,
    status: 'active'
  });
};

module.exports = mongoose.model('VotingSession', VotingSessionSchema);