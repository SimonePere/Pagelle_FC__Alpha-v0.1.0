// models/News.js
const mongoose = require('mongoose');

/**
 * NEWS MODEL
 * 
 * Contiene le notizie generate dal sistema in risposta a vari eventi:
 * 
 * - leaderboard → Cambi classifica, nuovi leader
 * - match_creation → Nuove partite, meteo, partecipanti
 * - match_completed → MVP, flop, goleador, prestazioni squadra
 * - playercard_creation → Rating alti, attributi eccezionali
 * - streaks, debuts, milestones, rivalries, fun_facts
 * 
 * RESPONSABILITÀ:
 * - Memorizzare notizie testuali con metadati associati
 * - Categorizzare e prioritizzare le notizie
 * - Fornire informazioni contestuali tramite eventData
 * - Supportare query efficienti per recupero notizie recenti 
 */

const NewsSchema = new mongoose.Schema({
    teamId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
        required: true,
        index: true
    },
    text: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    }, // 'match_completed', 'leaderboard', etc.
    type: {
        type: String,
        required: true
    },     // 'mvp_performance', 'new_leader', etc.
    priority: {
        type: String,
        enum: ['urgent',
            'high',
            'medium',
            'low'],
        default: 'medium'
    },
    icon: { type: String },
    style: {
        type: String,
        enum: ['success',
            'warning',
            'info',
            'default'],
        default: 'default'
    },
    eventData: { type: mongoose.Schema.Types.Mixed }, // metadata originale
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    }
});

module.exports = mongoose.model('News', NewsSchema);