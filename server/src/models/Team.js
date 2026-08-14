const mongoose = require('mongoose');

// Sub-schema for Team Settings
const teamSettingsSchema = new mongoose.Schema({
  isPrivate: {
    type: Boolean,
    default: false,
    required: true
  },
  maxMembers: {
    type: Number,
    default: 25,
    min: [5, 'Team must have at least 5 members'],
    max: [50, 'Team cannot exceed 50 members']
  },
  autoApprove: {
    type: Boolean,
    default: true,
    required: true
  },
  allowGuestVoting: {
    type: Boolean,
    default: false
  }
}, { _id: false });

// Sub-schema for Team Stats
const teamStatsSchema = new mongoose.Schema({
  totalMatches: {
    type: Number,
    default: 0,
    min: [0, 'Total matches cannot be negative']
  },
  totalGoals: {
    type: Number,
    default: 0,
    min: [0, 'Total goals cannot be negative']
  },
  wins: {
    type: Number,
    default: 0,
    min: [0, 'Wins cannot be negative']
  },
  losses: {
    type: Number,
    default: 0,
    min: [0, 'Losses cannot be negative']
  },
  draws: {
    type: Number,
    default: 0,
    min: [0, 'Draws cannot be negative']
  }
}, { _id: false });

// Main Team Schema
const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Team name is required'],
      trim: true,
      unique: true,
      maxlength: [50, 'Team name cannot exceed 50 characters'],
      minlength: [2, 'Team name must be at least 2 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    city: {
      type: String,
      trim: true,
      maxlength: [100, 'City name cannot exceed 100 characters']
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Team creator is required']
    },
    adminIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    memberIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    inviteCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      minlength: [6, 'Invite code must be at least 6 characters'],
      maxlength: [8, 'Invite code cannot exceed 8 characters']
    },
    settings: {
      type: teamSettingsSchema,
      default: () => ({})
    },
    stats: {
      type: teamStatsSchema,
      default: () => ({})
    },
    avatar: {
      type: String,
      trim: true
      // Removed: match regex. Avatar is now stored in Avatar collection.
      // Presence/absence determined by Avatar record and avatarUpdatedAt.
    },
    avatarUpdatedAt: {
      type: Date,
      default: null
    },
    colors: {
      primary: {
        type: String,
        default: '#007bff',
        match: [/^#[0-9A-F]{6}$/i, 'Primary color must be a valid hex color']
      },
      secondary: {
        type: String,
        default: '#6c757d',
        match: [/^#[0-9A-F]{6}$/i, 'Secondary color must be a valid hex color']
      }
    },
    isActive: {
      type: Boolean,
      default: true
    },

    // === AWARDS ===
    // Data dell'evento "Pallone d'Oro" (= fine stagione).
    // Il "Scarpa d'Oro" viene generato automaticamente +7 giorni dopo questa data.
    seasonEndDate: {
      type: Date,
      default: () => {
        const now = new Date();
        return new Date(now.getFullYear(), 5, 30); // default: 30 giugno dell'anno corrente
      }
    },
    awardsEnabled: {
      type: Boolean,
      default: true // default: true; admin può disabilitare la feature per il team
    }
  },
  {
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

// Metodo per generare codice invito
teamSchema.methods.generateInviteCode = function () {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  this.inviteCode = code;
  return code;
};

// Metodo per aggiungere un membro
teamSchema.methods.addMember = function (userId) {
  if (!this.memberIds.includes(userId)) {
    if (this.isFull) {
      throw new Error('Team has reached maximum members limit');
    }
    this.memberIds.push(userId);
  }
  return this;
};

// Metodo per rimuovere un membro
teamSchema.methods.removeMember = function (userId) {
  this.memberIds = this.memberIds.filter(id => !id.equals(userId));
  this.adminIds = this.adminIds.filter(id => !id.equals(userId));
  return this;
};

// Metodo per verificare se un utente è admin
teamSchema.methods.isAdmin = function (userId) {
  return this.adminIds.some(id => id.equals(userId));
};

// Metodo per verificare se un utente è membro
teamSchema.methods.isMember = function (userId) {
  return this.memberIds.some(id => id.equals(userId));
};

// Indexes per performance (name e inviteCode già hanno unique: true quindi non servono qui)
teamSchema.index({ createdBy: 1 });
teamSchema.index({ memberIds: 1 });
teamSchema.index({ isActive: 1 });

module.exports = mongoose.model('Team', teamSchema);