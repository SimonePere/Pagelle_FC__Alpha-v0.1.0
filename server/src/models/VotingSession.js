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

  // === STAGIONE (denormalizzato, Fase 2) ===
  // Propagato dal Match collegato a write-time. Optional finché il backfill non completa.
  seasonId: {
    type: String,
    index: true,
    default: null
  },



  // === CONFIGURAZIONE PARTECIPANTI ===

  eligibleVoters: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],

  // === ASTENSIONE PARTECIPANTI ===
  // Lista degli utenti che NON parteciperanno al voto.
  // Vengono esclusi sia dal denominatore della participationRate
  // sia dal calcolo delle medie (vedi updateSummary + VotingService.aggregatePlayerStats).
  abstainedUsers: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    // Chi ha marcato l'utente come astenuto.
    // - Se astensione manuale (admin / user stesso): contiene l'ObjectId user.
    // - Se astensione automatica via cron alla scadenza deadline: è `null`
    //   (il sistema non è un user, e mettere un sentinel ObjectId fittizio
    //    rompeva i populate). Il "chi" effettivo è distinguibile dal campo `reason`.
    abstainedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      default: null
    },
    abstainedAt: {
      type: Date,
      default: Date.now
    },
    // Motivo dell'astensione — utile per audit e UI:
    //   'voluntary'         → l'utente stesso si è astenuto
    //   'admin_marked'      → un admin ha astenuto l'utente manualmente
    //   'deadline_expired'  → il sistema ha astenuto l'utente perché
    //                         non aveva votato entro la deadline (cron / force-close)
    // Default 'admin_marked' per retro-compatibilità con i record già esistenti
    // (prima dell'introduzione del campo): erano tutti astensioni decise da un admin.
    reason: {
      type: String,
      enum: ['voluntary', 'admin_marked', 'deadline_expired'],
      default: 'admin_marked'
    }
  }],

  requiredVotes: {
    type: Number,
    // ✅ RIMUOVI il default - lascia che sia impostato esplicitamente
    // dal MatchService che conosce gli astenuti
    min: 1
  },

  allowSelfVoting: {
    type: Boolean,
    default: false

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

  // Traccia COME la sessione è stata completata
  completionType: {
    type: String,
    enum: ['manual', 'automatic', 'automatic_deadline'],
    // manual              → completata manualmente da un admin
    //                       (endpoint POST /:id/complete oppure il nuovo force-close)
    // automatic           → completata automaticamente quando TUTTI gli aventi diritto
    //                       hanno votato (auto-completion in checkAutoCompletion)
    // automatic_deadline  → completata automaticamente perché è scaduta la deadline:
    //                       i pending sono stati astenuti d'ufficio (reason='deadline_expired')
    //                       e poi la sessione è stata chiusa con i voti raccolti.
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
      step: { type: Number, default: 0.25 }
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
  },

  // === MODALITÀ DEMO ===
  // Sessione di voto della squadra dimostrativa pubblica.
  // ⚠️ La sessione demo aperta nasce con `deadline: null` ed è esclusa dal cron
  //    closeExpiredVotingSessions, altrimenti verrebbe chiusa d'ufficio e la
  //    demo perderebbe la sua funzione principale.
  // Vedi Team.isDemo e DEMO_MODE_IMPLEMENTATION_PLAN.md §3.2 e §3.9
  isDemo: {
    type: Boolean,
    default: false,
    index: true
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

// Indice season-aware
VotingSessionSchema.index({ teamId: 1, seasonId: 1, status: 1 });

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



// === METODI ASTENSIONE ===


// Verifica se un utente è astenuto
VotingSessionSchema.methods.isUserAbstained = function (userId) {
  return this.abstainedUsers.some(abs => abs.userId.equals(userId));
};

// Conta gli eligible voters reali (esclusi gli astenuti)
VotingSessionSchema.virtual('realEligibleVotersCount').get(function () {
  return this.eligibleVoters.length;
});

// Riattiva un utente astenuto
VotingSessionSchema.methods.reactivateUser = function (userId, reactivatedBy) {
  this.abstainedUsers = this.abstainedUsers.filter(abs => !abs.userId.equals(userId));
  if (!this.eligibleVoters.includes(userId)) {
    this.eligibleVoters.push(userId);
  }
};

// Astieni un utente
//
// Parametri:
//   userId       → l'utente da astenere (rimosso da eligibleVoters, aggiunto ad abstainedUsers)
//   abstainedBy  → ObjectId dell'utente che esegue l'azione, oppure `null`
//                  quando l'astensione è generata dal sistema (cron deadline)
//   reason       → motivo: 'voluntary' | 'admin_marked' | 'deadline_expired'
//                  Default 'admin_marked' (comportamento storico).
//
// Idempotente: se l'utente è già astenuto, non duplica la voce.
VotingSessionSchema.methods.abstainUser = function (userId, abstainedBy, reason = 'admin_marked') {
  // Rimuovi da eligible voters se presente
  this.eligibleVoters = this.eligibleVoters.filter(id => !id.equals(userId));

  // Aggiungi agli astenuti se non già presente
  if (!this.isUserAbstained(userId)) {
    this.abstainedUsers.push({
      userId: userId,
      abstainedBy: abstainedBy || null,
      abstainedAt: new Date(),
      reason: reason
    });
  }
};










// === METODI ISTANZA ===

VotingSessionSchema.methods.canUserVote = function (userId) {
  if (!this.eligibleVoters.includes(userId)) return false;
  if (this.isUserAbstained(userId)) return false;
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

  // ⚠️ IMPORTANTE: confronto SEMPRE via .toString() perché Array.includes()
  //    su Mongoose ObjectId compara per identità di riferimento, NON per valore.
  //    Senza toString(), pendingVoters conterrebbe TUTTI gli activeVoters anche
  //    se hanno già votato → bug grave nel force-close che li marcherebbe astenuti.
  const submittedVoterIds = submissions.map(s => s.voterId.toString());

  // Calcola gli utenti attivi (elegibili - astenuti)
  const abstainedUserIds = this.abstainedUsers.map(u => u.userId.toString());
  const activeVoters = this.eligibleVoters.filter(
    voter => !abstainedUserIds.includes(voter.toString())
  );

  const pendingVoters = activeVoters.filter(
    voter => !submittedVoterIds.includes(voter.toString())
  );

  const avgTime = submissions.length > 0
    ? submissions.reduce((sum, s) => sum + (s.timeSpent || 0), 0) / submissions.length
    : 0;

  // UPDATE CON CONSIDERAZIONE DEGLI ASTENUTI:
  // ⚠️ Edge case: activeVoters.length === 0 (tutti gli eligible sono stati astenuti,
  // tipicamente dal cron close-expired). Evitiamo divisione per zero che produce NaN
  // e fa fallire la validation Mongoose su summary.participationRate.
  const participationRate = activeVoters.length > 0
    ? Math.round((submissions.length / activeVoters.length) * 100)
    : 0;

  this.summary = {
    totalSubmissions: submissions.length,
    pendingVoters,
    participationRate,
    averageTimeToVote: Math.round(avgTime),
    lastActivity: submissions.length > 0 ? submissions[submissions.length - 1].submittedAt : this.createdAt
  };

  // Auto-completion basata su votanti attivi (esclusi gli astenuti)
  // ⚠️ activeVoters.length > 0 evita di auto-completare con 0/0 quando tutti
  // sono stati astenuti d'ufficio: in quel caso la chiusura la decide
  // closeWithAbstainedPending (cancelled vs completed in base alle submissions).
  if (activeVoters.length > 0 && submissions.length >= activeVoters.length && this.status === 'active') {
    this.status = 'completed';
    this.completedAt = new Date();
    this.completionType = 'automatic';
    console.log(`🎯 Sessione completata automaticamente: ${submissions.length}/${activeVoters.length} voti ricevuti`);
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
      ratingRange: { min: 1, max: 10, step: 0.25 },
      allowBadges: true,
      requiredFields: ['rating'],
      allowComments: true
    },
    createdBy: match.createdBy,
    status: 'active'
  });
};

module.exports = mongoose.model('VotingSession', VotingSessionSchema);