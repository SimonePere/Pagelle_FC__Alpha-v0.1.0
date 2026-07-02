const mongoose = require('mongoose');

/**
 * AWARD MODEL - Card celebrative generate automaticamente
 *
 * TIPI:
 * - MATCH_RECAP   → Podio top 3 voti di una partita
 * - MONTHLY_MVP   → Hero migliore del mese (cron mensile)
 * - BALLON_DOR    → Hero migliore della stagione (cron stagionale)
 * - GOLDEN_BOOT   → Hero capocannoniere della stagione (cron stagionale)
 *
 * LIFECYCLE: PENDING (dati pronti) → READY (PNG renderizzati) → FAILED (retry)
 *
 * Il payload è uno SNAPSHOT IMMUTABILE: non aggiornare dopo READY
 * (se un giocatore cambia nome/avatar, la card resta storica).
 */

// Sub-schema voce podio (1°, 2°, 3°)
const podiumEntrySchema = new mongoose.Schema({
    position: { type: Number, min: 1, max: 3 },
    playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // null = guest non registrato
    name: String,
    avatar: { type: String, default: null },
    avg: Number,
    votersCount: Number,
    mvpStreakCount: Number
}, { _id: false });

// Sub-schema una stat della griglia 2x2 Hero
const heroStatSchema = new mongoose.Schema({
    value: String,
    label: String
}, { _id: false });

// Sub-schema highlight (es. STREAK_MVP)
const highlightSchema = new mongoose.Schema({
    code: String,
    text: [String],          // tipicamente 2 righe
    colorAccent: String,
    playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { _id: false });

const awardSchema = new mongoose.Schema({
    // === RIFERIMENTI ===
    teamId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['MATCH_RECAP', 'MONTHLY_MVP', 'BALLON_DOR', 'GOLDEN_BOOT'],
        required: true
    },
    refId: {
        type: String,
        required: true
        // matchId per MATCH_RECAP, "YYYY-MM" per MONTHLY_MVP, "season-{seasonId}" per stagionali
    },
    // === STAGIONE (denormalizzato, Fase 2) ===
    // Stringa "YYYY-YY". Per stagionali coincide col seasonId in refId; per MATCH_RECAP/MONTHLY_MVP
    // è risolto dalla data del periodo. Optional in Fase 2.
    seasonId: {
        type: String,
        index: true,
        default: null
    },
    status: {
        type: String,
        enum: ['PENDING', 'READY', 'FAILED'],
        default: 'PENDING',
        required: true
    },
    generatedAt: { type: Date, default: Date.now },
    finalizedAt: Date,

    // === PAYLOAD SNAPSHOT (immutabile dopo READY) ===
    payload: {
        seasonId: String,                 // stagione di riferimento ("2025-26")
        period: {
            label: String,                    // "16 Maggio 2026" / "Maggio 2026" / "Stagione 2025/26"
            dateFrom: Date,
            dateTo: Date
        },
        // Solo per forma Podio (MATCH_RECAP)
        podium: [podiumEntrySchema],
        // Solo per forma Hero (MONTHLY_MVP, BALLON_DOR, GOLDEN_BOOT)
        hero: {
            playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
            name: String,
            avatar: { type: String, default: null },
            mainValue: String,                // già formattato dal backend ("8.4" / "24" / "91%")
            mainLabel: String,                // "MEDIA VOTO · MAGGIO" / "GOL IN STAGIONE"
            stats: [heroStatSchema]           // 4 stat fisse griglia 2x2
        },
        // Highlights Podio (max 2)
        highlights: [highlightSchema],
        // Meta calcolo
        totalVoters: Number,
        eligibleVoters: Number,
        autoVoteExcluded: { type: Boolean, default: false }
    },

    // === OUTPUT RENDERING ===
    imageUrl: String,            // 1080x1920
    imageSquareUrl: String,      // 1080x1080 (OG WhatsApp)
    imageThumbUrl: String,       // 240x426 (mini-card)
    shareUrl: String,            // URL pubblico /c/:cardId

    // === TRACKING UTENTE ===
    viewedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // === METRICHE AGGREGATE ===
    stats: {
        views: { type: Number, default: 0 },
        shareClicks: {
            native: { type: Number, default: 0 },
            whatsapp: { type: Number, default: 0 },
            telegram: { type: Number, default: 0 },
            copyLink: { type: Number, default: 0 },
            download: { type: Number, default: 0 }
        },
        publicPageVisits: { type: Number, default: 0 },
        signupsAttributed: { type: Number, default: 0 }
    },

    // === ERROR TRACKING ===
    generationAttempts: { type: Number, default: 0 },
    lastError: { type: String, default: null }
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

// === INDICI ===
awardSchema.index({ teamId: 1, type: 1, generatedAt: -1 });                  // bacheca team
awardSchema.index({ teamId: 1, seasonId: 1, type: 1 });                      // bacheca per stagione
awardSchema.index({ teamId: 1, refId: 1, type: 1 }, { unique: true });       // anti-duplicati
awardSchema.index({ status: 1, generatedAt: 1 });                            // retry job
awardSchema.index({ viewedBy: 1, teamId: 1 });                               // pending-awards check

module.exports = mongoose.model('Award', awardSchema);