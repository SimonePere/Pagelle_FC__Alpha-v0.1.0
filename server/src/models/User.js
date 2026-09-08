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

    // Obbligatoria SOLO se NON guest
    required: function () {
      return !this.isGuest;
    },
    // match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],

    // Valida email SOLO per utenti non guest
    validate: {
      validator: function (v) {

        // Se guest -> salta completamente il controllo email
        if (this.isGuest) return true;

        // Se NON guest -> controlla regex email
        return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
      },
      message: 'Please enter a valid email'
    },

    unique: true,
    sparse: true, // Permette multiple null values
    lowercase: true,
    trim: true,
  },
  birthdate: {
    type: String,
    format: 'YYYY-MM-DD',
    required: function () {
      return !this.isGuest;
    },

    // Valida birthdate  SOLO per utenti non guest
    validate: {
      validator: function (v) {

        // Se guest -> salta controlli birthdate
        if (this.isGuest) return true;

        // Se NON guest -> controlla formato YYYY-MM-DD
        return /^\d{4}-\d{2}-\d{2}$/.test(v);
      },
      message: 'Birthdate must be a valid date in YYYY-MM-DD format'
    }
  },
  password: {
    type: String,

    // Obbligatoria SOLO se NON guest
    required: function () {
      return !this.isGuest;
    },
    minlength: [6, 'Password must be at least 6 characters'],
    select: false, // Don't include password in queries by default

    // Valida password SOLO per utenti non guest
    validate: {
      validator: function (v) {

        // Se guest -> salta controlli password
        if (this.isGuest) return true;

        // Se NON guest -> password deve esistere
        return v && v.length >= 6;
      },
      message: 'Password must be at least 6 characters'
    }
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
    enum: ['player', 'admin', 'moderator', 'god', 'captain'],
    default: 'player'
  },
  // Nuovi Campi per utenti guest: possibilità da parte di un utente registrato ADMIN di Team,
  // di creare un utente Guest per aggiungerlo alla partita a cui partecipa, fargli votare quella stessa partita e vedere le classifche, risultati ecc
  // CON SCOPE RIDOTTO (READ ONLY)
  // Può vedere: Home, pag. Vota, pag. Storico

  // Guest (senza email/password) con un token di invito
  isGuest: {
    type: Boolean,
    default: false
  },
  inviteToken: {
    type: String,
    index: {
      unique: true,
      partialFilterExpression: { inviteToken: { $type: 'string' } }
    }
  },
  inviteTokenMatchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match'
  },
  guestCreatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // 🔒 Flag amministrativo: se TRUE consente al guest di auto-promuoversi a
  // utente registrato (role: player) tramite i flussi /auth/promote-guest-by-invite-token
  // e /auth/promote-guest-by-id. Default FALSE → guest "bloccato": nessuna CTA
  // di registrazione in UI e backend respinge i merge con 403.
  // Solo team-admin del suo team o admin globale può modificarlo.
  canPromoteToPlayer: {
    type: Boolean,
    default: false
  },
  canPromoteToPlayerSetBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  canPromoteToPlayerSetAt: {
    type: Date
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
      trim: true
      // Removed: match regex. Avatar is now stored in Avatar collection.
      // Presence/absence determined by Avatar record and avatarUpdatedAt.
    },
    avatarUpdatedAt: {
      type: Date,
      default: null
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
  },

  // === MODALITÀ DEMO ===
  // Giocatore appartenente alla squadra dimostrativa pubblica.
  // Non è un guest: ha email e password reali (segnaposto interni), così in UI
  // è indistinguibile da un utente vero e non mostra il badge "Ospite".
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