const mongoose = require('mongoose');

/**
 * SEASON MODEL — Anagrafica GLOBALE delle stagioni
 *
 * Le stagioni in Pagelle FC sono GLOBALI (uguali per tutti i team) e CONTIGUE:
 * ogni stagione va dal 1 luglio (incluso) al 1 luglio successivo (escluso),
 * quindi non esistono partite "fuori stagione".
 *
 * Convenzione naming: "YYYY-YY" (es. "2025-26") → la stagione prende il nome
 * dall'anno in cui INIZIA (autunno). Esempio: ottobre 2025 e marzo 2026
 * appartengono entrambi alla stagione "2025-26".
 *
 * Questa collection è solo ANAGRAFICA: i record transazionali
 * (Match, VotingSession, VoteResult, Award) denormalizzano la stringa `seasonId`
 * e non referenziano l'_id di questo documento.
 *
 * Stato: una sola stagione 'active' alla volta.
 */
const seasonSchema = new mongoose.Schema({
    // Identificatore stringa "YYYY-YY" — chiave logica globale
    seasonId: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        match: [/^\d{4}-\d{2}$/, 'seasonId deve essere nel formato YYYY-YY (es. 2025-26)']
    },

    // Nome leggibile, es. "Stagione 2025/26"
    displayName: {
        type: String,
        required: true,
        trim: true
    },

    // Inizio stagione (incluso): 1 luglio dell'anno di apertura
    seasonStart: {
        type: Date,
        required: true
    },

    // Fine stagione (ESCLUSO): 1 luglio dell'anno successivo
    seasonEnd: {
        type: Date,
        required: true
    },

    status: {
        type: String,
        enum: ['active', 'archived', 'upcoming'],
        default: 'upcoming',
        required: true,
        index: true
    },

    archivedAt: {
        type: Date,
        default: null
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

// Indici: `status` ha già `index: true` sul campo, `seasonId` ha `unique: true`
// (entrambi creano l'indice implicitamente) → nessun schema.index() aggiuntivo.

module.exports = mongoose.model('Season', seasonSchema);
