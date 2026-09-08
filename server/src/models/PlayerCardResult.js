// models/PlayerCardResult.js
const mongoose = require('mongoose');

/**
 * PLAYER CARD RESULT MODEL
 * 
 * Contiene i risultati finali aggregati di una valutazione PlayerCard.
 * Si crea automaticamente quando una VotingSession di tipo 'player_card_rating' viene completata.
 * 
 * RESPONSABILITÀ:
 * - Memorizzare RISULTATI FINALI per un singolo giocatore (media attributi)
 * - Calcolare STATISTICHE aggregate (deviazioni, distribuzione voti)
 * - Fornire BREAKDOWN dettagliato per transparency
 * - Ottimizzare QUERY per analytics player profile
 * 
 * DIFFERENZA vs VoteResult:
 * - VoteResult: risultati per TUTTI i giocatori di una partita 
 * - PlayerCardResult: risultati per UN SINGOLO giocatore valutato
 */

const PlayerCardResultSchema = new mongoose.Schema({
    // === RIFERIMENTI ===

    votingSessionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VotingSession',
        required: true,
        index: true
    },

    targetPlayerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
        // ⭐ Per quale giocatore sono questi risultati finali
    },

    // === ATTRIBUTI FINALI AGGREGATI ===

    finalAttributes: {
        tir: {
            type: Number,
            min: 10,
            max: 100,
            required: true
        }, // Media di tutti i voti TIR
        pas: {
            type: Number,
            min: 10,
            max: 100,
            required: true
        }, // Media di tutti i voti PAS
        dri: {
            type: Number,
            min: 10,
            max: 100,
            required: true
        }, // Media di tutti i voti DRI
        fin: {
            type: Number,
            min: 10,
            max: 100,
            required: true
        }, // Media di tutti i voti FIN
        vis: {
            type: Number,
            min: 10,
            max: 100,
            required: true
        }, // Media di tutti i voti VIS
        res: {
            type: Number,
            min: 10,
            max: 100,
            required: true
        }, // Media di tutti i voti RES
        for: {
            type: Number,
            min: 10,
            max: 100,
            required: true
        },  // Media di tutti i voti FOR
        con: {
            type: Number,
            min: 10,
            max: 100,
            required: true
        },  // Media di tutti i voti CON
        int: {
            type: Number,
            min: 10,
            max: 100,
            required: true
        },  // Media di tutti i voti INT
        prt: {
            type: Number,
            min: 10,
            max: 100,
            required: true
        },  // Media di tutti i voti PRT
    },

    // === PIEDE DEBOLE E SKILL MOVES ⭐⭐⭐⭐⭐ ===

    finalAdditionalAttributes: {
        piedeDebole: {
            type: Number,
            min: 1,
            max: 5
        }, // Media piede debole
        skill: {
            type: Number,
            min: 1,
            max: 5
        }  // Media skill moves
    },

    // === ATTRIBUTI POR (opzionali ed ESCLUSIVI) ===

    goalkeeperAttributes: {
        tf: {
            type: Number,
            min: 10,
            max: 100,
            required: false,
        }, // Tuffo
        pr: {
            type: Number,
            min: 10,
            max: 100,
            required: false,
        }, // Presa
        rn: {
            type: Number,
            min: 10,
            max: 100,
            required: false,
        }, // Rinvio
        pz: {
            type: Number,
            min: 10,
            max: 100,
            required: false,
        }, // Piazzamento
        rf: {
            type: Number,
            min: 10,
            max: 100,
            required: false,
        }, // Riflessi
    },
    // === RATING FINALE ===

    finalOverallRating: {
        type: Number,
        min: 10,
        max: 100,
        required: true
        // Media di tutti gli overall rating calcolati
    },

    // === PROFILO CONSENSUALE ===

    consensusProfile: {
        mostVotedPosition: {
            type: String,
            enum: ['POR', 'DC', 'TS', 'TD', 'CC', 'CDC', 'COC', 'ED', 'ES', 'AT', 'AD', 'AS', 'ATT']
        },
        positionDistribution: {
            type: Map,
            of: Number
            // Es: { "CC": 5, "COC": 3, "CDC": 1 } - quanti voti per posizione
        }
    },

    // === METADATI SESSIONE ===

    sessionMetadata: {
        totalVoters: {
            type: Number,
            min: 0,
            required: true
        },
        sessionType: {
            type: String,
            enum: ['player_card_rating'],
            default: 'player_card_rating',
            required: true
        },
        calculatedAt: {
            type: Date,
            default: Date.now
        },
        completionRate: {
            type: Number,
            min: 0,
            max: 100
        }
    },

    // === STATISTICHE DETTAGLIATE ===

    statistics: {
        voteCount: {
            type: Number,
            required: true,
            min: 0
        },

        // Breakdown per ogni attributo
        attributeBreakdown: {
            tir: {
                average: Number,
                median: Number,
                standardDeviation: Number,
                min: Number,
                max: Number,
                distribution: {
                    '90-100': { type: Number, default: 0 },  // Voti eccellenti
                    '80-90': { type: Number, default: 0 },   // Voti ottimi  
                    '70-80': { type: Number, default: 0 },   // Voti buoni
                    '60-70': { type: Number, default: 0 },   // Voti discreti
                    '50-60': { type: Number, default: 0 },   // Voti sufficienti
                    'below-50': { type: Number, default: 0 } // Voti insufficienti
                }
            },
            pas: {
                average: Number,
                median: Number,
                standardDeviation: Number,
                min: Number,
                max: Number,
                distribution: {
                    '90-100': { type: Number, default: 0 },
                    '80-90': { type: Number, default: 0 },
                    '70-80': { type: Number, default: 0 },
                    '60-70': { type: Number, default: 0 },
                    '50-60': { type: Number, default: 0 },
                    'below-50': { type: Number, default: 0 }
                }
            },
            dri: {
                average: Number,
                median: Number,
                standardDeviation: Number,
                min: Number,
                max: Number,
                distribution: {
                    '90-100': { type: Number, default: 0 },
                    '80-90': { type: Number, default: 0 },
                    '70-80': { type: Number, default: 0 },
                    '60-70': { type: Number, default: 0 },
                    '50-60': { type: Number, default: 0 },
                    'below-50': { type: Number, default: 0 }
                }
            },
            fin: {
                average: Number,
                median: Number,
                standardDeviation: Number,
                min: Number,
                max: Number,
                distribution: {
                    '90-100': { type: Number, default: 0 },
                    '80-90': { type: Number, default: 0 },
                    '70-80': { type: Number, default: 0 },
                    '60-70': { type: Number, default: 0 },
                    '50-60': { type: Number, default: 0 },
                    'below-50': { type: Number, default: 0 }
                }
            },
            vis: {
                average: Number,
                median: Number,
                standardDeviation: Number,
                min: Number,
                max: Number,
                distribution: {
                    '90-100': { type: Number, default: 0 },
                    '80-90': { type: Number, default: 0 },
                    '70-80': { type: Number, default: 0 },
                    '60-70': { type: Number, default: 0 },
                    '50-60': { type: Number, default: 0 },
                    'below-50': { type: Number, default: 0 }
                }
            },
            res: {
                average: Number,
                median: Number,
                standardDeviation: Number,
                min: Number,
                max: Number,
                distribution: {
                    '90-100': { type: Number, default: 0 },
                    '80-90': { type: Number, default: 0 },
                    '70-80': { type: Number, default: 0 },
                    '60-70': { type: Number, default: 0 },
                    '50-60': { type: Number, default: 0 },
                    'below-50': { type: Number, default: 0 }
                }
            },
            for: {
                average: Number,
                median: Number,
                standardDeviation: Number,
                min: Number,
                max: Number,
                distribution: {
                    '90-100': { type: Number, default: 0 },
                    '80-90': { type: Number, default: 0 },
                    '70-80': { type: Number, default: 0 },
                    '60-70': { type: Number, default: 0 },
                    '50-60': { type: Number, default: 0 },
                    'below-50': { type: Number, default: 0 }
                }
            },
            con: {
                average: Number,
                median: Number,
                standardDeviation: Number,
                min: Number,
                max: Number,
                distribution: {
                    '90-100': { type: Number, default: 0 },
                    '80-90': { type: Number, default: 0 },
                    '70-80': { type: Number, default: 0 },
                    '60-70': { type: Number, default: 0 },
                    '50-60': { type: Number, default: 0 },
                    'below-50': { type: Number, default: 0 }
                }

            },
            int: {
                average: Number,
                median: Number,
                standardDeviation: Number,
                min: Number,
                max: Number,
                distribution: {
                    '90-100': { type: Number, default: 0 },
                    '80-90': { type: Number, default: 0 },
                    '70-80': { type: Number, default: 0 },
                    '60-70': { type: Number, default: 0 },
                    '50-60': { type: Number, default: 0 },
                    'below-50': { type: Number, default: 0 }
                }
            },
            prt: {
                average: Number,
                median: Number,
                standardDeviation: Number,
                min: Number,
                max: Number,
                distribution: {
                    '90-100': { type: Number, default: 0 },
                    '80-90': { type: Number, default: 0 },
                    '70-80': { type: Number, default: 0 },
                    '60-70': { type: Number, default: 0 },
                    '50-60': { type: Number, default: 0 },
                    'below-50': { type: Number, default: 0 }
                }
            },

            // Statistiche POR (opzionali)
            tf: {
                average: Number,
                median: Number,
                standardDeviation: Number,
                min: Number,
                max: Number,
                distribution: {
                    '90-100': { type: Number, default: 0 },
                    '80-90': { type: Number, default: 0 },
                    '70-80': { type: Number, default: 0 },
                    '60-70': { type: Number, default: 0 },
                    '50-60': { type: Number, default: 0 },
                    'below-50': { type: Number, default: 0 }
                }

            },
            pr: {
                average: Number,
                median: Number,
                standardDeviation: Number,
                min: Number,
                max: Number,
                distribution: {
                    '90-100': { type: Number, default: 0 },
                    '80-90': { type: Number, default: 0 },
                    '70-80': { type: Number, default: 0 },
                    '60-70': { type: Number, default: 0 },
                    '50-60': { type: Number, default: 0 },
                    'below-50': { type: Number, default: 0 }
                }
            },
            rn: {
                average: Number,
                median: Number,
                standardDeviation: Number,
                min: Number,
                max: Number,
                distribution: {
                    '90-100': { type: Number, default: 0 },
                    '80-90': { type: Number, default: 0 },
                    '70-80': { type: Number, default: 0 },
                    '60-70': { type: Number, default: 0 },
                    '50-60': { type: Number, default: 0 },
                    'below-50': { type: Number, default: 0 }
                }
            },
            pz: {
                average: Number,
                median: Number,
                standardDeviation: Number,
                min: Number,
                max: Number,
                distribution: {
                    '90-100': { type: Number, default: 0 },
                    '80-90': { type: Number, default: 0 },
                    '70-80': { type: Number, default: 0 },
                    '60-70': { type: Number, default: 0 },
                    '50-60': { type: Number, default: 0 },
                    'below-50': { type: Number, default: 0 }
                }
            },
            rf: {
                average: Number,
                median: Number,
                standardDeviation: Number,
                min: Number,
                max: Number,
                distribution: {
                    '90-100': { type: Number, default: 0 },
                    '80-90': { type: Number, default: 0 },
                    '70-80': { type: Number, default: 0 },
                    '60-70': { type: Number, default: 0 },
                    '50-60': { type: Number, default: 0 },
                    'below-50': { type: Number, default: 0 }
                }
            },

        },

        // Statistiche generali
        overallStats: {
            averageOverall: Number,
            medianOverall: Number,
            standardDeviationOverall: Number,
            confidence: { type: Number, min: 0, max: 1 }, // Affidabilità risultato
            consistencyScore: { type: Number, min: 0, max: 10 } // Coerenza voti
        }
    },

    // === METADATI CALCOLO ===

    calculationMethod: {
        type: String,
        enum: ['average', 'median', 'weighted_average'],
        default: 'average'
    },

    calculationParameters: {
        excludeOutliers: { type: Boolean, default: false },
        minimumVotesRequired: { type: Number, default: 1 }
    },

    dataVersion: {
        type: Number,
        default: 1
    },

    recalculatedAt: { type: Date },

    // === MODALITÀ DEMO ===
    // Player card calcolata della squadra dimostrativa pubblica.
    // Vedi Team.isDemo e DEMO_MODE_IMPLEMENTATION_PLAN.md §3.9
    isDemo: {
        type: Boolean,
        default: false,
        index: true
    }

}, {
    timestamps: true,

    index: [
        { votingSessionId: 1 },
        { targetPlayerId: 1, createdAt: -1 },
        { 'finalOverallRating': -1 },
        { 'sessionMetadata.sessionType': 1, createdAt: -1 },
        { 'finalAttributes.tir': -1 },
        { 'finalAttributes.pas': -1 }
    ]
});

// === METODI VIRTUALI ===
// TODO: Rendere funzioni dinamiche per trovare attributi più forti / deboli
PlayerCardResultSchema.virtual('grade').get(function () {
    const rating = this.finalOverallRating;
    if (rating >= 95) return 'A+';
    if (rating >= 90) return 'A';
    if (rating >= 85) return 'B+';
    if (rating >= 80) return 'B';
    if (rating >= 75) return 'C+';
    if (rating >= 70) return 'C';
    if (rating >= 60) return 'D';
    return 'F';
});

PlayerCardResultSchema.virtual('isElitePlayer').get(function () {
    return this.finalOverallRating >= 85 &&
        this.statistics.overallStats.confidence >= 0.8;
});

PlayerCardResultSchema.virtual('strongestAttribute').get(function () {
    const attrs = this.finalAttributes;
    let strongest = { name: 'tir', value: attrs.tir };

    Object.entries(attrs).forEach(([name, value]) => {
        if (value > strongest.value) {
            strongest = { name, value };
        }
    });

    return strongest;
});

PlayerCardResultSchema.virtual('weakestAttribute').get(function () {
    const attrs = this.finalAttributes;
    let weakest = { name: 'tir', value: attrs.tir };

    Object.entries(attrs).forEach(([name, value]) => {
        if (value < weakest.value) {
            weakest = { name, value };
        }
    });

    return weakest;
});

// === METODI STATICI ===

/**
 * Crea risultato PlayerCard da dati aggregati
 */
PlayerCardResultSchema.statics.createPlayerCardResult = function (sessionId, targetPlayerId, aggregatedData, totalVoters) {
    const { attributeStats, additionalAttributeStats, overallStats, positionStats } = aggregatedData;

    // Costruisce finalAttributes
    const finalAttributes = {};
    const attributeBreakdown = {};

    Object.keys(attributeStats).forEach(attr => {
        const stats = attributeStats[attr];
        finalAttributes[attr] = Math.round(stats.average);

        // Calcola distribuzione
        const distribution = {
            '90-100': 0, '80-90': 0, '70-80': 0,
            '60-70': 0, '50-60': 0, 'below-50': 0
        };

        stats.values.forEach(value => {
            if (value >= 90) distribution['90-100']++;
            else if (value >= 80) distribution['80-90']++;
            else if (value >= 70) distribution['70-80']++;
            else if (value >= 60) distribution['60-70']++;
            else if (value >= 50) distribution['50-60']++;
            else distribution['below-50']++;
        });

        attributeBreakdown[attr] = {
            average: stats.average,
            median: stats.median,
            standardDeviation: stats.standardDeviation,
            min: Math.min(...stats.values),
            max: Math.max(...stats.values),
            distribution
        };
    });

    // ⭐ COSTRUISCE finalAdditionalAttributes (STELLE)
    const finalAdditionalAttributes = {};
    if (additionalAttributeStats) {
        Object.keys(additionalAttributeStats).forEach(attr => {
            const stats = additionalAttributeStats[attr];
            if (stats.count > 0) {
                finalAdditionalAttributes[attr] = Math.round(stats.total / stats.count);
            } else {
                finalAdditionalAttributes[attr] = null;
            }
        });
    }

    // Trova posizione più votata
    let mostVotedPosition = null;
    let maxVotes = 0;
    const positionDistribution = new Map();

    if (positionStats && Object.keys(positionStats).length > 0) {
        Object.entries(positionStats).forEach(([position, count]) => {
            positionDistribution.set(position, count);
            if (count > maxVotes) {
                maxVotes = count;
                mostVotedPosition = position;
            }
        });
    }

    return new this({
        votingSessionId: sessionId,
        targetPlayerId: targetPlayerId,

        finalAttributes,
        finalAdditionalAttributes,  // ⭐ AGGIUNGO LE STELLE CALCOLATE
        finalOverallRating: Math.round(overallStats.average),

        consensusProfile: {
            mostVotedPosition,
            positionDistribution
        },

        sessionMetadata: {
            totalVoters,
            sessionType: 'player_card_rating',
            calculatedAt: new Date(),
            completionRate: 100
        },

        statistics: {
            voteCount: totalVoters,
            attributeBreakdown,
            overallStats: {
                averageOverall: overallStats.average,
                medianOverall: overallStats.median,
                standardDeviationOverall: overallStats.standardDeviation,
                confidence: overallStats.confidence || 0,
                consistencyScore: overallStats.consistencyScore || 0
            }
        },

        calculationMethod: 'average'
    });
};

/**
 * Legge risultati PlayerCard in formato compatibile
 */
PlayerCardResultSchema.methods.getPlayerCardResults = function () {
    if (this.sessionMetadata.sessionType !== 'player_card_rating') {
        return null;
    }

    return {
        targetPlayerId: this.targetPlayerId,
        sessionId: this.votingSessionId,

        finalAttributes: this.finalAttributes,
        // ⭐ AGGIUNGO LE STELLE NELLA RISPOSTA API
        finalAdditionalAttributes: this.finalAdditionalAttributes,
        goalkeeperAttributes: this.goalkeeperAttributes,
        finalOverallRating: this.finalOverallRating,
        grade: this.grade,

        profile: this.consensusProfile,

        statistics: {
            voteCount: this.statistics.voteCount,
            breakdown: this.statistics.attributeBreakdown,
            overall: this.statistics.overallStats
        },
        highlights: {
            strongest: this.strongestAttribute,
            weakest: this.weakestAttribute,
            isElite: this.isElitePlayer
        },
        metadata: {
            calculatedAt: this.sessionMetadata.calculatedAt,
            totalVoters: this.sessionMetadata.totalVoters,
            confidence: this.statistics.overallStats.confidence
        },
    };
};

/**
 * Trova risultato per giocatore specifico
 */
PlayerCardResultSchema.statics.findByPlayerAndSession = function (targetPlayerId, sessionId) {
    return this.findOne({
        targetPlayerId: targetPlayerId,
        votingSessionId: sessionId,
        'sessionMetadata.sessionType': 'player_card_rating'
    });
};

/**
 * Top players per attributo
 */
PlayerCardResultSchema.statics.getTopPlayersByAttribute = function (attributeName, limit = 10) {
    const sortField = `finalAttributes.${attributeName}`;
    return this.find({ 'sessionMetadata.sessionType': 'player_card_rating' })
        .sort({ [sortField]: -1 })
        .limit(limit)
        .populate('targetPlayerId', 'name');
};

/**
 * Confronta due giocatori
 */
PlayerCardResultSchema.statics.comparePlayerCards = async function (playerId1, playerId2) {
    const [player1, player2] = await Promise.all([
        this.findOne({ targetPlayerId: playerId1 }).sort({ createdAt: -1 }),
        this.findOne({ targetPlayerId: playerId2 }).sort({ createdAt: -1 })
    ]);

    if (!player1 || !player2) return null;

    const comparison = {};
    Object.keys(player1.finalAttributes).forEach(attr => {
        comparison[attr] = {
            player1: player1.finalAttributes[attr],
            player2: player2.finalAttributes[attr],
            difference: player1.finalAttributes[attr] - player2.finalAttributes[attr]
        };
    });

    return {
        player1: player1.getPlayerCardResults(),
        player2: player2.getPlayerCardResults(),
        attributeComparison: comparison,
        overallDifference: player1.finalOverallRating - player2.finalOverallRating
    };
};

// === POST-SAVE HOOK ===
// ⭐ AGGIORNA AUTOMATICAMENTE LE STATISTICHE LEADERBOARD PLAYERCARD
PlayerCardResultSchema.post('save', async function (doc) {
    // 🔄 RETRY LOGIC per robustezza
    const MAX_RETRIES = 3;
    let lastError;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            console.log(`🃏 PlayerCardResult salvato - sincronizzazione leaderboard (tentativo ${attempt}/${MAX_RETRIES})`);

            // Import PlayerLeaderboardStats (deve essere fatto qui per evitare circular dependencies)
            const PlayerLeaderboardStats = mongoose.model('PlayerLeaderboardStats');
            const VotingSession = mongoose.model('VotingSession');
            const User = mongoose.model('User');

            // 🔧 RECUPERA DATI MANCANTI tramite populate
            const session = await VotingSession.findById(doc.votingSessionId).populate('teamId');
            const targetPlayer = await User.findById(doc.targetPlayerId);

            if (!session || !targetPlayer) {
                console.error(`❌ Sessione o giocatore non trovato per leaderboard update - Player: ${doc.targetPlayerId}, Session: ${doc.votingSessionId}`);
                return;
            }

            // Aggiorna statistiche playercard per il giocatore target
            const updateData = {
                teamId: session.teamId._id,
                playerName: targetPlayer.name,
                playercard: {
                    totalEvaluations: 1,
                    overallRating: doc.finalOverallRating,
                    bestRating: doc.finalOverallRating,
                    worstRating: doc.finalOverallRating,
                    attributes: {
                        tir: doc.finalAttributes.tir,
                        pas: doc.finalAttributes.pas,
                        dri: doc.finalAttributes.dri,
                        fin: doc.finalAttributes.fin,
                        vis: doc.finalAttributes.vis,
                        res: doc.finalAttributes.res,
                        for: doc.finalAttributes.for
                    },
                    positions: doc.consensusProfile.mostVotedPosition ? [doc.consensusProfile.mostVotedPosition] : []
                },
                form: {
                    recentEvaluations: [doc.finalOverallRating],
                    playerCardTrend: 1 // 1 nuova valutazione
                }
            };

            await PlayerLeaderboardStats.updateStats(doc.targetPlayerId, updateData);
            console.log(`✅ Statistiche leaderboard sincronizzate per ${targetPlayer.name} (TOT: ${doc.finalOverallRating})`);

            // Se arriviamo qui, l'aggiornamento è riuscito
            return;

        } catch (error) {
            lastError = error;
            console.error(`❌ Tentativo ${attempt}/${MAX_RETRIES} fallito per PlayerCardResult sync:`, {
                playerId: doc.targetPlayerId,
                sessionId: doc.votingSessionId,
                overallRating: doc.finalOverallRating,
                error: error.message
            });

            // Se non è l'ultimo tentativo, aspetta prima di riprovare
            if (attempt < MAX_RETRIES) {
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Backoff progressivo
            }
        }
    }

    // Se tutti i tentativi sono falliti, logga errore critico
    console.error(`🚨 CRITICO: Sincronizzazione PlayerCardResult fallita dopo ${MAX_RETRIES} tentativi:`, {
        playerId: doc.targetPlayerId,
        sessionId: doc.votingSessionId,
        finalOverallRating: doc.finalOverallRating,
        lastError: lastError?.message
    });
});

module.exports = mongoose.model('PlayerCardResult', PlayerCardResultSchema);