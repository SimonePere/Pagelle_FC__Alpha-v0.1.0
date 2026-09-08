const mongoose = require('mongoose');

// SCHEMA PULITO - Rimosso tutto il vecchio sistema di voting
const matchSchema = new mongoose.Schema({
  // === INFORMAZIONI BASE MATCH ===
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  teamId: {
    type: String, // Mantenuto come string per compatibilità frontend
    required: true,
    trim: true
  },
  date: {
    type: String, // Mantenuto come string per compatibilità frontend  
    required: true
  },
  field: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Field name too long']
  },
  playersCount: {
    type: Number,
    required: true,
    enum: [5, 8, 11],
    default: 8
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes too long']
  },

  // === PARTECIPANTI ===
  teamMemberIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // === STATO MATCH ===
  status: {
    type: String,
    enum: [
      'draft',      // Match creato ma non ancora pubblicato
      'active',     // Match attivo, in corso di votazione
      'completed',  // Match completato con tutti i risultati
      'cancelled'   // Match cancellato
    ],
    default: 'draft'
  },

  // === STAGIONE (denormalizzato, Fase 2) ===
  // Calcolato a write-time da SeasonService.resolveSeasonId(date). Optional finché
  // il backfill non ha taggato tutto lo storico (poi diventerà required in fase contract).
  seasonId: {
    type: String,
    index: true,
    default: null
  },

  // === RISULTATI FINALI (calcolati dai VotingSession) ===
  finalResults: {
    // Questi campi verranno popolati dai risultati delle VotingSession
    averageRatings: {
      type: Map,
      of: Number // userId -> average rating
    },
    mvpPlayer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    teamGoals: {
      type: Number,
      default: 0
    },
    opponentGoals: {
      type: Number,
      default: 0
    }
  },

  // === MODALITÀ DEMO ===
  // Partita appartenente alla squadra dimostrativa pubblica.
  // ⚠️ Nota: qui `teamId` è String (non ObjectId come altrove), quindi il seed
  //    deve scriverlo con String(demoTeamId) o il filtro non matcha in silenzio.
  // Vedi Team.isDemo e DEMO_MODE_IMPLEMENTATION_PLAN.md §3.9 e §3.10
  isDemo: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function (doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// === METODI DI ISTANZA ===
// Metodo per verificare se il match può essere votato
matchSchema.methods.canBeVoted = function () {
  return this.status === 'active';
};

// Metodo per completare il match
matchSchema.methods.complete = function () {
  this.status = 'completed';
  return this;
};

// === VIRTUAL FIELDS ===
// Virtual per verificare se il match è in corso
matchSchema.virtual('isActive').get(function () {
  return this.status === 'active';
});

// Virtual per verificare se il match è completato
matchSchema.virtual('isCompleted').get(function () {
  return this.status === 'completed';
});

// === INDEXING ===
matchSchema.index({ teamId: 1, date: -1 });
matchSchema.index({ teamId: 1, seasonId: 1, date: -1 });   // query season-aware
matchSchema.index({ status: 1 });
matchSchema.index({ createdBy: 1 });
matchSchema.index({ teamMemberIds: 1 });

module.exports = mongoose.model('Match', matchSchema);