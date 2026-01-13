// 🎯 REPOSITORY PATTERN - Accesso dati tramite Repository
const {
    VotingSessionRepository,
    VoteSubmissionRepository,
    VoteResultRepository,
    MatchRepository,
    TeamRepository,
    UserRepository,
    PlayerLeaderboardStatsRepository
} = require('../repositories');

const NewsService = require('./NewsService');

/**
 * VotingService - Business Logic Layer per Gestione Votazioni
 * 
 * 🔄 AGGIORNATO CON REPOSITORY PATTERN:
 * - Non accede più direttamente ai Model Mongoose
 * - Usa Repository per separare data access da business logic
 * - Più testabile e modulare
 * 
 * Responsabilità:
 * - Validation business rules votazioni
 * - Processing voti e badge mapping
 * - Auto-completion logic (senza mock objects)
 * - Calcolo risultati e aggregazioni
 * - Gestione statistiche giocatori
 */
class VotingService {

    /**
     * 🏗️ Costruttore - Inizializza i repository
     */
    constructor() {
        // Inizializza i repository per accesso dati
        this.votingSessionRepository = new VotingSessionRepository();
        this.voteSubmissionRepository = new VoteSubmissionRepository();
        this.voteResultRepository = new VoteResultRepository();
        this.matchRepository = new MatchRepository();
        this.teamRepository = new TeamRepository();
        this.userRepository = new UserRepository();
        this.playerStatsRepository = new PlayerLeaderboardStatsRepository();
        this.newsService = new NewsService();
    }

    // ====================
    // 1. VALIDATION METHODS
    // ====================



    /**
     * Valida rating giocatore (range 1-10)
     * @param {number} rating - Rating da validare
     * @throws {Error} Se rating non valido
     */
    validateVoteRating(rating) {
        if (!rating || typeof rating !== 'number') {
            throw new Error('Rating is required and must be a number');
        }

        if (rating < 1 || rating > 10) {
            throw new Error(`Invalid rating ${rating}. Must be between 1 and 10.`);
        }
    }

    /**
     * Valida e mappa badge da frontend a database
     * @param {Array} frontendBadges - Badge dal frontend
     * @returns {Array} Badge mappati per database
     */
    validateBadgeMapping(frontendBadges) {
        if (!Array.isArray(frontendBadges)) {
            return [];
        }

        const badgeMapping = {
            'gol_piu_bello': 'gol_bello',
            'muro_difensivo': 'difensore',
            'assist_man': 'assist_man',
            'mvp': 'mvp',
            'maratoneta': 'maratoneta',
            'uomo_partita': 'mvp',
            'goleador': 'goleador'
        };

        const validBadges = ['mvp', 'goleador', 'assist_man', 'difensore', 'maratoneta', 'gol_bello'];
        const mappedBadges = [];

        frontendBadges.forEach(frontendBadgeType => {
            const dbBadgeType = badgeMapping[frontendBadgeType] || frontendBadgeType;

            if (validBadges.includes(dbBadgeType)) {
                mappedBadges.push(dbBadgeType);
                console.log(`✅ Badge mappato: ${frontendBadgeType} -> ${dbBadgeType}`);
            } else {
                console.log(`⚠️ Badge sconosciuto ignorato: ${frontendBadgeType} -> ${dbBadgeType}`);
            }
        });

        return mappedBadges;
    }

    // ========================
    // 2. SESSION MANAGEMENT  
    // ========================

    /**
     * Crea nuova sessione votazione match rating
     * @param {Object} userData - Dati utente richiedente
     * @param {Object} sessionData - Dati sessione
     * @returns {Object} Sessione creata
     */
    async createVotingSession(userData, sessionData) {
        console.log('\n📝 === CREATE VOTING SESSION (SERVICE) ===');
        console.log('👤 User ID:', userData.id);
        console.log('📋 Session Data:', sessionData);

        const { targetId, title, description, deadline } = sessionData;

        // 1. Validation campi obbligatori
        if (!targetId) {
            throw new Error('targetId (matchId) is required');
        }

        if (!userData || !userData.id) {
            throw new Error('User data is required');
        }

        // 2. Verifica che la partita esista
        // 🎯 USA REPOSITORY invece di Model diretto
        const match = await this.matchRepository.findById(targetId);
        if (!match) {
            throw new Error('Match not found');
        }

        // 3. Verifica che il team esista
        const team = await this.teamRepository.findById(match.teamId);
        if (!team) {
            throw new Error('Team not found');
        }


        // 4. Business rules per creazione sessione
        const votingSession = await this.votingSessionRepository.create({
            type: 'match_rating',
            targetId: match._id,
            teamId: match.teamId,
            createdBy: userData.id,
            title: title || `Vota la partita vs ${match.opponent}`,
            description: description || `Valuta le prestazioni dei tuoi compagni nella partita del ${match.date ? new Date(match.date).toLocaleDateString('it-IT') : 'oggi'}`,
            deadline: deadline ? new Date(deadline) : null,
            eligibleVoters: team.memberIds, // Business rule: team members can vote

            status: 'active', // Business rule: match rating sessions are immediately active
            voteConfig: {
                ratingRange: { min: 1, max: 10, step: 0.5 },
                allowBadges: true,
                requiredFields: ['rating'],
                allowComments: true
            },
            field: match.field,
            date: match.date,
            playersCount: match.playersCount
        });

        console.log('✅ Voting Session creata:', votingSession._id);
        console.log('📝 === FINE CREATE VOTING SESSION (SERVICE) ===\n');

        // 4.1. Recupera i nomi degli utenti partecipanti e astenuti per la sessione (se ci sono)
        const userNames = await this.votingSessionRepository.findByIdWithUsernames(votingSession._id);


        // 5. Restituisce sessione con match info per response
        return {
            session: votingSession,
            matchInfo: {
                field: match.field,
                date: match.date,
                teamId: match.teamId,
                playersCount: match.playersCount
            },
            eligibleVoters: userNames.eligibleVoters,
            abstainedUsers: userNames.abstainedUsers
        };
    }

    /**
     * Verifica autorizzazione utente per sessione
     * @param {string} sessionId - ID sessione
     * @param {string} userId - ID utente  
     * @returns {Object} Sessione se autorizzato
     * @throws {Error} Se non autorizzato
     */
    async checkSessionAuthorization(sessionId, userId) {
        if (!sessionId) {
            throw new Error('Session ID is required');
        }

        if (!userId) {
            throw new Error('User ID is required');
        }

        // 1. Trova la sessione di votazione
        // 🎯 USA REPOSITORY invece di Model diretto
        const session = await this.votingSessionRepository.findById(sessionId);
        if (!session) {
            throw new Error('Voting session not found');
        }

        // 2. Validazioni specifiche per match rating
        if (session.type !== 'match_rating') {
            throw new Error('Invalid session type');
        }

        if (session.status !== 'active') {
            throw new Error('Voting session is not active');
        }

        if (!session.eligibleVoters.includes(userId)) {
            throw new Error('User not eligible to vote');
        }

        // NUOVO: Controlla se l'utente è astenuto
        if (session.isUserAbstained(userId)) {
            throw new Error('User is abstained from this voting session');
        }

        // 3. Controlla se ha già votato
        // 🎯 USA REPOSITORY con metodo specifico
        const existingVote = await this.voteSubmissionRepository.findBySessionAndUser(sessionId, userId);

        if (existingVote && existingVote.isActive) {
            throw new Error('User has already voted');
        }

        console.log(`✅ Autorizzazione verificata per user ${userId} nella sessione ${sessionId}`);

        // Restituisce la sessione se tutte le verifiche passano
        return session;
    }

    // ====================
    // 3. VOTE PROCESSING
    // ====================

    /**
     * Processa submission voto completa
     * @param {string} sessionId - ID sessione
     * @param {string} userId - ID utente votante
     * @param {Object} voteData - Dati voto
     * @returns {Object} Risultato submission con auto-completion info
     */
    async submitVote(sessionId, userId, voteData) {
        console.log('\n🟣 === SUBMIT VOTE (SERVICE) ===');
        console.log('📋 Session ID:', sessionId);
        console.log('👤 User ID:', userId);

        try {

            // 0.5. Recupera nome del votante per miglior logging
            const voter = await this.userRepository.findById(userId);
            if (voter) {
                console.log('👤 Voter Name:', voter.name);
            }

            // 1. Verifica autorizzazione (include tutte le validazioni di sessione)
            const session = await this.checkSessionAuthorization(sessionId, userId);

            // 2. Trasforma dati dal frontend al formato database  
            console.log('🔄 Trasformando dati voto...');
            const transformedVoteData = this.transformVoteData(voteData);

            console.log('📤 Dati trasformati:', {
                playerRatingsCount: transformedVoteData.playerRatings.length,
                badgesCount: transformedVoteData.badges.length,
                hasComment: !!transformedVoteData.overallComment
            });

            // 3. Crea e salva il voto
            const newVote = await this.voteSubmissionRepository.create({
                votingSessionId: session._id,
                voterId: userId,
                voteData: transformedVoteData,
                deviceInfo: voteData.deviceInfo || {},
                timeSpent: voteData.timeSpent || 0,
                version: 1,
                isActive: true,
                validated: false
            });

            console.log('✅ Voto salvato nel database');

            // 4. Controlla auto-completion DOPO aver salvato il voto
            console.log('🎯 Verificando auto-completion...');
            const autoCompletionResult = await this.checkAutoCompletion(session._id);

            // 5. Aggiorna statistiche sessione DOPO auto-complete
            await session.updateSummary();

            console.log('🟣 === FINE SUBMIT VOTE (SERVICE) ===\n');


            // 6. Restituisce risultato completo per il controller
            return {
                success: true,
                submission: {
                    id: newVote._id,
                    submittedAt: newVote.createdAt,
                    type: 'match_rating',
                    playersRated: transformedVoteData.playerRatings.length,
                    badgesAwarded: transformedVoteData.badges.length,
                    voterInfo: voter ? {
                        id: voter._id,
                        name: voter.name
                    } : { id: userId }
                },
                autoCompletion: autoCompletionResult,
                message: autoCompletionResult.autoCompleted
                    ? 'Voto salvato e sessione completata automaticamente!'
                    : 'Voto salvato con successo'
            };

        } catch (error) {
            console.log('❌ ERRORE SUBMIT VOTE (SERVICE):', error.message);
            console.log('🟣 === FINE SUBMIT VOTE (SERVICE - ERRORE) ===\n');

            // Re-throw l'errore per il controller
            throw error;
        }
    }

    /**
     * Verifica se sessione deve auto-completarsi
     * @param {string} sessionId - ID sessione
     * @returns {boolean} True se auto-completed
     */
    async checkAutoCompletion(sessionId) {
        try {
            console.log('🔍 === CHECK AUTO-COMPLETION ===');
            console.log('📊 Session ID:', sessionId);

            if (!sessionId) {
                console.log('⚠️ SessionId mancante, skip auto-complete');
                return false;
            }

            // 1. Trova la sessione
            const session = await this.votingSessionRepository.findById(sessionId, {
                populate: [{ path: 'targetId', select: 'field teamId playersCount teamMemberIds date' }]
            });

            // 🔍 DEBUG POPULATE
            console.log('🔍 DEBUG session.targetId dopo populate:', session.targetId);
            console.log('🔍 DEBUG tipo di session.targetId:', typeof session.targetId);
            console.log('🔍 DEBUG session.targetId è ObjectId?', session.targetId instanceof require('mongoose').Types.ObjectId);

            // 🔧 STEP 2: POPULATE MANUALE SE FALLISCE
            if (session && session.targetId instanceof require('mongoose').Types.ObjectId && session.type === 'match_rating') {
                console.log('🔧 Populate automatica fallita, provo populate manuale per Match...');
                try {
                    const Match = require('../models/Match');
                    const matchData = await Match.findById(session.targetId).select('field teamId playersCount teamMemberIds date');
                    if (matchData) {
                        console.log('✅ Match data recuperato manualmente:', matchData);
                        // Sostituisci l'ObjectId con l'oggetto popolato
                        session.targetId = matchData;
                    }
                } catch (error) {
                    console.log('❌ Errore nel populate manuale:', error.message);
                }
            }

            if (!session || session.status !== 'active') {
                console.log('⚠️ Sessione non trovata o non attiva, skip auto-complete');
                return false;
            }

            // 2. Aggiorna il summary (che include la logica degli astenuti e auto-completion)
            await session.updateSummary();

            // Calcola utenti attivi per il log
            const activeVotersCount = session.eligibleVoters.length - session.abstainedUsers.length;
            console.log(`📊 Voti raccolti: ${session.summary.totalSubmissions}/${activeVotersCount}`);

            // 3. Verifica se la sessione è stata completata automaticamente dal updateSummary()
            if (session.status === 'completed') {
                console.log('🎉 SESSIONE COMPLETATA AUTOMATICAMENTE!');

                try {
                    // 4. Procedi con elaborazione risultati
                    const completionResult = await this.completeSession(sessionId, 'automatic');

                    console.log('✅ Auto-complete completato con successo!');
                    console.log('📊 Tipo di campo da gioco:', completionResult.playersCount);
                    console.log('🗳️ Votanti totali:', completionResult.votersCount);

                    const team = await this.teamRepository.findById(session.teamId);
                    const teamName = team?.name || 'La squadra';

                    // 5. RECUPERA DATI MATCH MANUALMENTE per news generation
                    const match = await this.matchRepository.findById(session.targetId);
                    if (!match) {
                        console.error('⚠️ Match non trovato per news generation');
                        return { success: false, error: 'Match not found for news generation' };
                    }

                    console.log('📍 Dati Match per news:', {
                        field: match.field,
                        playersCount: match.playersCount,
                        teamMemberIds: match.teamMemberIds?.length || 'undefined'
                    });

                    // 6. CREA NOTIZIA DI MATCH COMPLETED 

                    await this.newsService.createNewsOnCompleteMatch({
                        matchId: session.targetId,
                        teamId: session.teamId,
                        teamName: teamName,
                        teamMemberIds: match.teamMemberIds,
                        playersCount: match.playersCount, // campo da gioco (5,8,11)
                        field: match.field,
                        date: match.date,
                        totalGoals: Object.values(completionResult.officialResults).reduce((sum, p) => sum + (p.goals || 0), 0),
                        totalAssists: Object.values(completionResult.officialResults).reduce((sum, p) => sum + (p.assists || 0), 0),
                        playerCards: Object.entries(completionResult.officialResults).map(([id, stats]) => ({
                            playerId: id,
                            name: stats.playerName,
                            averageRating: stats.averageRating,
                            goals: stats.goals || 0,
                            assists: stats.assists || 0,
                            badges: stats.badges || []
                        }))
                    }).catch(err => console.error('⚠️ Errore news:', err.message));


                    return {
                        autoCompleted: true,
                        completionResult: completionResult,
                        message: 'Sessione completata automaticamente!'
                    };


                } catch (error) {
                    console.error('❌ Errore durante auto-complete:', error.message);

                    // Restituiamo l'errore ma non blocchiamo il flusso principale
                    return {
                        autoCompleted: false,
                        error: error.message,
                        message: 'Errore durante auto-completion'
                    };
                }
            }

            console.log('⏳ Non tutti hanno ancora votato, nessun auto-complete');
            return {
                autoCompleted: false,
                submissionsCount: session.summary.totalSubmissions,
                totalEligibleVoters: activeVotersCount,
                message: `Attendendo altri voti: ${session.summary.totalSubmissions}/${activeVotersCount}`
            };

        } catch (error) {
            console.error('❌ ERRORE CHECK AUTO-COMPLETION:', error.message);
            return {
                autoCompleted: false,
                error: error.message,
                message: 'Errore durante verifica auto-completion'
            };
        }
    }

    /**
     * Trasforma dati voto da frontend a formato database
     * @param {Object} frontendVoteData - Dati dal frontend
     * @returns {Object} Dati trasformati per database
     */
    transformVoteData(frontendVoteData) {
        if (!frontendVoteData || typeof frontendVoteData !== 'object') {
            throw new Error('Frontend vote data is required and must be an object');
        }

        const transformedVoteData = {
            playerRatings: [],
            badges: [],
            overallComment: frontendVoteData.matchComments || ''
        };

        // Trasforma playerRatings da oggetto ad array
        if (frontendVoteData.playerRatings) {
            Object.entries(frontendVoteData.playerRatings).forEach(([playerId, playerData]) => {
                // Validazione rating usando il metodo che abbiamo testato
                this.validateVoteRating(playerData.rating);

                transformedVoteData.playerRatings.push({
                    playerId: playerId,
                    rating: playerData.rating,
                    goals: Math.max(0, playerData.goals || 0),
                    assists: Math.max(0, playerData.assists || 0),
                    comment: playerData.comments || ''
                });

                // Aggiungi badges per questo giocatore usando il metodo testato
                if (playerData.badges && playerData.badges.length > 0) {
                    const mappedBadges = this.validateBadgeMapping(playerData.badges);

                    mappedBadges.forEach(dbBadgeType => {
                        transformedVoteData.badges.push({
                            playerId: playerId,
                            badgeType: dbBadgeType
                        });
                    });
                }
            });
        }

        return transformedVoteData;
    }

    /**
     * Calcola grade da rating
     * @param {number} rating - Rating medio
     * @returns {string} Grade letter
     */
    calculateGrade(rating) {
        if (rating >= 9.5) return 'A+';
        if (rating >= 9.0) return 'A';
        if (rating >= 8.5) return 'B+';
        if (rating >= 8.0) return 'B';
        if (rating >= 7.5) return 'C+';
        if (rating >= 7.0) return 'C';
        if (rating >= 6.0) return 'D';
        return 'F';
    }

    // ==========================
    // 4. RESULTS CALCULATION
    // ==========================

    /**
     * Calcola risultati votazione per sessione
     * @param {string} sessionId - ID sessione
     * @returns {Object} Risultati calcolati
     */
    /**
 * Calcola risultati votazione per sessione
 * @param {string} sessionId - ID sessione
 * @returns {Object} Risultati calcolati
 */
    async calculateVotingResults(sessionId) {
        console.log('\n🧮 === CALCULATE VOTING RESULTS (SERVICE) ===');
        console.log('📊 Session ID:', sessionId);

        if (!sessionId) {
            throw new Error('Session ID is required');
        }

        // 1. Verifica che la sessione esista e sia match_rating
        const session = await this.votingSessionRepository.findById(sessionId);
        if (!session) {
            throw new Error('Voting session not found');
        }

        if (session.type !== 'match_rating') {
            throw new Error('Invalid session type');
        }

        // 2. Se la sessione è completed, cerca risultati ufficiali
        if (session.status === 'completed') {
            const officialResult = await this.voteResultRepository.findBySessionType(
                sessionId,
                'match_rating'
            );

            if (officialResult) {
                console.log('📊 Restituendo risultati match rating ufficiali salvati');
                const savedResults = officialResult.getMatchRatingResults();
                if (savedResults) {
                    return {
                        calculation: savedResults,
                        isOfficial: true,
                        completedAt: savedResults.calculatedAt
                    };
                }
            }
        }

        // 3. Calcola risultati live
        console.log('🔄 Calcolando risultati match rating al volo per sessione', session.status);

        const submissions = await this.voteSubmissionRepository.findAll({
            filter: {
                votingSessionId: sessionId,
                isActive: true
            },
            populate: [{ path: 'voterId', select: 'name' }]
        });

        if (submissions.length === 0) {
            throw new Error('No votes found for this session');
        }

        // 4. Usa il metodo esistente per aggregazione
        const playerResults = await this.aggregatePlayerStats(submissions);

        console.log('✅ Calcoli match rating live completati per', Object.keys(playerResults).length, 'giocatori');
        console.log('🧮 === FINE CALCULATE VOTING RESULTS (SERVICE) ===\n');

        return {
            calculation: {
                playerResults: playerResults,
                totalVoters: submissions.length,
                sessionId: sessionId
            },
            isOfficial: false,
            calculatedAt: new Date()
        };
    }

    /**
     * Aggrega statistiche giocatori da submissions
     * @param {Array} submissions - Lista submissions
     * @returns {Object} Stats aggregate per player
     */
    async aggregatePlayerStats(submissions) {
        if (!Array.isArray(submissions) || submissions.length === 0) {
            throw new Error('Valid submissions array is required');
        }

        const playerStats = {};
        const playerNames = {}; // Cache per i nomi dei giocatori

        // Aggrega tutti i dati dai submissions
        submissions.forEach(submission => {
            const voterId = submission.voterId._id.toString();

            submission.voteData.playerRatings.forEach(playerRating => {
                const playerId = playerRating.playerId.toString();

                if (!playerStats[playerId]) {
                    playerStats[playerId] = {
                        ratings: [],
                        selfReportedGoals: 0,
                        selfReportedAssists: 0,
                        badges: []
                    };
                }

                playerStats[playerId].ratings.push(playerRating.rating);

                // Se il votante sta votando se stesso, salva goals/assists
                if (voterId === playerId) {
                    playerStats[playerId].selfReportedGoals = playerRating.goals || 0;
                    playerStats[playerId].selfReportedAssists = playerRating.assists || 0;
                }
            });

            // Aggrega badges
            submission.voteData.badges?.forEach(badge => {
                const playerId = badge.playerId.toString();
                if (!playerStats[playerId]) {
                    playerStats[playerId] = {
                        ratings: [],
                        selfReportedGoals: 0,
                        selfReportedAssists: 0,
                        badges: []
                    };
                }
                playerStats[playerId].badges.push(badge.badgeType);
            });
        });

        // Recupera i nomi dei giocatori - VERSIONE BATCH EFFICIENTE
        const playerIds = Object.keys(playerStats);


        if (playerIds.length > 0) {
            try {
                // UNA SOLA QUERY per tutti i giocatori invece di N query
                const players = await this.userRepository.findAll({
                    _id: { $in: playerIds }
                }, {
                    select: 'name'
                });

                // Mappa i risultati
                players.forEach(player => {
                    playerNames[player._id.toString()] = player.name;
                });

                // Fallback per giocatori non trovati
                playerIds.forEach(playerId => {
                    if (!playerNames[playerId]) {
                        playerNames[playerId] = `Player ${playerId.substring(0, 8)}`;
                        console.log(`⚠️ Player non trovato, uso fallback: ${playerId}`);
                    }
                });

            } catch (error) {
                console.error('❌ Errore recupero nomi giocatori:', error.message);
                // Fallback completo se query fallisce
                playerIds.forEach(playerId => {
                    playerNames[playerId] = `Player ${playerId.substring(0, 8)}`;
                });
            }
        }

        // Calcola risultati finali con statistiche avanzate
        const finalResults = {};
        Object.keys(playerStats).forEach(playerId => {
            const stats = playerStats[playerId];
            const voteCount = stats.ratings.length;

            if (voteCount > 0) {
                const ratings = stats.ratings;
                const average = ratings.reduce((sum, r) => sum + r, 0) / voteCount;

                const sortedRatings = [...ratings].sort((a, b) => a - b);
                const median = sortedRatings.length % 2 === 0
                    ? (sortedRatings[Math.floor(sortedRatings.length / 2) - 1] + sortedRatings[Math.floor(sortedRatings.length / 2)]) / 2
                    : sortedRatings[Math.floor(sortedRatings.length / 2)];

                finalResults[playerId] = {
                    playerId: playerId,
                    playerName: playerNames[playerId] || `Player ${playerId.substring(0, 8)}`,
                    averageRating: parseFloat(average.toFixed(1)),
                    medianRating: parseFloat(median.toFixed(1)),
                    goals: stats.selfReportedGoals,
                    assists: stats.selfReportedAssists,
                    voteCount: voteCount,
                    badges: [...new Set(stats.badges)]
                };
            }
        });
        return finalResults;
    }

    /**
     * Salva risultati ufficiali in VoteResult
     * @param {string} sessionId - ID sessione  
     * @param {Object} results - Risultati da salvare
     * @returns {Object} VoteResult salvato
     */
    async saveOfficialResults(sessionId, results) {
        // TODO: Implementare salvataggio risultati
    }

    // ======================
    // 5. COMPLETION & STATS
    // ======================

    /**
     * Completa sessione votazione e aggiorna stats
     * @param {string} sessionId - ID sessione
     * @param {string} completionType - 'manual' | 'automatic'
     * @returns {Object} Risultati completion
     */
    async completeSession(sessionId, completionType = 'manual') {
        if (!sessionId) {
            throw new Error('Session ID is required');
        }


        // 1. Verifica che la sessione esista e sia match_rating
        const session = await this.votingSessionRepository.findById(sessionId);
        if (!session) {
            throw new Error('Voting session not found');
        }

        if (session.type !== 'match_rating') {
            throw new Error('Invalid session type');
        }

        // 2. Se già completed, restituisci risultati esistenti
        if (session.status === 'completed') {
            const existingResult = await this.voteResultRepository.findBySessionType(
                sessionId,
                'match_rating'
            );

            if (existingResult) {
                return {
                    success: true,
                    message: 'Session already completed',
                    alreadyCompleted: true,
                    completedAt: session.completedAt,
                    officialResults: existingResult.matchRatingResults || {}
                };
            }
        }

        // 3. Calcola risultati finali
        const submissions = await this.voteSubmissionRepository.findAll(
            {
                votingSessionId: sessionId,
                isActive: true
            },
            {
                populate: [{ path: 'voterId', select: 'name' }]
            }
        );

        if (submissions.length === 0) {
            throw new Error('Cannot complete session with no votes');
        }

        // 4. Aggrega risultati usando il metodo esistente
        const finalResults = await this.aggregatePlayerStats(submissions);

        // 5. Salva risultati ufficiali con struttura corretta VoteResult
        const voteResultData = {
            votingSessionId: sessionId,
            matchRatingResults: new Map(),
            sessionMetadata: {
                totalVoters: submissions.length,
                sessionType: 'match_rating',
                calculatedAt: new Date(),
                playersCount: Object.keys(finalResults).length,
                completionRate: 100
            },
            statistics: {
                voteCount: submissions.length,
                overallAverageRating: 0,
                totalGoalsReported: 0,
                totalAssistsReported: 0,
                ratingDistribution: {
                    '9-10': 0,
                    '8-9': 0,
                    '7-8': 0,
                    '6-7': 0,
                    '5-6': 0,
                    'below-5': 0
                },
                badgesSummary: {
                    mvp: 0,
                    goleador: 0,
                    assist_man: 0,
                    difensore: 0,
                    maratoneta: 0,
                    gol_bello: 0
                }
            },
            calculationMethod: 'average'
        };

        // Popola matchRatingResults e statistiche
        let totalRating = 0;
        for (const [playerId, playerStats] of Object.entries(finalResults)) {
            const avgRating = playerStats.averageRating || 6;
            voteResultData.matchRatingResults.set(playerId, {
                playerId: playerId,
                averageRating: avgRating,
                medianRating: avgRating,
                goals: playerStats.goals || 0,
                assists: playerStats.assists || 0,
                voteCount: playerStats.voteCount || 1,
                badges: playerStats.badges || [],
                grade: this.calculateGrade(avgRating)
            });
            totalRating += avgRating;
        }

        voteResultData.statistics.overallAverageRating = totalRating / Object.keys(finalResults).length;

        const voteResult = await this.voteResultRepository.create(voteResultData);

        // 6. Aggiorna player statistics
        await this.updatePlayerStatistics(finalResults);

        // 🧹 CACHE INVALIDATION: Pulisci cache dopo aggiornamento statistiche
        try {
            const CacheService = require('./CacheService');
            const teamId = session.teamId;
            const votedPlayerIds = Object.keys(finalResults);

            await CacheService.invalidateAllAfterVote(teamId, votedPlayerIds);
        } catch (cacheError) {
            console.error('⚠️ Errore invalidazione cache post-voto:', cacheError.message);
            // Non blocchiamo il flusso principale per errori cache
        }

        // 7. Aggiorna session status
        session.status = 'completed';
        session.completedAt = new Date();
        session.completionType = completionType;
        await this.votingSessionRepository.updateById(session._id, {
            status: 'completed',
            completedAt: new Date(),
            completionType: completionType
        });

        // 8. Aggiorna Match status per coerenza
        try {
            const match = await this.matchRepository.findById(session.targetId);
            if (match && match.status === 'active') {
                await this.matchRepository.updateById(match._id, { status: 'completed' });
                console.log('✅ Match status aggiornato a completed');
            }
        } catch (error) {
            console.log('⚠️ Errore aggiornamento Match status:', error.message);
            // Non blocchiamo il flusso principale
        }

        console.log('✅ Session completata e risultati salvati');
        console.log('📊 Giocatori elaborati:', Object.keys(finalResults).length);
        console.log('🗳️ Votanti totali:', submissions.length);

        // 9. Leggi risultati salvati per il return
        const savedResults = finalResults; // Ora abbiamo già i risultati aggregati

        return {
            success: true,
            message: 'Session completed successfully',
            completedAt: new Date(),
            completionType: completionType,
            officialResults: savedResults,
            voteResultId: voteResult._id,
            playersCount: Object.keys(finalResults).length,
            votersCount: submissions.length
        };
    }

    /**
     * Aggiorna statistiche best/worst rating giocatori
     * @param {Object} results - Risultati finali per aggiornamento stats
     */
    async updatePlayerStatistics(results) {
        if (!results || typeof results !== 'object') {
            throw new Error('Valid results object is required');
        }

        console.log('🔄 Aggiornamento best/worst rating...');

        for (const [playerId, playerResults] of Object.entries(results)) {
            try {
                const playerStats = await this.playerStatsRepository.findOne({ playerId: playerId });
                if (!playerStats) {
                    console.log(`⚠️ PlayerStats non trovato per player ${playerId}`);
                    continue;
                }

                let updateFields = {};
                const newRating = playerResults.averageRating;

                // Aggiorna best rating se è il primo voto o se è migliore
                if (playerStats.bestRating === null || newRating > playerStats.bestRating) {
                    updateFields.bestRating = newRating;
                    console.log(`🏆 Nuovo best rating per ${playerStats.playerName}: ${newRating}`);
                }

                // Aggiorna worst rating se è il primo voto o se è peggiore  
                if (playerStats.worstRating === null || newRating < playerStats.worstRating) {
                    updateFields.worstRating = newRating;
                    console.log(`📉 Nuovo worst rating per ${playerStats.playerName}: ${newRating}`);
                }

                // Aggiorna solo se necessario
                if (Object.keys(updateFields).length > 0) {
                    await this.playerStatsRepository.findOneAndUpdate(
                        { playerId: playerId },
                        updateFields
                    );
                    console.log(`✅ Best/worst rating aggiornati per ${playerStats.playerName}`);

                    // 🗞️ NEWS: Genera news per record personali (ATTUALMENTE ATTIVO)
                    await this.newsService.createNewsOnLeaderboardChanges({
                        playerId: playerId,
                        playerName: playerStats.playerName,
                        teamId: playerStats.teamId,
                        changes: updateFields,
                        newRating: newRating,
                        matchContext: 'rating_update'
                    }).catch(err => console.error('⚠️ Errore news leaderboard:', err.message));

                    // 🚧 TODO: FUTURE NEWS CATEGORIES (DA IMPLEMENTARE)
                    // 
                    // 👑 LEADERSHIP CHANGES:
                    // - Nuovo leader generale classifica (chi conquista il #1)
                    // - Cambio podio (chi entra/esce dal top 3)  
                    // - Sorpassi significativi (+3 posizioni in una partita)
                    //
                    // 🎯 MILESTONE & ACHIEVEMENTS:
                    // - Traguardi numerici (100 gol, 50 assist, 200 partite)
                    // - Streak positivi/negativi (5 partite consecutive >8.0)
                    // - Record di squadra (miglior media stagionale)
                    //
                    // 🏆 PERFORMANCE CATEGORIES:  
                    // - Dominio categoria (leader gol + assist stesso giocatore)
                    // - Breakthrough (da ultimo posto a top 5)
                    // - Consistency (10 partite consecutive >7.0)
                    //
                    // 🔥 RIVALRIES & TRENDS:
                    // - Duelli serrati (2 giocatori alternano leadership)
                    // - Rimonte clamorose (da -5 posizioni a +5)
                    // - Form del momento (miglior media ultimi 5 match)
                    //
                    // 🎲 FUN FACTS:
                    // - Statistiche curiose (più gol negli ultimi 10 minuti)
                    // - Pattern particolari (sempre MVP nei derby)
                    // - Coincidenze numeriche (esattamente 7.5 di media)
                    //
                    // 📊 UTILIZZO:
                    // - Chiamare dopo aggiornamento classifiche generali
                    // - Confrontare posizioni pre/post match
                    // - Analizzare trend multipartita
                    // - Rilevare pattern comportamentali
                }

            } catch (error) {
                console.error(`❌ Errore aggiornamento stats per ${playerId}:`, error.message);
                // Non blocchiamo il flusso per errori singoli
            }
        }

        console.log('✅ Best/worst rating aggiornati per tutti i giocatori');
    }

    // =====================
    // 6. DATA RETRIEVAL
    // =====================

    /**
     * Recupera sessione specifica con authorization check
     * @param {string} sessionId - ID sessione
     * @param {string} userId - ID utente richiedente  
     * @returns {Object} Sessione con dettagli match
     */
    async getSessionWithAuth(sessionId, userId) {
        console.log('\n🟡 === GET SESSION WITH AUTH (SERVICE) ===');
        console.log('📋 Session ID:', sessionId);
        console.log('👤 User ID:', userId);

        if (!sessionId) {
            throw new Error('Session ID is required');
        }

        if (!userId) {
            throw new Error('User ID is required');
        }

        // const votingSession = await this.votingSessionRepository.findById(sessionId, {
        //     populate: [{ path: 'targetId', select: 'opponent date venue teamMemberIds' }]
        // });

        const votingSession = await this.votingSessionRepository.findByIdWithUsernames(sessionId);

        if (!votingSession) {
            throw new Error('Voting session not found');
        }

        // Business Rule: Verifica che sia una sessione match_rating
        if (votingSession.type !== 'match_rating') {
            throw new Error('Invalid session type');
        }

        // Business Rule: Verifica che l'utente sia eligible voter
        if (!votingSession.eligibleVoters.includes(userId)) {
            throw new Error('Not authorized to access this voting session');
        }

        console.log('✅ Match session trovata e autorizzata:', votingSession.title);
        console.log('🟡 === FINE GET SESSION WITH AUTH (SERVICE) ===\n');

        return {
            id: votingSession._id,
            type: votingSession.type,
            title: votingSession.title,
            description: votingSession.description,
            status: votingSession.status,
            eligibleVoters: votingSession.eligibleVoters,
            abstainedUsers: votingSession.abstainedUsers,
            createdBy: votingSession.createdBy,
            deadline: votingSession.deadline,
            createdAt: votingSession.createdAt,
            updatedAt: votingSession.updatedAt,
            voteConfig: votingSession.voteConfig,
            matchInfo: {
                field: votingSession.targetId.field,
                date: votingSession.targetId.date,
                venue: votingSession.targetId.venue,
                playersCount: votingSession.targetId.playersCount,
                playersToRate: votingSession.targetId.teamMemberIds,

            }
        };
    }

    /**
     * Attiva sessione votazione (draft → active)
     * @param {string} sessionId - ID sessione
     * @param {string} userId - ID utente richiedente
     * @returns {Object} Sessione attivata
     */
    async activateSession(sessionId, userId) {
        console.log('\n🟠 === ACTIVATE SESSION (SERVICE) ===');
        console.log('📋 Session ID:', sessionId);
        console.log('👤 User ID:', userId);

        if (!sessionId) {
            throw new Error('Session ID is required');
        }

        if (!userId) {
            throw new Error('User ID is required');
        }

        const votingSession = await this.votingSessionRepository.findById(sessionId);

        if (!votingSession) {
            throw new Error('Voting session not found');
        }

        // Business Rule: Solo match_rating sessions
        if (votingSession.type !== 'match_rating') {
            throw new Error('Invalid session type');
        }

        // Business Rule: Solo il creatore può attivare
        if (votingSession.createdBy.toString() !== userId) {
            throw new Error('Only session creator can activate');
        }

        // Business Rule: Solo sessioni draft possono essere attivate
        if (votingSession.status !== 'draft') {
            throw new Error('Can only activate draft sessions');
        }

        // Attiva la sessione
        votingSession.status = 'active';
        votingSession.startedAt = new Date();
        await this.votingSessionRepository.save(votingSession);

        console.log('✅ Match rating session attivata:', votingSession.title);
        console.log('🟠 === FINE ACTIVATE SESSION (SERVICE) ===\n');

        return {
            id: votingSession._id,
            type: votingSession.type,
            status: votingSession.status,
            startedAt: votingSession.startedAt,
            title: votingSession.title
        };
    }

    /**
     * Recupera submission dettagli di un voter specifico
     * @param {string} sessionId - ID sessione
     * @param {string} voterId - ID voter
     * @param {string} userId - ID utente richiedente
     * @returns {Object} Dettagli submission voter
     */
    async getVoterSubmissionDetails(sessionId, voterId, userId) {
        console.log('\n🔍 === GET VOTER SUBMISSION DETAILS (SERVICE) ===');
        console.log('📊 Session ID:', sessionId);
        console.log('🗳️ Voter ID:', voterId);
        console.log('👤 User ID:', userId);

        if (!sessionId) {
            throw new Error('Session ID is required');
        }

        if (!voterId) {
            throw new Error('Voter ID is required');
        }

        if (!userId) {
            throw new Error('User ID is required');
        }

        // 1. Verifica che la sessione esista
        const session = await this.votingSessionRepository.findById(sessionId);
        if (!session) {
            throw new Error('Voting session not found');
        }

        // Business Rule: Solo match_rating
        if (session.type !== 'match_rating') {
            throw new Error('Invalid session type');
        }

        // Business Rule: Verifica che l'utente abbia accesso
        if (!session.eligibleVoters.includes(userId)) {
            throw new Error('Access denied to this voting session');
        }

        // 3. Trova il submission specifico
        const submission = await this.voteSubmissionRepository.findOne({
            votingSessionId: sessionId,
            voterId: voterId,
            isActive: true
        })
            .populate('voterId', 'name email')
            .populate('voteData.playerRatings.playerId', 'name email');

        if (!submission) {
            throw new Error('Vote submission not found for this voter');
        }

        // 4. Formatta i dettagli per il frontend
        const voterDetails = {
            voter: {
                id: submission.voterId._id,
                name: submission.voterId.name,
                email: submission.voterId.email
            },
            submissionInfo: {
                submittedAt: submission.submittedAt,
                timeSpent: submission.timeSpent || null,
                hasBeenModified: submission.hasBeenModified,
                lastModifiedAt: submission.lastModifiedAt,
                overallComment: submission.voteData.overallComment || ''
            },
            playerVotes: submission.voteData.playerRatings.map(playerRating => ({
                player: {
                    id: playerRating.playerId._id,
                    name: playerRating.playerId.name
                },
                rating: playerRating.rating,
                goals: playerRating.goals || 0,
                assists: playerRating.assists || 0,
                comment: playerRating.comment || ''
            })),
            badges: submission.voteData.badges?.map(badge => ({
                playerId: badge.playerId,
                badgeType: badge.badgeType
            })) || []
        };

        console.log('✅ Dettagli voto trovati per:', submission.voterId.name);
        console.log('📊 Giocatori votati:', voterDetails.playerVotes.length);
        console.log('🔍 === FINE GET VOTER SUBMISSION DETAILS (SERVICE) ===\n');

        return voterDetails;
    }

    /**
     * Recupera TUTTE LE sessioni di un utente con statistiche
     * // @route   GET /api/v1/voting-sessions
     * @param {string} userId - ID utente
     * @returns {Array} Lista sessioni con stats
     */
    async getUserSessionsWithStats(userId) {
        console.log('\n🟢 === GET USER SESSIONS WITH STATS (SERVICE) ===');
        console.log('👤 User ID:', userId);

        if (!userId) {
            throw new Error('User ID is required');
        }

        // 1. Trova tutte le sessioni match_rating dove l'utente è eligible voter
        const votingSessions = await this.votingSessionRepository.findAll(
            {
                eligibleVoters: { $in: [userId] },
                type: 'match_rating'
            },
            {
                populate: [{ path: 'targetId', select: 'opponent date venue status' }],
                sort: { createdAt: -1 },
                limit: 50
            }
        );

        console.log('📊 Match rating sessions trovate:', votingSessions.length);

        // 🔍 DEBUG: Log degli status delle sessioni e match
        votingSessions.forEach((session, index) => {
            console.log(`   [${index}] Session: ${session.status}, Match: ${session.targetId?.status || 'N/A'}, Opponent: ${session.targetId?.opponent || 'N/A'}`);
        });

        // 2. Per ogni sessione, calcola statistiche business logic
        const sessionsWithStats = await Promise.all(votingSessions.map(async session => {
            // Business Logic: Verifica se user ha già votato
            const hasVoted = await this.voteSubmissionRepository.exists({
                votingSessionId: session._id,
                voterId: userId
            });

            // Business Logic: Conta submissions totali attive
            const submissionsCount = await this.voteSubmissionRepository.countDocuments({
                votingSessionId: session._id,
                isActive: true
            });


            // Business Logic: Calcola participation rate considerando gli astenuti
            const activeVotersCount = session.eligibleVoters.length - session.abstainedUsers.length;
            const participationRate = activeVotersCount > 0 ?
                Math.round((submissionsCount / activeVotersCount) * 100) : 0;

            // Business Logic: Determina canVote rules
            const isActive = session.status === 'active';
            const canVote = isActive && !hasVoted;

            // 3.1. Recupera i nomi degli utenti partecipanti e astenuti per la sessione (se ci sono)
            const userNames = await this.votingSessionRepository.findByIdWithUsernames(session._id);

            return {
                id: session._id,
                type: session.type,
                targetId: session.targetId._id,
                teamId: session.teamId,
                createdBy: session.createdBy,
                title: session.title,
                description: session.description,
                status: session.status,
                deadline: session.deadline,
                createdAt: session.createdAt,
                updatedAt: session.updatedAt,
                eligibleVoters: session.eligibleVoters,
                eligibleVotersNames: userNames.eligibleVoters,
                abstainedUsers: session.abstainedUsers, // 🎯 FIX: Include abstained users
                abstainedUsersNames: userNames.abstainedUsers, // 🎯 FIX: Include abstained users
                eligibleVotersCount: session.eligibleVoters.length,
                submissionsCount,
                participationRate,
                isActive,
                hasVoted: !!hasVoted,
                canVote,
                // 🎯 FIX: Usa sempre match.date reale, non session date
                matchDate: session.targetId?.date || session.createdAt, // Data match reale
                displayDate: session.targetId?.date || session.createdAt, // Per frontend
                matchInfo: {
                    opponent: session.targetId?.opponent || 'TBD',
                    venue: session.targetId?.venue || 'TBD',
                    status: session.targetId?.status || 'unknown',
                    actualMatchDate: session.targetId?.date // Data originale match
                },
                matchInfo: {
                    field: session.field,
                    date: session.targetId.date,
                    venue: session.targetId.venue,
                    playersCount: session.playersCount,
                }
            };
        }));

        console.log('✅ Sessions with stats calcolate per', sessionsWithStats.length, 'sessioni');
        console.log('🟢 === FINE GET USER SESSIONS WITH STATS (SERVICE) ===\n');

        return sessionsWithStats;
    }

    /**
     * Recupera submissions formattate per sessione  
     * @param {string} sessionId - ID sessione
     * @param {string} userId - ID utente richiedente
     * @returns {Array} Submissions formattate
     */
    async getSessionSubmissionsFormatted(sessionId, userId) {
        console.log('\n📋 === GET SESSION SUBMISSIONS FORMATTED (SERVICE) ===');
        console.log('📊 Session ID:', sessionId);
        console.log('👤 User ID:', userId);

        if (!sessionId) {
            throw new Error('Session ID is required');
        }

        if (!userId) {
            throw new Error('User ID is required');
        }

        // 1. Verifica che la sessione esista e sia match_rating
        const session = await this.votingSessionRepository.findById(sessionId);
        if (!session) {
            throw new Error('Voting session not found');
        }

        if (session.type !== 'match_rating') {
            throw new Error('Invalid session type');
        }

        // eventualmente si puo mettere controllo se userId è membro del team
        // 3. Recupera tutti i submissions attivi con tutti i dettagli
        const submissions = await this.voteSubmissionRepository.findAll(
            {
                votingSessionId: sessionId,
                isActive: true
            },
            {
                populate: [
                    { path: 'voterId', select: 'name email' },
                    { path: 'voteData.playerRatings.playerId', select: 'name email' }
                ],
                sort: { createdAt: -1 }
            }
        );

        // 4. Business Logic: Formatta tutti i submissions completi per il frontend
        const completeSubmissions = submissions.map(submission => ({
            // Info del votante
            voter: {
                id: submission.voterId._id,
                name: submission.voterId.name
            },

            // Metadata della submission
            submissionInfo: {
                submittedAt: submission.createdAt,
                timeSpent: submission.timeSpent || null,
                hasBeenModified: submission.hasBeenModified,
                lastModifiedAt: submission.updatedAt,
                overallComment: submission.voteData.overallComment || ''
            },

            // Tutti i voti che ha dato questo votante
            playerVotes: submission.voteData.playerRatings.map(playerRating => ({
                player: {
                    id: playerRating.playerId._id,
                    name: playerRating.playerId.name
                },
                rating: playerRating.rating,
                goals: playerRating.goals || 0,
                assists: playerRating.assists || 0,
                comment: playerRating.comment || ''
            })),

            // Badge assegnati
            badges: submission.voteData.badges?.map(badge => ({
                playerId: badge.playerId,
                badgeType: badge.badgeType
            })) || []
        }));

        console.log('✅ Trovati', completeSubmissions.length, 'voti completi');
        console.log('📊 Totale giocatori votati:', completeSubmissions.reduce((sum, sub) => sum + sub.playerVotes.length, 0));
        console.log('📋 === FINE GET SESSION SUBMISSIONS FORMATTED (SERVICE) ===\n');

        return {
            submissions: completeSubmissions,
            sessionInfo: {
                title: session.title,
                status: session.status,
                totalEligibleVoters: session.eligibleVoters.length
            }
        };
    }
}

module.exports = VotingService;