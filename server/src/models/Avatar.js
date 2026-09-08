const mongoose = require('mongoose');

/**
 * Avatar Schema — Archivia i byte immagine (foto profilo utente o stemma team)
 * Separato dai modelli User/Team per non far viaggiare i byte nelle query (RNF-3)
 * 
 * Relazione 1:1 per (ownerId, ownerType)
 */
const avatarSchema = new mongoose.Schema({
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, 'Avatar ownerId is required'],
        index: true
    },
    ownerType: {
        type: String,
        enum: {
            values: ['user', 'team'],
            message: 'ownerType must be either "user" or "team"'
        },
        required: [true, 'Avatar ownerType is required'],
        index: true
    },
    data: {
        type: Buffer,
        required: [true, 'Avatar data (Buffer) is required']
    },
    contentType: {
        type: String,
        required: [true, 'Avatar contentType is required'],
        default: 'image/webp',
        enum: {
            values: ['image/webp', 'image/jpeg', 'image/png'],
            message: 'contentType must be one of: image/webp, image/jpeg, image/png'
        }
    },
    byteSize: {
        type: Number,
        required: [true, 'Avatar byteSize is required'],
        min: [1, 'Avatar must have at least 1 byte'],
        max: [200000, 'Avatar cannot exceed 200KB']
    },

    // === MODALITÀ DEMO ===
    // Avatar di un giocatore della squadra dimostrativa pubblica.
    // Questa collection non ha teamId: si aggancia via ownerId.
    // Vedi Team.isDemo e DEMO_MODE_IMPLEMENTATION_PLAN.md §3.9
    isDemo: {
        type: Boolean,
        default: false,
        index: true
    }
}, {
    timestamps: true,
    toJSON: {
        transform: function (doc, ret) {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            // NEVER expose the Buffer in JSON responses
            delete ret.data;
            return ret;
        }
    }
});

// Unique constraint: solo un avatar per (ownerId, ownerType)
avatarSchema.index({ ownerId: 1, ownerType: 1 }, { unique: true });

module.exports = mongoose.model('Avatar', avatarSchema);
