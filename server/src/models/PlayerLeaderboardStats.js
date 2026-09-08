const mongoose = require('mongoose');

const playerLeaderboardStatsSchema = new mongoose.Schema({
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

    // === CACHE INFORMAZIONI BASE ===
    playerName: {
        type: String,
        required: [true, 'Nome giocatore è obbligatorio'],
        maxLength: [50, 'Nome non può superare 50 caratteri'],
        trim: true
    },

    // === STATISTICHE MATCH ===
    totalMatches: {
        type: Number,
        default: 0,
        min: [0, 'Total matches non può essere negativo']
    },

    totalGoals: {
        type: Number,
        default: 0,
        min: [0, 'Total goals non può essere negativo']
    },

    totalAssists: {
        type: Number,
        default: 0,
        min: [0, 'Total assists non può essere negativo']
    },

    totalRatingPoints: {
        type: Number,
        default: 0,
        min: [0, 'Total rating points non può essere negativo']
    },

    averageRating: {
        type: Number,
        default: 0,
        min: [0, 'Average rating non può essere negativo'],
        max: [10, 'Average rating non può superare 10']
    },

    bestRating: {
        type: Number,
        default: null,
        min: [1, 'Best rating non può essere inferiore a 1'],
        max: [10, 'Best rating non può superare 10']
    },

    worstRating: {
        type: Number,
        default: null,
        min: [1, 'Worst rating non può essere inferiore a 1'],
        max: [10, 'Worst rating non può superare 10']
    },

    // === GOAL / ASSIST PER MATCH ===
    goalPerMatch: {
        type: Number,
        default: null,
    },
    assistPerMatch: {
        type: Number,
        default: null,
    },

    // === FORMA RECENTE ===
    recentForm: [{
        type: Number,
        min: [1, 'Rating non può essere inferiore a 1'],
        max: [10, 'Rating non può superare 10']
    }],

    // === PLAYER CARD (AGGIUNTO) ===
    playerCardTOT: {
        type: Number,
        min: [10, 'Player card TOT non può essere inferiore a 10'],
        max: [100, 'Player card TOT non può superare 100'],
        default: null
    },

    totalPlayerCardEvaluations: {
        type: Number,
        default: 0,
        min: [0, 'Total evaluations non può essere negativo']
    },

    // === METADATI ===
    lastUpdatedAt: {
        type: Date,
        default: Date.now
    },

    isActive: {
        type: Boolean,
        default: true
    },

    dataVersion: {
        type: Number,
        default: 1,
        min: [1, 'Data version deve essere almeno 1']
    },

    // === MODALITÀ DEMO ===
    // Statistiche di classifica della squadra dimostrativa pubblica.
    // Vedi Team.isDemo e DEMO_MODE_IMPLEMENTATION_PLAN.md §3.9
    isDemo: {
        type: Boolean,
        default: false,
        index: true
    }

}, {
    timestamps: true,
    collection: 'playerleaderboardstats'
});

// === INDICES COMPOUND ===
playerLeaderboardStatsSchema.index({ teamId: 1, playerId: 1 }, { unique: true });
playerLeaderboardStatsSchema.index({ teamId: 1, averageRating: -1 });
playerLeaderboardStatsSchema.index({ teamId: 1, totalGoals: -1 });
playerLeaderboardStatsSchema.index({ teamId: 1, totalAssists: -1 });
playerLeaderboardStatsSchema.index({ teamId: 1, playerCardTOT: -1 });

// === VIRTUAL PROPERTIES ===
playerLeaderboardStatsSchema.virtual('recentFormAverage').get(function () {
    if (this.recentForm.length === 0) return 0;
    const sum = this.recentForm.reduce((acc, rating) => acc + rating, 0);
    return sum / this.recentForm.length;
});

// === CALCOLO MEDIA GIOCATORE (CLASSIFICA PRINCIPALE) ===
playerLeaderboardStatsSchema.methods.calculateAverageRating = function () {
    if (this.totalMatches === 0) {
        this.averageRating = 0;
    } else {
        this.averageRating = Number((this.totalRatingPoints / this.totalMatches).toFixed(2));
    }
    return this.averageRating;
};

// === CALCOLO MEDIA GOLxPARTITA / ASSISTxPARTITA ===
playerLeaderboardStatsSchema.methods.calculateGoalAssistPerMatch = function () {
    if (this.totalMatches === 0) {
        this.goalPerMatch = 0;
        this.assistPerMatch = 0;
        return;
    }

    this.goalPerMatch = Number((this.totalGoals / this.totalMatches).toFixed(2));
    this.assistPerMatch = Number((this.totalAssists / this.totalMatches).toFixed(2));
};

// === FORMA RECENTE (ULTIME 5 PARTITE) ===
playerLeaderboardStatsSchema.methods.addToRecentForm = function (rating) {
    this.recentForm.push(rating);
    // Mantieni solo gli ultimi 5
    if (this.recentForm.length > 5) {
        this.recentForm.shift();
    }
    this.markModified('recentForm');
};

// UPDATEFROMMATCH è un metodo di istanza che aggiorna le statistiche del giocatore dopo ogni partita. Accetta il rating della partita, i gol e gli assist come parametri. Aggiorna il numero totale di partite, gol, assist e punti di rating, ricalcola la media e aggiorna la forma recente. Infine, aggiorna il timestamp e la versione dei dati.
playerLeaderboardStatsSchema.methods.updateFromMatch = function (rating, goals = 0, assists = 0) {
    this.totalMatches += 1;
    this.totalGoals += goals;
    this.totalAssists += assists;
    this.totalRatingPoints += rating;

    this.calculateAverageRating();
    this.calculateGoalAssistPerMatch();
    this.addToRecentForm(rating);

    this.lastUpdatedAt = new Date();
    this.dataVersion += 1;
};

// === METODO UPDATE STATS (AGGIUNTO) ===
playerLeaderboardStatsSchema.statics.updateStats = async function (playerId, updateData) {
    const stats = await this.findOrCreate(playerId, updateData.teamId, updateData.playerName);

    // Aggiorna rating se presente
    if (updateData.rating) {
        stats.totalMatches += updateData.rating.totalMatches || 0;
        stats.totalRatingPoints += updateData.rating.totalRating || 0;
        stats.calculateAverageRating();
    }

    // Aggiorna gol se presente
    if (updateData.goals) {
        stats.totalGoals += updateData.goals.totalGoals || 0;
    }

    // Aggiorna assist se presente
    if (updateData.assists) {
        stats.totalAssists += updateData.assists.totalAssists || 0;
    }

    // Ricalcola media gol/assist per partita
    stats.calculateGoalAssistPerMatch();

    // Aggiorna form se presente
    if (updateData.form && updateData.form.recentMatches) {
        updateData.form.recentMatches.forEach(rating => {
            stats.addToRecentForm(rating);
        });
    }

    // Aggiorna playercard se presente
    if (updateData.playercard) {
        stats.totalPlayerCardEvaluations += updateData.playercard.totalEvaluations || 0;
        if (updateData.playercard.overallRating) {
            stats.playerCardTOT = updateData.playercard.overallRating;
        }
    }

    stats.lastUpdatedAt = new Date();
    stats.dataVersion += 1;

    return await stats.save();
};

// === METODI STATICI ===
playerLeaderboardStatsSchema.statics.findByTeam = function (teamId) {
    return this.find({ teamId, isActive: true }).sort({ averageRating: -1 });
};

playerLeaderboardStatsSchema.statics.findOrCreate = async function (playerId, teamId, playerName) {
    let stats = await this.findOne({ playerId, teamId });

    if (!stats) {
        stats = new this({
            playerId,
            teamId,
            playerName
        });
        await stats.save();
    }

    return stats;
};

module.exports = mongoose.model('PlayerLeaderboardStats', playerLeaderboardStatsSchema);