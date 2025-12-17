const VotingSession = require('../models/VotingSession');
const VoteSubmission = require('../models/VoteSubmission');
const VoteResult = require('../models/VoteResult');
const Match = require('../models/Match');
const Team = require('../models/Team');
const PlayerLeaderboardStats = require('../models/PlayerLeaderboardStats');

/**
 * VotingService - Business Logic Layer per Gestione Votazioni
 * 
 * Responsabilità:
 * - Validation business rules votazioni
 * - Processing voti e badge mapping
 * - Auto-completion logic (senza mock objects)
 * - Calcolo risultati e aggregazioni
 * - Gestione statistiche giocatori
 */
class VotingService {

    // ====================
    // 1. VALIDATION METHODS
    // ====================

    /**
     * Valida i dati per creazione sessione votazione
     * @param {Object} data - Dati sessione da validare
     * @throws {Error} Se validation fallisce
     */
    validateSessionCreation(data) {
        // TODO: Implementare validation
    }

    /**
     * Valida submission voto per una sessione
     * @param {string} sessionId - ID sessione votazione  
     * @param {string} userId - ID utente votante
     * @param {Object} voteData - Dati voto da validare
     * @throws {Error} Se validation fallisce
     */
    validateVoteSubmission(sessionId, userId, voteData) {
        // TODO: Implementare validation
    }

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
        const match = await Match.findById(targetId);
        if (!match) {
            throw new Error('Match not found');
        }

        // 3. Verifica che il team esista
        const team = await Team.findById(match.teamId);
        if (!team) {
            throw new Error('Team not found');
        }

        // 4. Business rules per creazione sessione
        const votingSession = await VotingSession.create({
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

        // 5. Restituisce sessione con match info per response
        return {
            session: votingSession,
            matchInfo: {
                field: match.field,
                date: match.date,
                teamId: match.teamId,
                playersCount: match.playersCount
            }
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
        const session = await VotingSession.findById(sessionId);
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

        // 3. Controlla se ha già votato
        const existingVote = await VoteSubmission.findOne({
            votingSessionId: session._id,
            voterId: userId,
            isActive: true
        });

        if (existingVote) {
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
            const newVote = new VoteSubmission({
                votingSessionId: session._id,
                voterId: userId,
                voteData: transformedVoteData,
                deviceInfo: voteData.deviceInfo || {},
                timeSpent: voteData.timeSpent || 0,
                version: 1,
                isActive: true,
                validated: false
            });

            await newVote.save();
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
                    badgesAwarded: transformedVoteData.badges.length
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
            const session = await VotingSession.findById(sessionId);
            if (!session || session.status !== 'active') {
                console.log('⚠️ Sessione non trovata o non attiva, skip auto-complete');
                return false;
            }

            // 2. Conta submissions attive
            const submissionsCount = await VoteSubmission.countDocuments({
                votingSessionId: sessionId,
                isActive: true
            });

            const totalEligibleVoters = session.eligibleVoters.length;

            console.log(`📊 Voti raccolti: ${submissionsCount}/${totalEligibleVoters}`);

            // 3. Se tutti hanno votato, auto-complete!
            if (submissionsCount === totalEligibleVoters && submissionsCount > 0) {
                console.log('🎉 TUTTI HANNO VOTATO! Avvio auto-complete...');

                try {
                    // 🎯 NUOVO: Chiama direttamente il service (NO mock objects)
                    const completionResult = await this.completeSession(sessionId, 'automatic');

                    console.log('✅ Auto-complete completato con successo!');
                    console.log('📊 Giocatori elaborati:', completionResult.playersCount);
                    console.log('🗳️ Votanti totali:', completionResult.votersCount);

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
                submissionsCount,
                totalEligibleVoters,
                message: `Attendendo altri voti: ${submissionsCount}/${totalEligibleVoters}`
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
        const session = await VotingSession.findById(sessionId);
        if (!session) {
            throw new Error('Voting session not found');
        }

        if (session.type !== 'match_rating') {
            throw new Error('Invalid session type');
        }

        // 2. Se la sessione è completed, cerca risultati ufficiali
        if (session.status === 'completed') {
            const officialResult = await VoteResult.findOne({
                votingSessionId: sessionId,
                'sessionMetadata.sessionType': 'match_rating'
            });

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

        const submissions = await VoteSubmission.find({
            votingSessionId: sessionId,
            isActive: true
        }).populate('voterId', 'name');

        if (submissions.length === 0) {
            throw new Error('No votes found for this session');
        }

        // 4. Usa il metodo esistente per aggregazione
        const playerResults = this.aggregatePlayerStats(submissions);

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
    aggregatePlayerStats(submissions) {
        if (!Array.isArray(submissions) || submissions.length === 0) {
            throw new Error('Valid submissions array is required');
        }

        const playerStats = {};

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
        const session = await VotingSession.findById(sessionId);
        if (!session) {
            throw new Error('Voting session not found');
        }

        if (session.type !== 'match_rating') {
            throw new Error('Invalid session type');
        }

        // 2. Se già completed, restituisci risultati esistenti
        if (session.status === 'completed') {
            const existingResult = await VoteResult.findOne({
                votingSessionId: sessionId,
                'sessionMetadata.sessionType': 'match_rating'
            });

            if (existingResult) {
                return {
                    success: true,
                    message: 'Session already completed',
                    alreadyCompleted: true,
                    completedAt: session.completedAt,
                    officialResults: existingResult.getMatchRatingResults()
                };
            }
        }

        // 3. Calcola risultati finali
        const submissions = await VoteSubmission.find({
            votingSessionId: sessionId,
            isActive: true
        }).populate('voterId', 'name');

        if (submissions.length === 0) {
            throw new Error('Cannot complete session with no votes');
        }

        // 4. Aggrega risultati usando il metodo esistente
        const finalResults = this.aggregatePlayerStats(submissions);

        // 5. Salva risultati ufficiali
        const voteResult = VoteResult.createMatchRatingResult(
            sessionId,
            finalResults,
            submissions.length
        );

        await voteResult.save();

        // 6. Aggiorna player statistics
        await this.updatePlayerStatistics(finalResults);

        // 7. Aggiorna session status
        session.status = 'completed';
        session.completedAt = new Date();
        session.completionType = completionType;
        await session.save();

        // 8. Aggiorna Match status per coerenza
        try {
            const match = await Match.findById(session.targetId);
            if (match && match.status === 'active') {
                match.status = 'completed';
                await match.save();
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
        const savedResults = voteResult.getMatchRatingResults();

        return {
            success: true,
            message: 'Session completed successfully',
            completedAt: session.completedAt,
            completionType: completionType,
            officialResults: savedResults || finalResults,
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
                const playerStats = await PlayerLeaderboardStats.findOne({ playerId: playerId });
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
                    await PlayerLeaderboardStats.findOneAndUpdate(
                        { playerId: playerId },
                        updateFields
                    );
                    console.log(`✅ Best/worst rating aggiornati per ${playerStats.playerName}`);
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

        const votingSession = await VotingSession.findById(sessionId)
            .populate('targetId', 'opponent date venue teamMemberIds');

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
            deadline: votingSession.deadline,
            createdAt: votingSession.createdAt,
            updatedAt: votingSession.updatedAt,
            voteConfig: votingSession.voteConfig,
            matchInfo: {
                field: votingSession.targetId.field,
                date: votingSession.targetId.date,
                venue: votingSession.targetId.venue,
                playersCount: votingSession.targetId.playersCount,
                playersToRate: votingSession.targetId.teamMemberIds
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

        const votingSession = await VotingSession.findById(sessionId);

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
        await votingSession.save();

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
        const session = await VotingSession.findById(sessionId);
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
        const submission = await VoteSubmission.findOne({
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
     * Recupera sessioni utente con statistiche
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
        const votingSessions = await VotingSession.find({
            eligibleVoters: userId,
            type: 'match_rating'
        })
            .populate('targetId', 'opponent date venue')
            .sort({ createdAt: -1 })
            .limit(50);

        console.log('📊 Match rating sessions trovate:', votingSessions.length);

        // 2. Per ogni sessione, calcola statistiche business logic
        const sessionsWithStats = await Promise.all(votingSessions.map(async session => {
            // Business Logic: Verifica se user ha già votato
            const hasVoted = await VoteSubmission.exists({
                votingSessionId: session._id,
                voterId: userId
            });

            // Business Logic: Conta submissions totali attive
            const submissionsCount = await VoteSubmission.countDocuments({
                votingSessionId: session._id,
                isActive: true
            });

            // Business Logic: Calcola participation rate
            const participationRate = Math.round((submissionsCount / session.eligibleVoters.length) * 100);

            // Business Logic: Determina canVote rules
            const isActive = session.status === 'active';
            const canVote = isActive && !hasVoted;

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
                eligibleVotersCount: session.eligibleVoters.length,
                submissionsCount,
                participationRate,
                isActive,
                hasVoted: !!hasVoted,
                canVote,
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
        const session = await VotingSession.findById(sessionId);
        if (!session) {
            throw new Error('Voting session not found');
        }

        if (session.type !== 'match_rating') {
            throw new Error('Invalid session type');
        }

        // 2. Business Rule: Verifica che l'utente abbia accesso alla sessione
        if (!session.eligibleVoters.includes(userId)) {
            throw new Error('Access denied to this voting session');
        }

        // 3. Recupera tutti i submissions attivi con tutti i dettagli
        const submissions = await VoteSubmission.find({
            votingSessionId: sessionId,
            isActive: true
        })
            .populate('voterId', 'name email')
            .populate('voteData.playerRatings.playerId', 'name email')
            .sort({ createdAt: -1 });

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