const mongoose = require('mongoose');

// MatchNotification Schema - per future notifiche
const matchNotificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  matchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
    required: true
  },
  type: {
    type: String,
    enum: ['voting_open', 'voting_reminder'],
    required: true
  },
  read: {
    type: Boolean,
    default: false
  },

  // === MODALITÀ DEMO ===
  // Notifica di una partita della squadra dimostrativa pubblica.
  // Questa collection non ha teamId: si aggancia via userId + matchId.
  // Vedi Team.isDemo e DEMO_MODE_IMPLEMENTATION_PLAN.md §3.9
  isDemo: {
      type: Boolean,
      default: false,
      index: true
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      ret.id = ret._id;
      ret.createdAt = ret.createdAt.toISOString();
      delete ret._id;
      delete ret.__v;
      delete ret.updatedAt;
      return ret;
    }
  }
});

// Indexes per performance
matchNotificationSchema.index({ userId: 1, read: 1 });
matchNotificationSchema.index({ matchId: 1 });

module.exports = mongoose.model('MatchNotification', matchNotificationSchema);