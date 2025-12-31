// services/PlayerCardService.js

// 🎯 REPOSITORY PATTERN - Accesso dati tramite Repository
const {
    VotingSessionRepository,
    PlayerCardSubmissionRepository,
    PlayerCardResultRepository,
    TeamRepository,
    UserRepository
} = require('../repositories');

const NewsService = require('./NewsService');


const { getZoneFromPosition, getWeightsForZone } = require('../utils/PositionWeights');

const AppError = require('../utils/AppError');

/**
 * PLAYER CARD SERVICE
 * 
 * 🔄 AGGIORNATO CON REPOSITORY PATTERN:
 * - Non accede più direttamente ai Model Mongoose
 * - Usa Repository per separare data access da business logic
 * 
 * Gestisce tutta la business logic per le valutazioni PlayerCard:
 * - Creazione sessioni di valutazione con auto-VotingSession
 * - Gestione voti e validazioni multi-range (10-100, 1-5)
 * - Calcoli aggregazioni in tempo reale
 * - Auto-completion quando tutti hanno votato
 * - Finalizzazione e persistenza risultati
 * 
 * Pattern simile a MatchService ma con logiche specifiche PlayerCard:
 * - allowSelfVoting=true (giocatori possono autovalutarsi)
 * - Attributi FIFA-style con range diversi
 * - Statistiche avanzate (media, mediana, deviazione standard)
 */
class PlayerCardService {

    /**
     * 🏗️ Costruttore - Inizializza i repository
     */
    constructor() {
        // Inizializza i repository per accesso dati
        this.votingSessionRepository = new VotingSessionRepository();
        this.playerCardSubmissionRepository = new PlayerCardSubmissionRepository();
        this.playerCardResultRepository = new PlayerCardResultRepository();
        this.teamRepository = new TeamRepository();
        this.userRepository = new UserRepository();
        this.newsService = new NewsService();
    }

    /**
     * Crea una nuova sessione PlayerCard con auto-generazione VotingSession
     * @param {string} userId - ID dell'utente creatore
     * @param {Object} sessionData - Dati sessione {targetPlayerId, title, description, deadline, teamId}
     * @returns {Promise<Object>} Risultato creazione con playerCardRequest e votingSession
     */
    async createPlayerCardSession(userId, sessionData) {
        const { targetPlayerId, title, description, deadline, teamId } = sessionData;

        // Input validation
        this.validateUserId(userId);
        if (!targetPlayerId) {
            throw new AppError('targetPlayerId is required', 400);
        }

        try {
            // 1. VERIFICA TARGET PLAYER E TEAM
            const targetPlayer = await this.userRepository.findById(targetPlayerId);
            if (!targetPlayer) {
                throw new AppError('Target player not found', 404);
            }

            // Usa teamId fornito o prova a derivarlo dal target player
            let finalTeamId = teamId;
            if (!finalTeamId) {
                const team = await this.teamRepository.findOne({ memberIds: targetPlayerId });
                if (!team) {
                    throw new AppError('Cannot determine team for target player', 400);
                }
                finalTeamId = team._id;
            }

            // Verifica che il team esista
            const team = await this.teamRepository.findById(finalTeamId);
            if (!team) {
                throw new AppError('Team not found', 404);
            }

            // 2. AUTO-CREA VOTING SESSION (COME MATCH)
            const votingSession = await this.votingSessionRepository.create({
                type: 'player_card_rating',
                targetType: 'player',
                targetId: targetPlayerId,
                teamId: finalTeamId,
                createdBy: userId,
                title: title || `📊 Valutazione Player Card per ${targetPlayer.name}`,
                description: description || `Esprimi la tua valutazione sulle abilità di ${targetPlayer.name}`,
                deadline: deadline ? new Date(deadline) : null,
                eligibleVoters: team.memberIds, // INCLUDE il target player
                status: 'active',
                allowSelfVoting: true, // Player card: ALLOW self voting
                tags: ['auto-generated', 'player-card-linked'],
                environment: 'production',
                voteConfig: {
                    attributesToRate: ['tir', 'pas', 'dri', 'fin', 'vis', 'res', 'for', 'con', 'int', 'prt'],
                    attributeRange: { min: 10, max: 100 },
                    allowComments: true
                }
            });

            return {
                success: true,
                message: 'Richiesta valutazione Player Card e sessione di votazione create con successo!',
                playerCardRequest: {
                    targetPlayerId: targetPlayerId,
                    targetPlayerName: targetPlayer.name,
                    teamId: finalTeamId,
                    teamName: team.name,
                    createdBy: userId,
                    createdAt: new Date()
                },
                votingSession: {
                    id: votingSession._id,
                    type: votingSession.type,
                    title: votingSession.title,
                    status: votingSession.status,
                    targetId: votingSession.targetId,
                    eligibleVoters: votingSession.eligibleVoters.length,
                    createdAt: votingSession.createdAt,
                    targetPlayerInfo: {
                        id: targetPlayer._id,
                        name: targetPlayer.name
                    }
                }
            };

        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError(`Failed to create player card session: ${error.message}`, 500);
        }
    }

    /**
     * Ottiene le sessioni PlayerCard dell'utente
     * @param {string} userId - ID dell'utente
     * @returns {Promise<Object>} Lista sessioni con metadata
     */
    async getUserPlayerCardSessions(userId) {
        this.validateUserId(userId);

        try {
            console.log('\n🃏 === GET USER PLAYER CARD SESSIONS (SERVICE) ===');
            console.log('👤 User ID:', userId);

            // Trova tutte le sessioni player_card_rating dove l'utente è eligible voter
            const votingSessions = await this.votingSessionRepository.findAll(
                {
                    eligibleVoters: { $in: [userId] },
                    type: 'player_card_rating'
                },
                {
                    sort: { createdAt: -1 },
                    limit: 50
                }
            );

            console.log('📊 Player card sessions trovate:', votingSessions.length);

            // 🔧 Converte in plain objects e populate manuale
            console.log('🔧 Convertendo in plain objects e popolando...');
            const plainSessions = votingSessions.map(s => s.toObject ? s.toObject() : s);

            try {
                for (let i = 0; i < plainSessions.length; i++) {
                    const session = plainSessions[i];
                    console.log(`   Popolando sessione ${i}: targetId = ${session.targetId}`);

                    if (session.targetId) {
                        const targetUser = await this.userRepository.findById(session.targetId, { select: 'name email' });
                        console.log(`   User trovato:`, targetUser);
                        if (targetUser) {
                            // Converte anche il target user in plain object se necessario
                            session.targetId = targetUser.toObject ? targetUser.toObject() : targetUser;
                            console.log(`   ✅ Sostituito targetId per sessione ${i}`);
                        } else {
                            console.log(`   ⚠️ User non trovato per targetId ${session.targetId}`);
                        }
                    }
                }
                console.log('✅ Populate manuale completato');
            } catch (error) {
                console.log('❌ Errore durante populate manuale:', error.message);
            }

            // 🔍 DEBUG: Log degli status delle sessioni (ora su plain objects)
            plainSessions.forEach((session, index) => {
                console.log(`       targetId type:`, typeof session.targetId);
                if (session.targetId && typeof session.targetId === 'object') {
                    console.log(`       targetId._id:`, session.targetId._id);
                    console.log(`       targetId keys:`, Object.keys(session.targetId));
                }
            });

            // Adatta le sessioni per il frontend (usa plainSessions popolate)
            const adaptedSessions = await Promise.all(plainSessions.map(async session => {
                // Verifica se user ha già votato per questo target player
                const hasVoted = await this.playerCardSubmissionRepository.exists({
                    votingSessionId: session._id,
                    voterId: userId,
                    targetPlayerId: session.targetId._id || session.targetId,
                    isActive: true
                });

                // Conta submissions totali per questa sessione
                const submissionsCount = await this.playerCardSubmissionRepository.countDocuments({
                    votingSessionId: session._id,
                    isActive: true
                });

                const mappedSession = {
                    id: session._id,
                    type: session.type,
                    targetId: session.targetId, // ✅ Invia l'oggetto User completo
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
                    participationRate: Math.round((submissionsCount /
                        Math.max(1, session.eligibleVoters.length - session.abstainedUsers.length)) * 100),
                    // considera solo votanti attivi
                    isActive: session.status === 'active',
                    hasVoted: !!hasVoted,
                    canVote: session.status === 'active' && !hasVoted,
                    targetPlayerInfo: {
                        name: session.targetId.name,
                        email: session.targetId.email
                    }
                };

                return mappedSession;
            }));

            return {
                success: true,
                votingSessions: adaptedSessions,
                total: adaptedSessions.length
            };

        } catch (error) {
            console.log('❌ ERRORE GET USER PLAYER CARD SESSIONS:', error.message);
            console.log('🃏 === FINE GET USER PLAYER CARD SESSIONS (ERRORE) ===\n');
            throw new AppError(`Failed to fetch user player card sessions: ${error.message}`, 500);
        }
    }

    /**
     * Ottiene dettagli di una specifica sessione PlayerCard
     * @param {string} sessionId - ID della sessione
     * @param {string} userId - ID dell'utente richiedente
     * @returns {Promise<Object>} Dettagli sessione
     */
    async getPlayerCardSession(sessionId, userId) {
        this.validateSessionId(sessionId);
        this.validateUserId(userId);

        try {
            const session = await this.votingSessionRepository.findById(sessionId, {
                populate: [
                    { path: 'targetId', select: 'name email profile.position' },
                    { path: 'createdBy', select: 'name email' },
                    { path: 'eligibleVoters', select: 'name email' }
                ]
            });

            if (!session) {
                throw new AppError('Player card session not found', 404);
            }

            if (session.type !== 'player_card_rating') {
                throw new AppError('Invalid session type', 400);
            }

            // Verifica permessi
            if (!session.eligibleVoters.some(voter => voter._id.equals(userId))) {
                throw new AppError('Access denied - not an eligible voter', 403);
            }

            // Controlla se user ha già votato
            const hasVoted = await this.playerCardSubmissionRepository.exists({
                votingSessionId: sessionId,
                voterId: userId,
                isActive: true
            });

            // Conta submissions totali
            const submissionsCount = await this.playerCardSubmissionRepository.countDocuments({
                votingSessionId: sessionId,
                isActive: true
            });

            return {
                success: true,
                session: {
                    id: session._id,
                    type: session.type,
                    targetId: session.targetId._id,
                    teamId: session.teamId,
                    title: session.title,
                    description: session.description,
                    status: session.status,
                    deadline: session.deadline,
                    createdAt: session.createdAt,
                    updatedAt: session.updatedAt,
                    createdBy: session.createdBy,
                    targetPlayerInfo: session.targetId,
                    eligibleVoters: session.eligibleVoters,
                    submissionsCount,
                    participationRate: Math.round((submissionsCount /
                        Math.max(1, session.eligibleVoters.length - session.abstainedUsers.length)) * 100),
                    // considera solo votanti attivi
                    hasVoted: !!hasVoted,
                    canVote: session.status === 'active' && !hasVoted
                }
            };

        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError(`Failed to fetch player card session: ${error.message}`, 500);
        }
    }

    /**
     * Invia voto PlayerCard con validazioni multi-range
     * @param {string} sessionId - ID della sessione
     * @param {string} userId - ID dell'utente votante
     * @param {Object} voteData - Dati del voto {vote: {attributes, additionalAttributes, playerProfile, comment}, deviceInfo, timeSpent}
     * @returns {Promise<Object>} Risultato submission con auto-completion check
     */
    async submitPlayerCardVote(sessionId, userId, voteData) {
        this.validateSessionId(sessionId);
        this.validateUserId(userId);

        try {
            // 1. Trova la sessione di votazione
            const session = await this.votingSessionRepository.findById(sessionId);
            if (!session) {
                throw new AppError('Player card session not found', 404);
            }

            // 2. Validazioni specifiche per player card
            if (session.type !== 'player_card_rating') {
                throw new AppError('Invalid session type', 400);
            }

            if (session.status !== 'active') {
                throw new AppError('Player card session is not active', 400);
            }

            if (!session.eligibleVoters.includes(userId)) {
                throw new AppError('User not eligible to vote', 403);
            }

            // 3. Controlla se ha già votato per questo target player
            const existingVote = await this.playerCardSubmissionRepository.findOne({
                votingSessionId: sessionId,
                voterId: userId,
                targetPlayerId: session.targetId,
                isActive: true
            });

            if (existingVote) {
                throw new AppError('User has already voted for this player', 400);
            }

            // 4. Valida e trasforma dati dal frontend
            const { attributes, additionalAttributes, playerProfile, profile, comment } = voteData.vote;
            const finalProfile = playerProfile || profile;

            // Validazione POR dati voto
            const cleanedVoteData = this.validateAndCleanPlayerCardData(
                { attributes, additionalAttributes, playerProfile: finalProfile }, session.targetId);

            // 5. Calcola overall rating (diverso per portiere vs giocatore normale)
            const isGoalkeeper = finalProfile?.position === 'POR';
            const calculatedOverallRating = this.calculateOverallRating(
                attributes,
                isGoalkeeper,
                cleanedVoteData.goalkeeperAttributes,
                finalProfile?.position
            );

            // 6. Crea e salva la submission
            const newSubmission = await this.playerCardSubmissionRepository.create({
                votingSessionId: sessionId,
                voterId: userId,
                targetPlayerId: session.targetId,
                attributes: {
                    tir: attributes.tir,
                    pas: attributes.pas,
                    dri: attributes.dri,
                    fin: attributes.fin,
                    vis: attributes.vis,
                    res: attributes.res,
                    for: attributes.for,
                    con: attributes.con,
                    int: attributes.int,
                    prt: attributes.prt,
                },
                additionalAttributes: {
                    piedeDebole: attributes?.piedeDebole || additionalAttributes?.piedeDebole || null,
                    skill: attributes?.skill || additionalAttributes?.skill || null
                },
                goalkeeperAttributes: cleanedVoteData.goalkeeperAttributes,
                playerProfile: {
                    position: finalProfile?.position || null
                },
                comment: comment || '',
                overallRating: calculatedOverallRating,
                deviceInfo: voteData.deviceInfo || {},
                timeSpent: voteData.timeSpent || 0,
                version: 1,
                isActive: true,
                validated: false
            });

            // 7. Controllo auto-completion
            const autoCompleted = await this.checkAndAutoCompletePlayerCard(sessionId);

            return {
                success: true,
                message: 'Player card vote submitted successfully',
                submission: {
                    id: newSubmission._id,
                    overallRating: newSubmission.overallRating,
                    targetPlayerId: newSubmission.targetPlayerId,
                    submittedAt: newSubmission.createdAt
                },
                autoCompleted: autoCompleted
            };

        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError(`Failed to submit player card vote: ${error.message}`, 500);
        }
    }

    /**
     * Ottiene calcoli aggregati PlayerCard in tempo reale
     * @param {string} sessionId - ID della sessione
     * @returns {Promise<Object>} Calcoli aggregati con statistiche
     */
    async getPlayerCardCalculation(sessionId) {
        this.validateSessionId(sessionId);

        try {
            // 1. Verifica che la sessione esista e sia player_card_rating
            const session = await this.votingSessionRepository.findById(sessionId);
            if (!session) {
                throw new AppError('Player card session not found', 404);
            }

            if (session.type !== 'player_card_rating') {
                throw new AppError('Invalid session type', 400);
            }

            // 2. Se la sessione è completed, cerca risultati ufficiali
            if (session.status === 'completed') {
                const officialResult = await this.playerCardResultRepository.findOne({
                    votingSessionId: sessionId,
                    targetPlayerId: session.targetId,
                    'sessionMetadata.sessionType': 'player_card_rating'
                });

                if (officialResult) {
                    const savedResults = officialResult.getPlayerCardResults();
                    if (savedResults) {
                        return {
                            success: true,
                            calculation: savedResults,
                            isOfficial: true,
                            completedAt: savedResults.metadata.calculatedAt
                        };
                    }
                }
            }

            // 3. Calcola risultati live
            const submissions = await this.playerCardSubmissionRepository.findAll({
                filter: {
                    votingSessionId: sessionId,
                    targetPlayerId: session.targetId,
                    isActive: true
                },
                populate: [{ path: 'voterId', select: 'name' }]
            });

            if (submissions.length === 0) {
                throw new AppError('No votes found for this player card session', 404);
            }

            // 4. Aggrega statistiche
            const aggregatedStats = this.aggregatePlayerCardStats(submissions);

            return {
                success: true,
                calculation: aggregatedStats,
                isOfficial: false,
                calculatedAt: new Date()
            };

        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError(`Failed to calculate player card results: ${error.message}`, 500);
        }
    }

    /**
     * Completa sessione PlayerCard con finalizzazione risultati
     * @param {string} sessionId - ID della sessione
     * @param {Object} options - Opzioni {forceReopen, autoCompleted, completionType}
     * @returns {Promise<Object>} Risultato completamento
     */
    async completePlayerCardSession(sessionId, options = {}) {

        this.validateSessionId(sessionId);
        const { forceReopen } = options;

        try {
            // 1. Verifica che la sessione esista e sia player_card_rating
            const session = await this.votingSessionRepository.findById(sessionId);
            if (!session) {
                throw new AppError('Player card session not found', 404);
            }

            if (session.type !== 'player_card_rating') {
                throw new AppError('Invalid session type', 400);
            }

            // 3. Gestione force reopen
            if (session.status === 'completed' && !forceReopen) {
                const existingResult = await this.playerCardResultRepository.findOne({
                    votingSessionId: sessionId,
                    targetPlayerId: session.targetId,
                    'sessionMetadata.sessionType': 'player_card_rating'
                });
                if (existingResult) {
                    throw new AppError('Player card session already completed', 400);
                }
            }

            if (forceReopen && session.status === 'completed') {
                await this.votingSessionRepository.updateById(sessionId, { status: 'active' });
                await this.playerCardResultRepository.deleteMany({
                    votingSessionId: sessionId,
                    targetPlayerId: session.targetId,
                    'sessionMetadata.sessionType': 'player_card_rating'
                });

                return {
                    success: true,
                    message: 'Player card session reopened successfully',
                    status: 'active'
                };
            }

            // 4. Calcola risultati finali
            const submissions = await this.playerCardSubmissionRepository.findAll(
                {
                    votingSessionId: sessionId,
                    targetPlayerId: session.targetId,
                    isActive: true
                },
                {
                    populate: [{ path: 'voterId', select: 'name' }]
                }
            );

            if (submissions.length === 0) {
                throw new AppError('Cannot complete session with no votes', 400);
            }

            // 5. Aggrega dati per PlayerCardResult
            const aggregatedData = this.aggregatePlayerCardStats(submissions);

            // 5. Salva risultati ufficiali con struttura corretta PlayerCardResult
            const playerCardResultData = {
                votingSessionId: sessionId,
                targetPlayerId: session.targetId,

                // ✅ Mappa finalAttributes da attributeStats
                finalAttributes: {
                    tir: aggregatedData.attributeStats.tir.average,
                    pas: aggregatedData.attributeStats.pas.average,
                    dri: aggregatedData.attributeStats.dri.average,
                    fin: aggregatedData.attributeStats.fin.average,
                    vis: aggregatedData.attributeStats.vis.average,
                    res: aggregatedData.attributeStats.res.average,
                    for: aggregatedData.attributeStats.for.average,
                    con: aggregatedData.attributeStats.con?.average,
                    int: aggregatedData.attributeStats.int?.average,
                    prt: aggregatedData.attributeStats.prt?.average,
                },

                // ✅ Mappa finalAdditionalAttributes da additionalAttributeStats
                finalAdditionalAttributes: {
                    piedeDebole: aggregatedData.additionalAttributeStats.piedeDebole?.average || null,
                    skill: aggregatedData.additionalAttributeStats.skill?.average || null
                },

                // ✅ FIX: Crea goalkeeperAttributes solo se è veramente un portiere
                ...(aggregatedData.metadata.isGoalkeeper ? {
                    goalkeeperAttributes: {
                        tf: aggregatedData.goalkeeperAttributeStats.tf?.average || null,
                        pr: aggregatedData.goalkeeperAttributeStats.pr?.average || null,
                        rn: aggregatedData.goalkeeperAttributeStats.rn?.average || null,
                        pz: aggregatedData.goalkeeperAttributeStats.pz?.average || null,
                        rf: aggregatedData.goalkeeperAttributeStats.rf?.average || null,
                    }
                } : {}), // Se non è portiere, non aggiunge il campo


                // ✅ Mappa finalOverallRating da overallStats
                finalOverallRating: aggregatedData.overallStats.average,

                // ✅ Calcola consensusProfile da positionStats
                consensusProfile: {
                    mostVotedPosition: (() => {
                        const positions = aggregatedData.positionStats || {};
                        let maxVotes = 0;
                        let mostVoted = null;
                        Object.entries(positions).forEach(([pos, votes]) => {
                            if (votes > maxVotes) {
                                maxVotes = votes;
                                mostVoted = pos;
                            }
                        });
                        return mostVoted;
                    })(),
                    positionDistribution: new Map(Object.entries(aggregatedData.positionStats || {}))
                },

                // ✅ Mappa statistics complete
                statistics: {
                    voteCount: aggregatedData.totalVotes,

                    // Breakdown dettagliato per ogni attributo
                    attributeBreakdown: {
                        tir: {
                            average: aggregatedData.attributeStats.tir.average,
                            median: aggregatedData.attributeStats.tir.median,
                            standardDeviation: aggregatedData.attributeStats.tir.standardDeviation,
                            min: Math.min(...aggregatedData.attributeStats.tir.values),
                            max: Math.max(...aggregatedData.attributeStats.tir.values),
                            distribution: {
                                '90-100': aggregatedData.attributeStats.tir.values.filter(v => v >= 90).length,
                                '80-90': aggregatedData.attributeStats.tir.values.filter(v => v >= 80 && v < 90).length,
                                '70-80': aggregatedData.attributeStats.tir.values.filter(v => v >= 70 && v < 80).length,
                                '60-70': aggregatedData.attributeStats.tir.values.filter(v => v >= 60 && v < 70).length,
                                '50-60': aggregatedData.attributeStats.tir.values.filter(v => v >= 50 && v < 60).length,
                                'below-50': aggregatedData.attributeStats.tir.values.filter(v => v < 50).length
                            }
                        },
                        pas: {
                            average: aggregatedData.attributeStats.pas.average,
                            median: aggregatedData.attributeStats.pas.median,
                            standardDeviation: aggregatedData.attributeStats.pas.standardDeviation,
                            min: Math.min(...aggregatedData.attributeStats.pas.values),
                            max: Math.max(...aggregatedData.attributeStats.pas.values),
                            distribution: {
                                '90-100': aggregatedData.attributeStats.pas.values.filter(v => v >= 90).length,
                                '80-90': aggregatedData.attributeStats.pas.values.filter(v => v >= 80 && v < 90).length,
                                '70-80': aggregatedData.attributeStats.pas.values.filter(v => v >= 70 && v < 80).length,
                                '60-70': aggregatedData.attributeStats.pas.values.filter(v => v >= 60 && v < 70).length,
                                '50-60': aggregatedData.attributeStats.pas.values.filter(v => v >= 50 && v < 60).length,
                                'below-50': aggregatedData.attributeStats.pas.values.filter(v => v < 50).length
                            }
                        },
                        dri: {
                            average: aggregatedData.attributeStats.dri.average,
                            median: aggregatedData.attributeStats.dri.median,
                            standardDeviation: aggregatedData.attributeStats.dri.standardDeviation,
                            min: Math.min(...aggregatedData.attributeStats.dri.values),
                            max: Math.max(...aggregatedData.attributeStats.dri.values),
                            distribution: {
                                '90-100': aggregatedData.attributeStats.dri.values.filter(v => v >= 90).length,
                                '80-90': aggregatedData.attributeStats.dri.values.filter(v => v >= 80 && v < 90).length,
                                '70-80': aggregatedData.attributeStats.dri.values.filter(v => v >= 70 && v < 80).length,
                                '60-70': aggregatedData.attributeStats.dri.values.filter(v => v >= 60 && v < 70).length,
                                '50-60': aggregatedData.attributeStats.dri.values.filter(v => v >= 50 && v < 60).length,
                                'below-50': aggregatedData.attributeStats.dri.values.filter(v => v < 50).length
                            }
                        },
                        fin: {
                            average: aggregatedData.attributeStats.fin.average,
                            median: aggregatedData.attributeStats.fin.median,
                            standardDeviation: aggregatedData.attributeStats.fin.standardDeviation,
                            min: Math.min(...aggregatedData.attributeStats.fin.values),
                            max: Math.max(...aggregatedData.attributeStats.fin.values),
                            distribution: {
                                '90-100': aggregatedData.attributeStats.fin.values.filter(v => v >= 90).length,
                                '80-90': aggregatedData.attributeStats.fin.values.filter(v => v >= 80 && v < 90).length,
                                '70-80': aggregatedData.attributeStats.fin.values.filter(v => v >= 70 && v < 80).length,
                                '60-70': aggregatedData.attributeStats.fin.values.filter(v => v >= 60 && v < 70).length,
                                '50-60': aggregatedData.attributeStats.fin.values.filter(v => v >= 50 && v < 60).length,
                                'below-50': aggregatedData.attributeStats.fin.values.filter(v => v < 50).length
                            }
                        },
                        vis: {
                            average: aggregatedData.attributeStats.vis.average,
                            median: aggregatedData.attributeStats.vis.median,
                            standardDeviation: aggregatedData.attributeStats.vis.standardDeviation,
                            min: Math.min(...aggregatedData.attributeStats.vis.values),
                            max: Math.max(...aggregatedData.attributeStats.vis.values),
                            distribution: {
                                '90-100': aggregatedData.attributeStats.vis.values.filter(v => v >= 90).length,
                                '80-90': aggregatedData.attributeStats.vis.values.filter(v => v >= 80 && v < 90).length,
                                '70-80': aggregatedData.attributeStats.vis.values.filter(v => v >= 70 && v < 80).length,
                                '60-70': aggregatedData.attributeStats.vis.values.filter(v => v >= 60 && v < 70).length,
                                '50-60': aggregatedData.attributeStats.vis.values.filter(v => v >= 50 && v < 60).length,
                                'below-50': aggregatedData.attributeStats.vis.values.filter(v => v < 50).length
                            }
                        },
                        res: {
                            average: aggregatedData.attributeStats.res.average,
                            median: aggregatedData.attributeStats.res.median,
                            standardDeviation: aggregatedData.attributeStats.res.standardDeviation,
                            min: Math.min(...aggregatedData.attributeStats.res.values),
                            max: Math.max(...aggregatedData.attributeStats.res.values),
                            distribution: {
                                '90-100': aggregatedData.attributeStats.res.values.filter(v => v >= 90).length,
                                '80-90': aggregatedData.attributeStats.res.values.filter(v => v >= 80 && v < 90).length,
                                '70-80': aggregatedData.attributeStats.res.values.filter(v => v >= 70 && v < 80).length,
                                '60-70': aggregatedData.attributeStats.res.values.filter(v => v >= 60 && v < 70).length,
                                '50-60': aggregatedData.attributeStats.res.values.filter(v => v >= 50 && v < 60).length,
                                'below-50': aggregatedData.attributeStats.res.values.filter(v => v < 50).length
                            }
                        },
                        con: {
                            average: aggregatedData.attributeStats.con.average,
                            median: aggregatedData.attributeStats.con.median,
                            standardDeviation: aggregatedData.attributeStats.con.standardDeviation,
                            min: Math.min(...aggregatedData.attributeStats.con.values),
                            max: Math.max(...aggregatedData.attributeStats.con.values),
                            distribution: {
                                '90-100': aggregatedData.attributeStats.con.values.filter(v => v >= 90).length,
                                '80-90': aggregatedData.attributeStats.con.values.filter(v => v >= 80 && v < 90).length,
                                '70-80': aggregatedData.attributeStats.con.values.filter(v => v >= 70 && v < 80).length,
                                '60-70': aggregatedData.attributeStats.con.values.filter(v => v >= 60 && v < 70).length,
                                '50-60': aggregatedData.attributeStats.con.values.filter(v => v >= 50 && v < 60).length,
                                'below-50': aggregatedData.attributeStats.con.values.filter(v => v < 50).length
                            }
                        },
                        int: {
                            average: aggregatedData.attributeStats.int.average,
                            median: aggregatedData.attributeStats.int.median,
                            standardDeviation: aggregatedData.attributeStats.int.standardDeviation,
                            min: Math.min(...aggregatedData.attributeStats.int.values),
                            max: Math.max(...aggregatedData.attributeStats.int.values),
                            distribution: {
                                '90-100': aggregatedData.attributeStats.int.values.filter(v => v >= 90).length,
                                '80-90': aggregatedData.attributeStats.int.values.filter(v => v >= 80 && v < 90).length,
                                '70-80': aggregatedData.attributeStats.int.values.filter(v => v >= 70 && v < 80).length,
                                '60-70': aggregatedData.attributeStats.int.values.filter(v => v >= 60 && v < 70).length,
                                '50-60': aggregatedData.attributeStats.int.values.filter(v => v >= 50 && v < 60).length,
                                'below-50': aggregatedData.attributeStats.int.values.filter(v => v < 50).length
                            }
                        },
                        prt: {
                            average: aggregatedData.attributeStats.prt.average,
                            median: aggregatedData.attributeStats.prt.median,
                            standardDeviation: aggregatedData.attributeStats.prt.standardDeviation,
                            min: Math.min(...aggregatedData.attributeStats.prt.values),
                            max: Math.max(...aggregatedData.attributeStats.prt.values),
                            distribution: {
                                '90-100': aggregatedData.attributeStats.prt.values.filter(v => v >= 90).length,
                                '80-90': aggregatedData.attributeStats.prt.values.filter(v => v >= 80 && v < 90).length,
                                '70-80': aggregatedData.attributeStats.prt.values.filter(v => v >= 70 && v < 80).length,
                                '60-70': aggregatedData.attributeStats.prt.values.filter(v => v >= 60 && v < 70).length,
                                '50-60': aggregatedData.attributeStats.prt.values.filter(v => v >= 50 && v < 60).length,
                                'below-50': aggregatedData.attributeStats.prt.values.filter(v => v < 50).length
                            }
                        }
                    },
                    goalkeeperAttributeBreakdown: {
                        tf: {
                            average: aggregatedData.goalkeeperAttributeStats.tf.average,
                            median: aggregatedData.goalkeeperAttributeStats.tf.median,
                            standardDeviation: aggregatedData.goalkeeperAttributeStats.tf.standardDeviation,
                            min: Math.min(...aggregatedData.goalkeeperAttributeStats.tf.values),
                            max: Math.max(...aggregatedData.goalkeeperAttributeStats.tf.values),
                            distribution: {
                                '90-100': aggregatedData.goalkeeperAttributeStats.tf.values.filter(v => v >= 90).length,
                                '80-90': aggregatedData.goalkeeperAttributeStats.tf.values.filter(v => v >= 80 && v < 90).length,
                                '70-80': aggregatedData.goalkeeperAttributeStats.tf.values.filter(v => v >= 70 && v < 80).length,
                                '60-70': aggregatedData.goalkeeperAttributeStats.tf.values.filter(v => v >= 60 && v < 70).length,
                                '50-60': aggregatedData.goalkeeperAttributeStats.tf.values.filter(v => v >= 50 && v < 60).length,
                                'below-50': aggregatedData.goalkeeperAttributeStats.tf.values.filter(v => v < 50).length
                            },

                        },
                        pr: {
                            average: aggregatedData.goalkeeperAttributeStats.pr.average,
                            median: aggregatedData.goalkeeperAttributeStats.pr.median,
                            standardDeviation: aggregatedData.goalkeeperAttributeStats.pr.standardDeviation,
                            min: Math.min(...aggregatedData.goalkeeperAttributeStats.pr.values),
                            max: Math.max(...aggregatedData.goalkeeperAttributeStats.pr.values),
                            distribution: {
                                '90-100': aggregatedData.goalkeeperAttributeStats.pr.values.filter(v => v >= 90).length,
                                '80-90': aggregatedData.goalkeeperAttributeStats.pr.values.filter(v => v >= 80 && v < 90).length,
                                '70-80': aggregatedData.goalkeeperAttributeStats.pr.values.filter(v => v >= 70 && v < 80).length,
                                '60-70': aggregatedData.goalkeeperAttributeStats.pr.values.filter(v => v >= 60 && v < 70).length,
                                '50-60': aggregatedData.goalkeeperAttributeStats.pr.values.filter(v => v >= 50 && v < 60).length,
                                'below-50': aggregatedData.goalkeeperAttributeStats.pr.values.filter(v => v < 50).length
                            },

                        },
                        rn: {
                            average: aggregatedData.goalkeeperAttributeStats.rn.average,
                            median: aggregatedData.goalkeeperAttributeStats.rn.median,
                            standardDeviation: aggregatedData.goalkeeperAttributeStats.rn.standardDeviation,
                            min: Math.min(...aggregatedData.goalkeeperAttributeStats.rn.values),
                            max: Math.max(...aggregatedData.goalkeeperAttributeStats.rn.values),
                            distribution: {
                                '90-100': aggregatedData.goalkeeperAttributeStats.rn.values.filter(v => v >= 90).length,
                                '80-90': aggregatedData.goalkeeperAttributeStats.rn.values.filter(v => v >= 80 && v < 90).length,
                                '70-80': aggregatedData.goalkeeperAttributeStats.rn.values.filter(v => v >= 70 && v < 80).length,
                                '60-70': aggregatedData.goalkeeperAttributeStats.rn.values.filter(v => v >= 60 && v < 70).length,
                                '50-60': aggregatedData.goalkeeperAttributeStats.rn.values.filter(v => v >= 50 && v < 60).length,
                                'below-50': aggregatedData.goalkeeperAttributeStats.rn.values.filter(v => v < 50).length
                            },

                        },
                        pz: {
                            average: aggregatedData.goalkeeperAttributeStats.pz.average,
                            median: aggregatedData.goalkeeperAttributeStats.pz.median,
                            standardDeviation: aggregatedData.goalkeeperAttributeStats.pz.standardDeviation,
                            min: Math.min(...aggregatedData.goalkeeperAttributeStats.pz.values),
                            max: Math.max(...aggregatedData.goalkeeperAttributeStats.pz.values),
                            distribution: {
                                '90-100': aggregatedData.goalkeeperAttributeStats.pz.values.filter(v => v >= 90).length,
                                '80-90': aggregatedData.goalkeeperAttributeStats.pz.values.filter(v => v >= 80 && v < 90).length,
                                '70-80': aggregatedData.goalkeeperAttributeStats.pz.values.filter(v => v >= 70 && v < 80).length,
                                '60-70': aggregatedData.goalkeeperAttributeStats.pz.values.filter(v => v >= 60 && v < 70).length,
                                '50-60': aggregatedData.goalkeeperAttributeStats.pz.values.filter(v => v >= 50 && v < 60).length,
                                'below-50': aggregatedData.goalkeeperAttributeStats.pz.values.filter(v => v < 50).length
                            },

                        },
                        rf: {
                            average: aggregatedData.goalkeeperAttributeStats.rf.average,
                            median: aggregatedData.goalkeeperAttributeStats.rf.median,
                            standardDeviation: aggregatedData.goalkeeperAttributeStats.rf.standardDeviation,
                            min: Math.min(...aggregatedData.goalkeeperAttributeStats.rf.values),
                            max: Math.max(...aggregatedData.goalkeeperAttributeStats.rf.values),
                            distribution: {
                                '90-100': aggregatedData.goalkeeperAttributeStats.rf.values.filter(v => v >= 90).length,
                                '80-90': aggregatedData.goalkeeperAttributeStats.rf.values.filter(v => v >= 80 && v < 90).length,
                                '70-80': aggregatedData.goalkeeperAttributeStats.rf.values.filter(v => v >= 70 && v < 80).length,
                                '60-70': aggregatedData.goalkeeperAttributeStats.rf.values.filter(v => v >= 60 && v < 70).length,
                                '50-60': aggregatedData.goalkeeperAttributeStats.rf.values.filter(v => v >= 50 && v < 60).length,
                                'below-50': aggregatedData.goalkeeperAttributeStats.rf.values.filter(v => v < 50).length
                            },

                        },
                    }

                },

                calculationMethod: 'average',

                sessionMetadata: {
                    totalVoters: submissions.length,
                    sessionType: 'player_card_rating',
                    calculatedAt: new Date(),
                    completionRate: 100
                }
            };


            // 6. Crea record PlayerCardResult
            const playerCardResult = await this.playerCardResultRepository.create(playerCardResultData);


            // 7. Aggiorna stato sessione a completed
            await this.votingSessionRepository.updateById(sessionId, {
                status: 'completed',
                completedAt: new Date()
            });


            // 🧹 CACHE INVALIDATION: Pulisci cache PlayerCard per il giocatore valutato
            try {
                const CacheService = require('./CacheService');
                await CacheService.invalidatePlayerCardsAfterVote([session.targetId]);
                console.log(`🔄 Cache PlayerCard invalidato per giocatore ${session.targetId}`);
            } catch (cacheError) {
                console.error('⚠️ Errore invalidazione cache PlayerCard:', cacheError.message);
                // Non blocchiamo il flusso principale
            }

            return {
                success: true,
                message: 'Player card session completed successfully',
                playerCardResult: {
                    id: playerCardResult._id,
                    targetPlayerId: playerCardResult.targetPlayerId,
                    finalAttributes: playerCardResult.finalAttributes,
                    goalkeeperAttributes: playerCardResult.goalkeeperAttributes,
                    overallRating: playerCardResult.overallRating,
                    totalVotes: playerCardResult.totalVotes,
                    completedAt: playerCardResult.createdAt
                }
            };

        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError(`Failed to complete player card session: ${error.message}`, 500);
        }
    }

    /**
     * Ottiene risultati storici PlayerCard
     * @param {Object} filters - Filtri di ricerca {targetPlayerId, teamId, limit, offset}
     * @returns {Promise<Object>} Lista risultati con paginazione
     */
    async getPlayerCardResults(filters = {}) {
        try {
            const { targetPlayerId, teamId, limit = 10, offset = 0 } = filters;

            // Build query
            const query = {
                'sessionMetadata.sessionType': 'player_card_rating'
            };

            if (targetPlayerId) {
                query.targetPlayerId = targetPlayerId;
            }

            if (teamId) {
                // Find sessions for this team, then filter results
                const teamSessions = await this.votingSessionRepository.findAll({
                    filter: {
                        teamId: teamId,
                        type: 'player_card_rating'
                    },
                    select: '_id'
                });

                query.votingSessionId = { $in: teamSessions.map(s => s._id) };
            }

            const results = await this.playerCardResultRepository.findAll(
                query,
                {
                    populate: [
                        { path: 'targetPlayerId', select: 'name email profile.position' },
                        { path: 'votingSessionId', select: 'title createdBy teamId' }
                    ],
                    sort: { createdAt: -1 },
                    skip: offset,
                    limit: limit
                }
            );

            const totalResults = await this.playerCardResultRepository.countDocuments(query);

            return {
                success: true,
                results: results.map(result => ({
                    id: result._id,
                    targetPlayer: result.targetPlayerId,
                    session: result.votingSessionId,
                    finalAttributes: result.finalAttributes,
                    finalAdditionalAttributes: result.finalAdditionalAttributes, // ⭐ STELLE
                    goalkeeperAttributes: result.goalkeeperAttributes, // ✅ AGGIUNTO PORTIERI
                    finalOverallRating: result.finalOverallRating, // ✅ CAMPO CORRETTO!
                    consensusProfile: result.consensusProfile, // ✅ AGGIUNTO PROFILO CONSENSUALE
                    sessionMetadata: result.sessionMetadata, // ✅ METADATI COMPLETI
                    totalVotes: result.sessionMetadata?.totalVoters || 0,
                    createdAt: result.createdAt
                })),
                pagination: {
                    total: totalResults,
                    limit,
                    offset,
                    hasMore: offset + limit < totalResults
                }
            };

        } catch (error) {
            throw new AppError(`Failed to fetch player card results: ${error.message}`, 500);
        }
    }

    /**
     * UTILITY: Controllo auto-completion quando tutti hanno votato
     * @param {string} sessionId - ID della sessione
     * @returns {Promise<boolean>} True se auto-completata
     */
    async checkAndAutoCompletePlayerCard(sessionId) {
        try {
            const session = await this.votingSessionRepository.findById(sessionId);
            if (!session || session.status !== 'active') {
                return false;
            }

            // Conta submissions attive per Player Card
            const submissionsCount = await this.playerCardSubmissionRepository.countDocuments({
                votingSessionId: sessionId,
                isActive: true
            });

            const totalEligibleVoters = session.eligibleVoters.length;

            // Se tutti hanno votato, auto-complete!
            if (submissionsCount === totalEligibleVoters && submissionsCount > 0) {
                await this.completePlayerCardSession(sessionId, {
                    autoCompleted: true,
                    completionType: 'automatic'
                });
                return true;
            }

            return false;

        } catch (error) {
            console.error('❌ ERRORE AUTO-COMPLETE PLAYER CARD:', error.message);
            return false;
        }
    }

    // === BUSINESS LOGIC HELPERS ===

    /**
     * Valida dati voto PlayerCard con range multipli
     * @param {Object} voteData - {attributes, additionalAttributes}
     */
    validatePlayerCardVoteData(voteData) {
        const { attributes, additionalAttributes } = voteData;

        // Validazione attributi obbligatori
        const requiredAttributes = ['tir', 'pas', 'dri', 'fin', 'vis', 'res', 'for', 'con', 'int', 'prt'];
        const missingAttributes = requiredAttributes.filter(attr =>
            !attributes || typeof attributes[attr] !== 'number'
        );

        if (missingAttributes.length > 0) {
            throw new AppError(`Missing required attributes: ${missingAttributes.join(', ')}`, 400);
        }

        // Validazione range attributi normali (10-100)
        Object.entries(attributes).forEach(([attr, value]) => {
            if (requiredAttributes.includes(attr)) {
                if (value < 10 || value > 100) {
                    throw new AppError(`Invalid ${attr} value: ${value}. Must be between 10 and 100.`, 400);
                }
            }
            // Attributi stelle (1-5) se presenti in attributes
            else if (attr === 'piedeDebole' || attr === 'skill') {
                if (value < 1 || value > 5) {
                    throw new AppError(`Invalid ${attr} value: ${value}. Must be between 1 and 5 stars.`, 400);
                }
            }
        });

        // Validazione separata per additionalAttributes se presenti
        if (additionalAttributes) {
            if (additionalAttributes.piedeDebole !== undefined) {
                if (additionalAttributes.piedeDebole < 1 || additionalAttributes.piedeDebole > 5) {
                    throw new AppError(`Invalid piedeDebole value: ${additionalAttributes.piedeDebole}. Must be between 1 and 5 stars.`, 400);
                }
            }
            if (additionalAttributes.skill !== undefined) {
                if (additionalAttributes.skill < 1 || additionalAttributes.skill > 5) {
                    throw new AppError(`Invalid skill value: ${additionalAttributes.skill}. Must be between 1 and 5 stars.`, 400);
                }
            }
        }
    }

    /**
     * Valida e controlla SE PORT O normale PlayerCard
     * @param {Object} voteData - {attributes, additionalAttributes}
     */
    validateAndCleanPlayerCardData(voteData, targetPlayerId) {
        const { attributes, additionalAttributes, playerProfile } = voteData;

        // STEP 1: Determina se è portiere
        const isGoalkeeper = playerProfile?.position === 'POR';

        // STEP 2: Crea oggetto result pulito
        const cleanedData = {
            attributes: attributes, // Sempre presenti
            additionalAttributes: additionalAttributes, // Sempre presenti
            playerProfile: playerProfile
        };

        if (isGoalkeeper) {
            // BRANCH PORTIERE: Auto-fill attributi base con valori di default
            const defaultBaseAttributes = {
                tir: 18, pas: 18, dri: 18, fin: 18, vis: 18,
                res: 18, for: 18, con: 18, int: 18, prt: 18
            };

            // Auto-compila attributi base mancanti per portieri
            Object.keys(defaultBaseAttributes).forEach(attr => {
                if (!attributes[attr] || typeof attributes[attr] !== 'number') {
                    attributes[attr] = defaultBaseAttributes[attr];
                    console.log(`🥅 Auto-fill portiere: ${attr} = ${defaultBaseAttributes[attr]}`);
                }
            });

            // Valida e mantieni attributi GK
            const requiredGKAttrs = ['tf', 'pr', 'rn', 'pz', 'rf'];

            // Verifica che tutti gli attributi GK siano presenti
            const missingGKAttrs = requiredGKAttrs.filter(attr =>
                !attributes[attr] || typeof attributes[attr] !== 'number'
            );

            if (missingGKAttrs.length > 0) {
                throw new AppError(`Portiere manca attributi: ${missingGKAttrs.join(', ')}`, 400);
            }

            // Valida range 10-100 per attributi GK
            requiredGKAttrs.forEach(attr => {
                const value = attributes[attr];
                if (value < 10 || value > 100) {
                    throw new AppError(`Attributo portiere ${attr}: ${value} deve essere 10-100`, 400);
                }
            });

            // Mantieni attributi GK nel result
            cleanedData.goalkeeperAttributes = {
                tf: attributes.tf,
                pr: attributes.pr,
                rn: attributes.rn,
                pz: attributes.pz,
                rf: attributes.rf
            };

        } else {
            // BRANCH NON-PORTIERE: Rimuovi attributi GK
            cleanedData.goalkeeperAttributes = null;
        }

        return cleanedData;
    }


    /**
 * Calcola overall rating con pesi basati sulla posizione
 * @param {Object} attributes - Attributi principali
 * @param {boolean} isGoalkeeper - Se è un portiere
 * @param {Object} goalkeeperAttributes - Attributi portiere
 * @param {string} playerPosition - Posizione del giocatore (es: 'CDC', 'TD')
 * @returns {number} Overall rating arrotondato
 */
    calculateOverallRating(attributes, isGoalkeeper = false, goalkeeperAttributes = null, playerPosition = null) {
        if (isGoalkeeper && goalkeeperAttributes) {
            // LOGICA PORTIERE: Solo attributi GK (rimane invariata)
            const gkValues = [
                goalkeeperAttributes.tf,
                goalkeeperAttributes.pr,
                goalkeeperAttributes.rn,
                goalkeeperAttributes.pz,
                goalkeeperAttributes.rf
            ];
            const gkAverage = gkValues.reduce((sum, val) => sum + val, 0) / 5;
            return Math.round(gkAverage);
        } else {
            // NUOVA LOGICA: Calcolo pesato basato su posizione
            const zone = getZoneFromPosition(playerPosition);
            const weights = getWeightsForZone(zone);

            if (!weights) {
                // Fallback alla media semplice se non ci sono pesi
                const total = attributes.tir + attributes.pas + attributes.dri + attributes.fin +
                    attributes.vis + attributes.res + attributes.for + attributes.con +
                    attributes.int + attributes.prt;
                return Math.round(total / 10);
            }

            // Calcolo pesato
            let weightedSum = 0;
            let totalWeights = 0;

            Object.keys(attributes).forEach(attr => {
                const weight = weights[attr] || 1.0; // Default peso 1.0 se non definito
                weightedSum += attributes[attr] * weight;
                totalWeights += weight;
            });

            return Math.round(weightedSum / totalWeights);
        }
    }

    /**
     * Aggrega statistiche PlayerCard da submissions
     * @param {Array} submissions - Array di PlayerCardSubmission
     * @returns {Object} Statistiche aggregate
     */
    aggregatePlayerCardStats(submissions) {
        // Inizializza strutture
        const attributeStats = {};
        ['tir', 'pas', 'dri', 'fin', 'vis', 'res', 'for', 'con', 'int', 'prt'].forEach(attr => {
            attributeStats[attr] = {
                values: [],
                average: 0,
                median: 0,
                standardDeviation: 0
            };
        });

        const additionalAttributeStats = {
            skill: { values: [], total: 0, count: 0 },
            piedeDebole: { values: [], total: 0, count: 0 }
        };

        const goalkeeperAttributeStats = {
            tf: { values: [], average: 0, median: 0, standardDeviation: 0 },
            pr: { values: [], average: 0, median: 0, standardDeviation: 0 },
            rn: { values: [], average: 0, median: 0, standardDeviation: 0 },
            pz: { values: [], average: 0, median: 0, standardDeviation: 0 },
            rf: { values: [], average: 0, median: 0, standardDeviation: 0 }
        };

        const overallRatings = [];
        const positionStats = {};

        // === LOGICA CONSENSO PORTIERE ===
        // Controlla se ci sono voti per portiere con attributi GK validi
        const goalkeeperVotes = submissions.filter(sub =>
            sub.playerProfile.position === 'POR' &&
            sub.goalkeeperAttributes &&
            Object.values(sub.goalkeeperAttributes).some(val => val !== null && val !== undefined)
        );

        const isConsensusGoalkeeper = goalkeeperVotes.length > 0;

        // Filtra le submissions in base al consenso
        let filteredSubmissions;
        if (isConsensusGoalkeeper) {
            // Se c'è consenso portiere → usa SOLO i voti portiere
            filteredSubmissions = goalkeeperVotes;
            console.log(`🥅 CONSENSO PORTIERE: Usando solo ${filteredSubmissions.length} voti portiere`);
        } else {
            // Se NON c'è consenso portiere → usa SOLO i voti non-portiere
            filteredSubmissions = submissions.filter(sub => sub.playerProfile.position !== 'POR');
            console.log(`⚽ CONSENSO GIOCATORE: Usando ${filteredSubmissions.length} voti non-portiere`);
        }

        // === FINE LOGICA CONSENSO ===

        // Aggrega dati
        filteredSubmissions.forEach(submission => {
            // Attributi principali
            Object.keys(attributeStats).forEach(attr => {
                attributeStats[attr].values.push(submission.attributes[attr]);
            });

            // Attributi PORTIERE
            // Attributi portiere (se presenti)
            Object.keys(goalkeeperAttributeStats).forEach(attr => {
                if (submission.goalkeeperAttributes?.[attr] !== null && submission.goalkeeperAttributes?.[attr] !== undefined) {
                    goalkeeperAttributeStats[attr].values.push(submission.goalkeeperAttributes[attr]);
                }
            });

            // Attributi stelle
            if (submission.additionalAttributes?.skill !== null && submission.additionalAttributes?.skill !== undefined) {
                additionalAttributeStats.skill.values.push(submission.additionalAttributes.skill);
                additionalAttributeStats.skill.total += submission.additionalAttributes.skill;
                additionalAttributeStats.skill.count++;
            }

            if (submission.additionalAttributes?.piedeDebole !== null && submission.additionalAttributes?.piedeDebole !== undefined) {
                additionalAttributeStats.piedeDebole.values.push(submission.additionalAttributes.piedeDebole);
                additionalAttributeStats.piedeDebole.total += submission.additionalAttributes.piedeDebole;
                additionalAttributeStats.piedeDebole.count++;
            }

            // Overall ratings
            if (submission.overallRating && !isNaN(submission.overallRating)) {
                overallRatings.push(submission.overallRating);
            }

            // Posizioni
            if (submission.playerProfile.position) {
                const pos = submission.playerProfile.position;
                positionStats[pos] = (positionStats[pos] || 0) + 1;
            }
        });


        // CALCOLO STATISTICHE

        // Calcola statistiche attributi principali
        Object.keys(attributeStats).forEach(attr => {
            const values = attributeStats[attr].values;
            const sum = values.reduce((a, b) => a + b, 0);
            const average = sum / values.length;

            const sortedValues = [...values].sort((a, b) => a - b);
            const median = sortedValues.length % 2 === 0
                ? (sortedValues[Math.floor(sortedValues.length / 2) - 1] + sortedValues[Math.floor(sortedValues.length / 2)]) / 2
                : sortedValues[Math.floor(sortedValues.length / 2)];

            const variance = values.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / values.length;
            const standardDeviation = Math.sqrt(variance);

            attributeStats[attr].average = Math.round(average);
            attributeStats[attr].median = Math.round(median);
            attributeStats[attr].standardDeviation = Math.round(standardDeviation * 100) / 100;
        });

        // Calcola statistiche attributi portiere
        Object.keys(goalkeeperAttributeStats).forEach(attr => {
            const values = goalkeeperAttributeStats[attr].values;
            if (values.length > 0) {
                const sum = values.reduce((a, b) => a + b, 0);
                const average = sum / values.length;

                const sortedValues = [...values].sort((a, b) => a - b);
                const median = sortedValues.length % 2 === 0
                    ? (sortedValues[Math.floor(sortedValues.length / 2) - 1] + sortedValues[Math.floor(sortedValues.length / 2)]) / 2
                    : sortedValues[Math.floor(sortedValues.length / 2)];

                const variance = values.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / values.length;
                const standardDeviation = Math.sqrt(variance);


                goalkeeperAttributeStats[attr].average = Math.round(average);
                goalkeeperAttributeStats[attr].median = Math.round(median);
                goalkeeperAttributeStats[attr].standardDeviation = Math.round(standardDeviation * 100) / 100;
            }
        });

        // Calcola statistiche stelle
        Object.keys(additionalAttributeStats).forEach(attr => {
            const stat = additionalAttributeStats[attr];
            if (stat.count > 0) {
                stat.average = Math.round((stat.total / stat.count) * 100) / 100;
            } else {
                stat.average = null;
            }
        });

        // Calcola statistiche overall
        if (overallRatings.length === 0) {
            throw new AppError('Cannot calculate overall rating - no valid overall ratings found', 400);
        }

        const overallAverage = overallRatings.reduce((sum, r) => sum + r, 0) / overallRatings.length;

        if (isNaN(overallAverage) || !isFinite(overallAverage)) {
            throw new AppError('Cannot calculate overall rating - invalid submission data', 400);
        }

        const overallMedian = (() => {
            const sorted = [...overallRatings].sort((a, b) => a - b);
            return sorted.length % 2 === 0
                ? (sorted[Math.floor(sorted.length / 2) - 1] + sorted[Math.floor(sorted.length / 2)]) / 2
                : sorted[Math.floor(sorted.length / 2)];
        })();

        const overallVariance = overallRatings.reduce((sum, val) => sum + Math.pow(val - overallAverage, 2), 0) / overallRatings.length;
        const overallStandardDeviation = Math.sqrt(overallVariance);

        const overallStats = {
            average: Math.round(overallAverage),
            median: Math.round(overallMedian),
            standardDeviation: Math.round(overallStandardDeviation * 100) / 100,
            confidence: Math.max(0, 1 - (overallStandardDeviation / overallAverage))
        };

        return {
            attributeStats,
            goalkeeperAttributeStats,
            additionalAttributeStats,
            overallStats,
            positionStats,
            totalVotes: filteredSubmissions.length,
            metadata: {
                calculatedAt: new Date(),
                sessionType: 'player_card_rating',
                isGoalkeeper: isConsensusGoalkeeper  // ✅ Aggiungiamo flag portiere
            }
        };
    }

    /**
     * Crea PlayerCardResult finale
     * @param {string} sessionId - ID della sessione
     * @param {string} targetPlayerId - ID del giocatore valutato
     * @param {Object} aggregatedData - Dati aggregati
     * @param {number} totalSubmissions - Numero totale submissions
     * @returns {Promise<Object>} PlayerCardResult creato
     */
    async createPlayerCardResult(sessionId, targetPlayerId, aggregatedData, totalSubmissions) {
        try {
            const playerCardResult = await this.playerCardResultRepository.createPlayerCardResult(
                sessionId,
                targetPlayerId,
                aggregatedData,
                totalSubmissions
            );

            await this.newsService.createNewsOnPlayerCardResult({
                sessionId,
                playerId: targetPlayerId,
                aggregatedData,
                totalSubmissions,
                overallRating: result.overallRating
            });

            return playerCardResult;

        } catch (error) {
            throw new AppError(`Failed to create player card result: ${error.message}`, 500);
        }
    }

    // === VALIDATION HELPERS ===

    validateSessionId(sessionId) {
        if (!sessionId || typeof sessionId !== 'string') {
            throw new AppError('Session ID is required and must be a string', 400);
        }
    }

    validateUserId(userId) {
        if (!userId || typeof userId !== 'string') {
            throw new AppError('User ID is required and must be a string', 400);
        }
    }
}

module.exports = PlayerCardService;