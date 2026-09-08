const mongoose = require('mongoose');

// Costanti (single source of truth)
const GOLDEN_TOT_RULES = {
    BALLON_DOR: { field: 'playerCardTOT', delta: 3 },
    GOLDEN_BOOT: { field: 'fin', delta: 2 },
}

const goldenTotSchema = new mongoose.Schema({
    teamId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
        required: true,
        index: true
    },
    // stagione in cui il bonus è ATTIVO (N+1)
    // esempio: se il giocatore ha vinto il BALLON_DOR nella stagione 2022/2023, il bonus +3 sarà applicato nella stagione 2023/2024
    seasonId: {
        type: String,
        required: true,
        index: true
    },
    // vincitore che riceve il bonus
    playerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    source: {
        type: String,
        enum: ['BALLON_DOR', 'GOLDEN_BOOT'],
        required: true
    },
    // target del bonus (field)
    // DOVE viene applicato il bonus (playerCardTOT o fin)
    field: {
        type: String,
        enum: ['playerCardTOT', 'fin']
    },
    // (+3 per BALLON_DOR, +2 per GOLDEN_BOOT)
    delta: {
        type: Number
    },
    // award origine (tracciabilità)
    awardId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Award',
        required: true
    },
    // stagione vinta (N)
    sourceSeasonId: {
        type: String
    },
    // per rollback soft / decadenza
    isActive: {
        type: Boolean,
        default: true
    },
    appliedAt: {
        type: Date,
        default: Date.now
    },

    // === MODALITÀ DEMO ===
    // Bonus Golden TOT della squadra dimostrativa pubblica.
    // Vedi Team.isDemo e DEMO_MODE_IMPLEMENTATION_PLAN.md §3.9
    isDemo: {
        type: Boolean,
        default: false,
        index: true
    }
}, {
    timestamps: true
});

// === INDICI ===
goldenTotSchema.index({ teamId: 1, seasonId: 1, playerId: 1, source: 1 }, { unique: true });
goldenTotSchema.index({ teamId: 1, seasonId: 1, isActive: 1 });

const GoldenTot = mongoose.model('GoldenTot', goldenTotSchema);

module.exports = { GoldenTot, GOLDEN_TOT_RULES };