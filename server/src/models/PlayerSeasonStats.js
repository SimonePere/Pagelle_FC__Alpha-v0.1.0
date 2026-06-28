const mongoose = require('mongoose');

/**
 * PLAYER SEASON STATS MODEL — Statistiche giocatore PER STAGIONE (Fase 3)
 *
 * A differenza di `PlayerLeaderboardStats` (vista "lifetime", somma di tutte le
 * stagioni, mantenuta per backward compat), questo modello tiene le statistiche
 * aggregate di un giocatore LIMITATE a una singola stagione `seasonId`.
 *
 * CHIAVE: (playerId, teamId, seasonId) è unica.
 *
 * NATURA DEI DATI: i valori sono ASSOLUTI e RICALCOLATI da zero a ogni
 * `PlayerSeasonStatsService.recompute(teamId, seasonId)` aggregando i `VoteResult`
 * della stagione. Non sono incrementali → il ricalcolo è idempotente.
 */
const playerSeasonStatsSchema = new mongoose.Schema({
    // === IDENTIFICAZIONE ===
    playerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Player ID è obbligatorio'],
        index: true
    },

    teamId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
        required: [true, 'Team ID è obbligatorio'],
        index: true
    },

    seasonId: {
        type: String,
        required: [true, 'seasonId è obbligatorio'],
        match: [/^\d{4}-\d{2}$/, 'seasonId deve essere nel formato YYYY-YY (es. 2025-26)'],
        index: true
    },

    // === CACHE INFORMAZIONI BASE ===
    playerName: {
        type: String,
        required: [true, 'Nome giocatore è obbligatorio'],
        maxLength: [50, 'Nome non può superare 50 caratteri'],
        trim: true
    },

    // === STATISTICHE STAGIONALI (aggregate) ===
    matchesPlayed: {
        type: Number,
        default: 0,
        min: [0, 'matchesPlayed non può essere negativo']
    },

    totalGoals: {
        type: Number,
        default: 0,
        min: [0, 'totalGoals non può essere negativo']
    },

    totalAssists: {
        type: Number,
        default: 0,
        min: [0, 'totalAssists non può essere negativo']
    },

    totalRatingPoints: {
        type: Number,
        default: 0,
        min: [0, 'totalRatingPoints non può essere negativo']
    },

    averageRating: {
        type: Number,
        default: 0,
        min: [0, 'averageRating non può essere negativo'],
        max: [10, 'averageRating non può superare 10']
    },

    bestRating: {
        type: Number,
        default: null,
        min: [1, 'bestRating non può essere inferiore a 1'],
        max: [10, 'bestRating non può superare 10']
    },

    worstRating: {
        type: Number,
        default: null,
        min: [1, 'worstRating non può essere inferiore a 1'],
        max: [10, 'worstRating non può superare 10']
    },

    mvpCount: {
        type: Number,
        default: 0,
        min: [0, 'mvpCount non può essere negativo']
    },

    // Presenze (partite in cui il giocatore ha ricevuto almeno un voto nella stagione).
    // Coincide con matchesPlayed nell'aggregazione corrente, ma è esplicitato per
    // chiarezza semantica e per eventuali divergenze future.
    presences: {
        type: Number,
        default: 0,
        min: [0, 'presences non può essere negativo']
    },

    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    collection: 'playerseasonstats',
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
// Chiave logica unica: un solo record per (giocatore, team, stagione)
playerSeasonStatsSchema.index({ playerId: 1, teamId: 1, seasonId: 1 }, { unique: true });
// Leaderboard per stagione (ordinata per media voto)
playerSeasonStatsSchema.index({ teamId: 1, seasonId: 1, averageRating: -1 });

module.exports = mongoose.model('PlayerSeasonStats', playerSeasonStatsSchema);
