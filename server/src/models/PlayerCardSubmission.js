// models/PlayerCardSubmission.js
const mongoose = require('mongoose');

/**
 * PLAYER CARD SUBMISSION MODEL
 * 
 * Rappresenta il voto individuale di un singolo utente per valutare le ABILITÀ GENERALI
 * di un giocatore specifico (FIFA-style player card).
 * 
 * RESPONSABILITÀ:
 * - Memorizzare ATTRIBUTI del giocatore (tir, pas, dri, fin, vis, res, for)
 * - Tracciare METADATA (tempo, device, IP per audit)
 * - Gestire PROFILO GIOCATORE (posizione)
 * 
 * DIFFERENZA vs VoteSubmission:
 * - VoteSubmission: valuta PERFORMANCE in una partita specifica (1-10)
 * - PlayerCardSubmission: valuta ABILITÀ GENERALI del giocatore (10-100)
 * 
 * NOTA: Overall Rating calcolato manualmente nel controller per evitare problemi middleware
 */

const PlayerCardSubmissionSchema = new mongoose.Schema({
    // === RIFERIMENTI ===

    votingSessionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VotingSession',
        required: true,
        index: true
    },

    voterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    targetPlayerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
        // ⭐ CHI viene valutato (singolo giocatore per submission)
    },

    // === ATTRIBUTI PLAYER CARD (FIFA-style) ===

    attributes: {
        tir: {
            type: Number,
            min: 10,
            max: 100,
            required: true
        }, // Tiro
        pas: {
            type: Number,
            min: 10,
            max: 100,
            required: true
        }, // Passaggio
        dri: {
            type: Number,
            min: 10,
            max: 100,
            required: true
        }, // Dribbling
        fin: {
            type: Number,
            min: 10,
            max: 100,
            required: true
        }, // Finalizzazione
        vis: {
            type: Number,
            min: 10,
            max: 100,
            required: true
        }, // Visione di gioco
        res: {
            type: Number,
            min: 10,
            max: 100,
            required: true
        }, // Resistenza
        for: {
            type: Number,
            min: 10,
            max: 100,
            required: true
        }  // Forza
    },

    // === ATTRIBUTI AGGIUNTIVI ===

    additionalAttributes: {
        piedeDebole: {
            type: Number,
            min: 1,
            max: 5,
            required: false
        }, // Stelle piede debole (1-5)
        skill: {
            type: Number,
            min: 1,
            max: 5,
            required: false
        }  // Stelle skill moves (1-5)
    },

    // === PROFILO GIOCATORE ===

    playerProfile: {
        position: {
            type: String,
            enum: ['POR', 'DC', 'TS', 'TD', 'CC', 'CDC', 'COC', 'ED', 'ES', 'AT', 'AD', 'AS', 'ATT'],
            required: false
            // POR=Portiere, DC=Difensore Centrale, TS/TD=Terzini, 
            // CC=Centrocampista, CDC/COC=Centrocampista Dif/Off,
            // ED/ES=Esterni, AT/AD/AS=Attaccanti, ATT=Attaccante Centrale
        }
    },

    // === RATING CALCOLATO ===

    overallRating: {
        type: Number,
        min: 10,
        max: 100
        // Calcolato manualmente nel controller: media dei 7 attributi principali
    },

    // === COMMENTO OPZIONALE ===

    comment: {
        type: String,
        maxlength: 1000
        // Commento generale sulla valutazione del giocatore
    },

    // === TRACKING E METADATA (identici a VoteSubmission) ===

    timeSpent: {
        type: Number,
        default: 0,
        min: 0
    },

    ipAddress: {
        type: String
    },

    userAgent: {
        type: String
    },

    deviceInfo: {
        isMobile: { type: Boolean, default: false },
        platform: { type: String },
        screenResolution: { type: String },
        browserLanguage: { type: String, default: 'it' }
    },

    // === VERSIONING (per future implementazioni) ===
    // TODO: Implementare sistema edit voti in futuro
    // - Permettere modifica entro X giorni
    // - Mantenere audit trail delle modifiche
    // - Sistema di notifiche per modifiche

    version: {
        type: Number,
        default: 1,
        min: 1
    },

    isActive: {
        type: Boolean,
        default: true,
        index: true
    },

    // === VALIDAZIONE E INTEGRITÀ ===

    submissionHash: {
        type: String
        // Hash per verificare integrità dati (calcolato nel controller)
    },

    validated: {
        type: Boolean,
        default: false
    },

    validationErrors: [{
        field: String,
        message: String
    }]

}, {
    timestamps: true,

    index: [
        { votingSessionId: 1, voterId: 1 }, // Voto per sessione per utente
        { targetPlayerId: 1, createdAt: -1 }, // Storico valutazioni per giocatore
        { voterId: 1, createdAt: -1 }, // Storico voti utente
        { isActive: 1, version: -1 }, // Query voti attivi
        { overallRating: -1 } // Ordinamento per rating
    ]
});

// === INDICI UNICI ===
PlayerCardSubmissionSchema.index(
    { votingSessionId: 1, voterId: 1, targetPlayerId: 1, isActive: 1 },
    {
        unique: true,
        partialFilterExpression: { isActive: true }
    }
    // GARANTISCE: Un solo voto attivo per utente per giocatore per sessione
);

// === METODI VIRTUALI ===

PlayerCardSubmissionSchema.virtual('attributesArray').get(function () {
    return [
        this.attributes.tir, this.attributes.pas, this.attributes.dri,
        this.attributes.fin, this.attributes.vis, this.attributes.res, this.attributes.for
    ];
});

PlayerCardSubmissionSchema.virtual('isHighRating').get(function () {
    return this.overallRating >= 85;
});

// === METODI ISTANZA ===

/**
 * Valida attributi contro configurazione sessione
 */
PlayerCardSubmissionSchema.methods.validateAgainstSession = async function () {
    const VotingSession = mongoose.model('VotingSession');
    const session = await VotingSession.findById(this.votingSessionId);

    if (!session) throw new Error('VotingSession not found');
    if (session.type !== 'player_card_rating') throw new Error('Invalid session type for PlayerCardSubmission');

    const errors = [];
    const { min, max } = session.voteConfig.attributeRange || { min: 10, max: 100 };

    // Valida ogni attributo
    Object.entries(this.attributes).forEach(([attr, value]) => {
        if (value < min || value > max) {
            errors.push({
                field: `attributes.${attr}`,
                message: `${attr} must be between ${min} and ${max}`
            });
        }
    });

    // Valida attributi aggiuntivi
    if (this.additionalAttributes.piedeDebole &&
        (this.additionalAttributes.piedeDebole < 1 || this.additionalAttributes.piedeDebole > 5)) {
        errors.push({
            field: 'additionalAttributes.piedeDebole',
            message: 'Piede debole must be between 1 and 5'
        });
    }

    if (this.additionalAttributes.skill &&
        (this.additionalAttributes.skill < 1 || this.additionalAttributes.skill > 5)) {
        errors.push({
            field: 'additionalAttributes.skill',
            message: 'Skill must be between 1 and 5'
        });
    }

    this.validationErrors = errors;
    this.validated = errors.length === 0;

    return this.validated;
};

/**
 * Calcola breakdown dettagliato attributi
 */
PlayerCardSubmissionSchema.methods.getAttributeBreakdown = function () {
    const attrs = this.attributes;
    const total = attrs.tir + attrs.pas + attrs.dri + attrs.fin + attrs.vis + attrs.res + attrs.for;

    return {
        attributes: {
            tir: attrs.tir,
            pas: attrs.pas,
            dri: attrs.dri,
            fin: attrs.fin,
            vis: attrs.vis,
            res: attrs.res,
            for: attrs.for
        },
        overallRating: this.overallRating,
        total: total,
        average: Math.round(total / 7 * 10) / 10,
        additional: this.additionalAttributes,
        profile: this.playerProfile
    };
};

// TODO: Metodo per future implementazioni edit
/**
 * Crea nuova versione per modifiche (da implementare)
 */
// PlayerCardSubmissionSchema.methods.createEditVersion = async function (newData, reason) {
//   // Sistema simile a VoteSubmission.createNewVersion()
//   // - Marca questo come isActive: false
//   // - Crea nuovo documento con version++
//   // - Mantiene audit trail
// };

// === METODI STATICI ===

/**
 * Trova voto attivo per utente e giocatore target
 */
PlayerCardSubmissionSchema.statics.findActiveByUserAndTarget = function (userId, targetPlayerId, sessionId) {
    return this.findOne({
        voterId: userId,
        targetPlayerId: targetPlayerId,
        votingSessionId: sessionId,
        isActive: true
    });
};

/**
 * Statistiche per giocatore target
 */
PlayerCardSubmissionSchema.statics.getPlayerStats = async function (targetPlayerId, sessionId) {
    const submissions = await this.find({
        targetPlayerId: targetPlayerId,
        votingSessionId: sessionId,
        isActive: true
    });

    if (submissions.length === 0) return null;

    // Calcola medie per ogni attributo
    const attributeStats = {
        tir: { values: [], average: 0 },
        pas: { values: [], average: 0 },
        dri: { values: [], average: 0 },
        fin: { values: [], average: 0 },
        vis: { values: [], average: 0 },
        res: { values: [], average: 0 },
        for: { values: [], average: 0 }
    };

    submissions.forEach(submission => {
        Object.keys(attributeStats).forEach(attr => {
            attributeStats[attr].values.push(submission.attributes[attr]);
        });
    });

    // Calcola medie
    Object.keys(attributeStats).forEach(attr => {
        const values = attributeStats[attr].values;
        attributeStats[attr].average = Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
    });

    const overallAverage = Math.round(
        Object.values(attributeStats).reduce((sum, stat) => sum + stat.average, 0) / 7
    );

    return {
        targetPlayerId,
        voteCount: submissions.length,
        attributeStats,
        overallAverage,
        submissions: submissions.map(s => s.getAttributeBreakdown())
    };
};

module.exports = mongoose.model('PlayerCardSubmission', PlayerCardSubmissionSchema);