const mongoose = require('mongoose');
const { format } = require('path');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: true, // Optional come nel frontend
    unique: true,
    sparse: true, // Permette multiple null values
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  birthdate: {
    type: String,
    format: 'YYYY-MM-DD',
    required: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  teamIds: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'Team',
    default: [],
    validate: {
      validator: function (v) {
        return Array.isArray(v);
      },
      message: 'teamIds must be an array of valid ObjectIds'
    }
  },
  teamName: {
    type: String,
    trim: true,
    maxlength: [30, 'Team name cannot exceed 30 characters']
  },
  role: {
    type: String,
    enum: ['player', 'admin', 'moderator'],
    default: 'player'
  },
  profile: {
    position: {
      type: String,
      enum: ['POR', 'DIF', 'CEN', 'ATT', 'UTIL'],
      default: 'UTIL'
    },
    preferredFoot: {
      type: String,
      enum: ['left', 'right', 'both'],
      default: 'right'
    },
    avatar: {
      type: String,
      trim: true,
      match: [/^https?:\/\/.+/, 'Avatar must be a valid URL']
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [200, 'Bio cannot exceed 200 characters']
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function (doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      delete ret.password; // Never return password
      return ret;
    }
  }
});

// Virtual per contare i team
userSchema.virtual('totalTeams').get(function () {
  return this.teamIds ? this.teamIds.length : 0;
});

// Virtual per verificare se ha team
userSchema.virtual('hasTeams').get(function () {
  return this.totalTeams > 0;
});

// Virtual per il nome completo se aggiungiamo firstName/lastName
userSchema.virtual('displayName').get(function () {
  return this.name || 'Unknown User';
});

// Metodo per verificare se l'utente è in un team specifico
userSchema.methods.isInTeam = function (teamId) {
  return this.teamIds.some(id => id.equals(teamId));
};

// Metodo per aggiungere un team
userSchema.methods.joinTeam = function (teamId) {
  if (!this.isInTeam(teamId)) {
    this.teamIds.push(teamId);
  }
  return this;
};

// Metodo per lasciare un team
userSchema.methods.leaveTeam = function (teamId) {
  this.teamIds = this.teamIds.filter(id => !id.equals(teamId));
  return this;
};

// Index per performance (email già ha unique: true quindi non serve qui)
userSchema.index({ teamIds: 1 });
userSchema.index({ 'profile.position': 1 });
userSchema.index({ isActive: 1 });

module.exports = mongoose.model('User', userSchema);