// controllers/PlayerCardController.js
const VotingSession = require('../models/VotingSession');
const PlayerCardSubmission = require('../models/PlayerCardSubmission');
const PlayerCardResult = require('../models/PlayerCardResult');
const Team = require('../models/Team');
const User = require('../models/User');

// ✨ UTILITY FUNCTION: Auto-complete quando tutti hanno votato per Player Cards
const checkAndAutoCompletePlayerCard = async (sessionId) => {
    try {
        console.log('🔍 === CHECK AUTO-COMPLETE PLAYER CARD ===');
        console.log('📊 Session ID:', sessionId);

        const session = await VotingSession.findById(sessionId);
        if (!session || session.status !== 'active') {
            console.log('⚠️ Sessione non trovata o non attiva, skip auto-complete');
            return false;
        }

        // Conta submissions attive per Player Card
        const submissionsCount = await PlayerCardSubmission.countDocuments({
            votingSessionId: sessionId,
            isActive: true
        });

        const totalEligibleVoters = session.eligibleVoters.length;

        console.log(`📊 Voti raccolti: ${submissionsCount}/${totalEligibleVoters}`);

        // Se tutti hanno votato, auto-complete!
        if (submissionsCount === totalEligibleVoters && submissionsCount > 0) {
            console.log('🎉 TUTTI HANNO VOTATO PER PLAYER CARD! Avvio auto-complete...');

            // Chiama la funzione completePlayerCardSession esistente
            // Simula una req/res per riutilizzare la logica esistente
            const mockReq = { params: { id: sessionId }, body: { autoCompleted: true, completionType: 'automatic' } };
            const mockRes = {
                status: () => mockRes,
                json: (data) => {
                    console.log('✅ Auto-complete Player Card completato:', data.success ? 'SUCCESS' : 'FAILED');
                    return data;
                }
            };

            await completePlayerCardSession(mockReq, mockRes);
            return true;
        }

        console.log('⏳ Non tutti hanno ancora votato per Player Card, nessun auto-complete');
        return false;

    } catch (error) {
        console.error('❌ ERRORE AUTO-COMPLETE PLAYER CARD:', error.message);
        return false;
    }
};

// @desc    Create new PlayerCard evaluation request with AUTO voting session  
// @route   POST /api/v1/player-cards/sessions
// @access  Private
const createPlayerCardSession = async (req, res) => {
    try {
        console.log('\n🎯 === CREATE PLAYER CARD with AUTO VOTING ===');
        console.log('👤 User:', req.user?.name);
        console.log('📥 PlayerCard data:', req.body);

        const { targetPlayerId, title, description, deadline, teamId } = req.body;

        // Validazione campi obbligatori
        if (!targetPlayerId) {
            return res.status(400).json({
                error: 'targetPlayerId is required'
            });
        }

        // 1. VERIFICA TARGET PLAYER E TEAM (come prima)
        const targetPlayer = await User.findById(targetPlayerId);
        if (!targetPlayer) {
            return res.status(404).json({ error: 'Target player not found' });
        }

        // Usa teamId fornito o prova a derivarlo dal target player
        let finalTeamId = teamId;
        if (!finalTeamId) {
            // Trova team del target player (assumendo che sia membro)
            const team = await Team.findOne({ memberIds: targetPlayerId });
            if (!team) {
                return res.status(400).json({ error: 'Cannot determine team for target player' });
            }
            finalTeamId = team._id;
        }

        // Verifica che il team esista
        const team = await Team.findById(finalTeamId);
        if (!team) {
            return res.status(404).json({ error: 'Team not found' });
        }

        console.log('✅ Target Player validato:', targetPlayer.name);
        console.log('✅ Team validato:', team.name);

        // 2. AUTO-CREA VOTING SESSION (COME MATCH)
        const votingSession = await VotingSession.create({
            type: 'player_card_rating',
            targetType: 'player',
            targetId: targetPlayerId, // Il giocatore da valutare
            teamId: finalTeamId,
            createdBy: req.user.id,
            title: title || `📊 Valutazione Player Card per ${targetPlayer.name}`,
            description: description || `Esprimi la tua valutazione sulle abilità di ${targetPlayer.name}`,
            deadline: deadline ? new Date(deadline) : null,
            eligibleVoters: team.memberIds, // ✅ INCLUDE il target player
            status: 'active',
            allowSelfVoting: true, // ✅ Player card: ALLOW self voting
            tags: ['auto-generated', 'player-card-linked'],
            environment: 'production',
            voteConfig: {
                attributesToRate: ['tir', 'pas', 'dri', 'fin', 'vis', 'res', 'for'],
                attributeRange: { min: 10, max: 100 },
                allowComments: true
            }
        });

        console.log('✅ PlayerCard VotingSession auto-creata:', votingSession._id);
        console.log('🔗 PlayerCard e Voting collegati!');
        console.log('🎯 === FINE CREATE PLAYER CARD + AUTO VOTING ===\n');

        // 3. RITORNA ENTRAMBI + FLAG AUTO-APERTURA (COME MATCH)
        res.status(201).json({
            success: true,
            message: 'Richiesta valutazione Player Card e sessione di votazione create con successo!',
            playerCardRequest: {
                targetPlayerId: targetPlayerId,
                targetPlayerName: targetPlayer.name,
                teamId: finalTeamId,
                teamName: team.name,
                createdBy: req.user.id,
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
            },
            autoOpenVoteForm: true // 🎯 FLAG PER AUTO-APERTURA FRONTEND
        });

    } catch (error) {
        console.log('❌ ERRORE CREATE PLAYER CARD + VOTING:', error.message);
        console.log('📋 Stack:', error.stack);
        console.log('🎯 === FINE CREATE PLAYER CARD + AUTO VOTING (ERRORE) ===\n');
        res.status(500).json({ error: 'Server error creating player card evaluation and voting session' });
    }
};

// @desc    Get PlayerCard voting sessions for user
// @route   GET /api/v1/player-cards/sessions
// @access  Private
const getUserPlayerCardSessions = async (req, res) => {
    try {
        console.log('\n🟢 === GET USER PLAYER CARD SESSIONS ===');
        console.log('👤 User ID:', req.user.id);

        // Trova tutte le sessioni player_card_rating dove l'utente è eligible voter
        const votingSessions = await VotingSession.find({
            eligibleVoters: req.user.id,
            type: 'player_card_rating'
        })
            .populate('targetId', 'name email') // Il giocatore da valutare
            .sort({ createdAt: -1 })
            .limit(50);

        console.log('📊 Player card sessions trovate:', votingSessions.length);

        // Adatta le sessioni per il frontend
        const adaptedSessions = await Promise.all(votingSessions.map(async session => {
            // Verifica se user ha già votato per questo target player
            const hasVoted = await PlayerCardSubmission.exists({
                votingSessionId: session._id,
                voterId: req.user.id,
                targetPlayerId: session.targetId._id,
                isActive: true
            });

            // Conta submissions totali per questa sessione
            const submissionsCount = await PlayerCardSubmission.countDocuments({
                votingSessionId: session._id,
                isActive: true
            });

            console.log(`🔍 Session ${session.title}:`);
            console.log(`  - hasVoted: ${!!hasVoted}`);
            console.log(`  - submissionsCount: ${submissionsCount}`);
            console.log(`  - targetPlayerId: ${session.targetId._id}`);
            console.log(`  - currentUserId: ${req.user.id}`);

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
                participationRate: Math.round((submissionsCount / session.eligibleVoters.length) * 100),
                isActive: session.status === 'active',
                hasVoted: !!hasVoted,
                canVote: session.status === 'active' && !hasVoted,
                targetPlayerInfo: {
                    name: session.targetId.name,
                    email: session.targetId.email
                }
            };
        }));

        console.log('✅ Player card sessions adattate per frontend');
        console.log('🟢 === FINE GET USER PLAYER CARD SESSIONS ===\n');

        res.json({
            success: true,
            votingSessions: adaptedSessions,
            total: adaptedSessions.length
        });

    } catch (error) {
        console.log('❌ ERRORE GET USER PLAYER CARD SESSIONS:', error.message);
        console.log('📋 Stack:', error.stack);
        console.log('🟢 === FINE GET USER PLAYER CARD SESSIONS (ERRORE) ===\n');
        res.status(500).json({ error: 'Server error fetching player card sessions' });
    }
};

// @desc    Get specific PlayerCard voting session by ID
// @route   GET /api/v1/player-cards/sessions/:id
// @access  Private
const getPlayerCardSession = async (req, res) => {
    try {
        console.log('\n🟡 === GET PLAYER CARD SESSION ===');
        console.log('📋 Session ID:', req.params.id);

        const votingSession = await VotingSession.findById(req.params.id)
            .populate('targetId', 'name email');

        if (!votingSession) {
            return res.status(404).json({ error: 'Player card session not found' });
        }

        // Verifica che sia una sessione player_card_rating
        if (votingSession.type !== 'player_card_rating') {
            return res.status(400).json({ error: 'Invalid session type' });
        }

        // Verifica che l'utente sia eligible voter
        if (!votingSession.eligibleVoters.includes(req.user.id)) {
            return res.status(403).json({ error: 'Not authorized to access this player card session' });
        }

        console.log('✅ Player card session trovata:', votingSession.title);
        console.log('🎯 Target Player:', votingSession.targetId.name);
        console.log('🟡 === FINE GET PLAYER CARD SESSION ===\n');

        res.json({
            success: true,
            votingSession: {
                id: votingSession._id,
                type: votingSession.type,
                title: votingSession.title,
                description: votingSession.description,
                status: votingSession.status,
                deadline: votingSession.deadline,
                createdAt: votingSession.createdAt,
                updatedAt: votingSession.updatedAt,
                voteConfig: votingSession.voteConfig,
                targetPlayerInfo: {
                    id: votingSession.targetId._id,
                    name: votingSession.targetId.name,
                    email: votingSession.targetId.email
                }
            }
        });

    } catch (error) {
        console.log('❌ ERRORE GET PLAYER CARD SESSION:', error.message);
        console.log('🟡 === FINE GET PLAYER CARD SESSION (ERRORE) ===\n');
        res.status(500).json({ error: 'Server error fetching player card session' });
    }
};

// @desc    Submit PlayerCard vote
// @route   POST /api/v1/player-cards/sessions/:id/vote
// @access  Private
const submitPlayerCardVote = async (req, res) => {
    console.log('\n🟣 === SUBMIT PLAYER CARD VOTE ===');
    console.log('📋 Session ID:', req.params.id);
    console.log('👤 User ID:', req.user.id);

    try {
        // 1. Trova la sessione di votazione
        const session = await VotingSession.findById(req.params.id);
        if (!session) {
            return res.status(404).json({ error: 'Player card session not found' });
        }

        // 2. Validazioni specifiche per player card
        if (session.type !== 'player_card_rating') {
            return res.status(400).json({ error: 'Invalid session type' });
        }

        if (session.status !== 'active') {
            return res.status(400).json({ error: 'Player card session is not active' });
        }

        if (!session.eligibleVoters.includes(req.user.id)) {
            return res.status(403).json({ error: 'User not eligible to vote' });
        }

        // 3. Controlla se ha già votato per questo target player
        const existingVote = await PlayerCardSubmission.findOne({
            votingSessionId: session._id,
            voterId: req.user.id,
            targetPlayerId: session.targetId,
            isActive: true
        });

        if (existingVote) {
            console.log('⚠️ Utente ha già votato per questo giocatore');
            return res.status(400).json({ error: 'User has already voted for this player' });
        }

        // 4. Valida e trasforma dati dal frontend
        console.log('🔄 Validando dati player card...');
        console.log('📥 Dati ricevuti dal frontend:', JSON.stringify(req.body.vote, null, 2));

        const { attributes, additionalAttributes, playerProfile, profile, comment } = req.body.vote;

        // 🔍 DEBUG - Gestione profile vs playerProfile
        const finalProfile = playerProfile || profile;

        // Validazione attributi obbligatori
        const requiredAttributes = ['tir', 'pas', 'dri', 'fin', 'vis', 'res', 'for'];
        const missingAttributes = requiredAttributes.filter(attr =>
            !attributes || typeof attributes[attr] !== 'number'
        );

        if (missingAttributes.length > 0) {
            return res.status(400).json({
                error: `Missing required attributes: ${missingAttributes.join(', ')}`
            });
        }

        // 🎯 FIX: Validazione separata per attributi normali e stelle
        // Attributi normali (10-100): tir, pas, dri, fin, vis, res, for
        Object.entries(attributes).forEach(([attr, value]) => {
            if (requiredAttributes.includes(attr)) {
                if (value < 10 || value > 100) {
                    throw new Error(`Invalid ${attr} value: ${value}. Must be between 10 and 100.`);
                }
            }
            // ⭐ Attributi stelle (1-5): piedeDebole, skill
            else if (attr === 'piedeDebole' || attr === 'skill') {
                if (value < 1 || value > 5) {
                    throw new Error(`Invalid ${attr} value: ${value}. Must be between 1 and 5 stars.`);
                }
            }
        });

        // ⭐ Validazione separata per additionalAttributes se presenti
        if (additionalAttributes) {
            if (additionalAttributes.piedeDebole !== undefined) {
                if (additionalAttributes.piedeDebole < 1 || additionalAttributes.piedeDebole > 5) {
                    throw new Error(`Invalid piedeDebole value: ${additionalAttributes.piedeDebole}. Must be between 1 and 5 stars.`);
                }
            }
            if (additionalAttributes.skill !== undefined) {
                if (additionalAttributes.skill < 1 || additionalAttributes.skill > 5) {
                    throw new Error(`Invalid skill value: ${additionalAttributes.skill}. Must be between 1 and 5 stars.`);
                }
            }
        }

        // 5. ✅ CALCOLA OVERALL RATING MANUALMENTE (solo dai 7 attributi principali)
        const total = attributes.tir + attributes.pas + attributes.dri + attributes.fin +
            attributes.vis + attributes.res + attributes.for;
        const calculatedOverallRating = Math.round(total / 7);

        console.log('🧮 Calcolo overall rating manuale:');
        console.log('📊 Attributi principali:', {
            tir: attributes.tir,
            pas: attributes.pas,
            dri: attributes.dri,
            fin: attributes.fin,
            vis: attributes.vis,
            res: attributes.res,
            for: attributes.for
        });
        console.log('📊 Totale:', total);
        console.log('⭐ Overall Rating:', calculatedOverallRating);

        // 6. Crea e salva la submission con overall rating calcolato
        const newSubmission = new PlayerCardSubmission({
            votingSessionId: session._id,
            voterId: req.user.id,
            targetPlayerId: session.targetId,

            attributes: {
                tir: attributes.tir,
                pas: attributes.pas,
                dri: attributes.dri,
                fin: attributes.fin,
                vis: attributes.vis,
                res: attributes.res,
                for: attributes.for
            },

            additionalAttributes: {
                // 🎯 FIX: Cerca stelle in attributes prima, poi in additionalAttributes
                piedeDebole: attributes?.piedeDebole || additionalAttributes?.piedeDebole || null,
                skill: attributes?.skill || additionalAttributes?.skill || null
            },

            playerProfile: {
                position: finalProfile?.position || null
            },

            comment: comment || '',

            // ✅ ASSEGNA OVERALL RATING CALCOLATO MANUALMENTE
            overallRating: calculatedOverallRating,

            deviceInfo: req.body.deviceInfo || {},
            timeSpent: req.body.timeSpent || 0,
            version: 1,
            isActive: true,
            validated: false
        });

        console.log('🔍 DEBUG - newSubmission creato con successo');
        console.log('📊 Attributi salvati:', newSubmission.attributes);
        console.log('⭐ Additional attributes salvati:', newSubmission.additionalAttributes);
        console.log('⭐ Stelle salvate - skill:', newSubmission.additionalAttributes.skill);
        console.log('⭐ Stelle salvate - piedeDebole:', newSubmission.additionalAttributes.piedeDebole);
        console.log('👤 PlayerProfile salvato:', newSubmission.playerProfile);
        console.log('📍 Posizione salvata:', newSubmission.playerProfile.position);
        console.log('⭐ Overall Rating salvato:', newSubmission.overallRating);

        await newSubmission.save();

        console.log('✅ Voto player card salvato con successo nel database');

        // 🎯 AUTO-COMPLETE: Controlla se tutti hanno votato PRIMA di updateSummary()
        const autoCompleted = await checkAndAutoCompletePlayerCard(session._id);

        // 7. Aggiorna statistiche sessione DOPO auto-complete
        await session.updateSummary();

        console.log('🟣 === FINE SUBMIT PLAYER CARD VOTE ===\n');

        res.json({
            success: true,
            submission: {
                id: newSubmission._id,
                submittedAt: newSubmission.createdAt,
                type: 'player_card_rating',
                overallRating: newSubmission.overallRating,
                targetPlayerId: newSubmission.targetPlayerId
            },
            autoCompleted, // 🎉 Informa frontend se session è stata completata automaticamente
            message: autoCompleted ? 'Voto salvato e votazione completata automaticamente!' : 'Voto salvato con successo'
        });

    } catch (error) {
        console.log('❌ ERRORE SUBMIT PLAYER CARD VOTE:', error.message);
        console.log('📋 Stack:', error.stack);
        console.log('🟣 === FINE SUBMIT PLAYER CARD VOTE (ERRORE) ===\n');
        res.status(500).json({ error: 'Server error submitting player card vote' });
    }
};

// @desc    Get PlayerCard live calculation results
// @route   GET /api/v1/player-cards/sessions/:id/calculation
// @access  Private
const getPlayerCardCalculation = async (req, res) => {
    try {
        console.log('\n🧮 === GET PLAYER CARD CALCULATION ===');
        console.log('📊 User:', req.user?.name);
        console.log('📊 Session ID:', req.params.id);

        const { id: sessionId } = req.params;

        // 1. Verifica che la sessione esista e sia player_card_rating
        const session = await VotingSession.findById(sessionId);
        if (!session) {
            return res.status(404).json({ error: 'Player card session not found' });
        }

        if (session.type !== 'player_card_rating') {
            return res.status(400).json({ error: 'Invalid session type' });
        }

        // 2. Se la sessione è completed, cerca risultati ufficiali
        if (session.status === 'completed') {
            const officialResult = await PlayerCardResult.findOne({
                votingSessionId: sessionId,
                targetPlayerId: session.targetId,
                'sessionMetadata.sessionType': 'player_card_rating'
            });

            if (officialResult) {
                console.log('📊 Restituendo risultati player card ufficiali salvati');
                const savedResults = officialResult.getPlayerCardResults();
                if (savedResults) {
                    return res.json({
                        success: true,
                        calculation: savedResults,
                        isOfficial: true,
                        completedAt: savedResults.metadata.calculatedAt
                    });
                }
            }
        }

        // 3. Calcola risultati live
        console.log('🔄 Calcolando risultati player card al volo per sessione', session.status);
        console.log('🎯 Target Player ID:', session.targetId);
        console.log('📋 Session ID:', sessionId);

        const submissions = await PlayerCardSubmission.find({
            votingSessionId: sessionId,
            targetPlayerId: session.targetId,
            isActive: true
        }).populate('voterId', 'name');

        console.log('🗳️ SUBMISSION TROVATE:', submissions.length);
        console.log('📊 Submissions details:', submissions.map(s => ({
            voterId: s.voterId?.name || s.voterId,
            targetPlayerId: s.targetPlayerId,
            overallRating: s.overallRating,
            attributes: s.attributes
        })));

        if (submissions.length === 0) {
            console.log('❌ NESSUNA SUBMISSION TROVATA - Ritorno 404');
            return res.status(404).json({
                error: 'No votes found for this player card session',
                debug: {
                    sessionId: sessionId,
                    targetPlayerId: session.targetId,
                    sessionStatus: session.status
                }
            });
        }

        // 4. Aggrega attributi
        const attributeStats = {
            tir: { values: [], total: 0 },
            pas: { values: [], total: 0 },
            dri: { values: [], total: 0 },
            fin: { values: [], total: 0 },
            vis: { values: [], total: 0 },
            res: { values: [], total: 0 },
            for: { values: [], total: 0 }
        };

        // ⭐ AGGIUNGI STATISTICHE STELLE
        const additionalAttributeStats = {
            skill: { values: [], total: 0, count: 0 },
            piedeDebole: { values: [], total: 0, count: 0 }
        };

        const overallRatings = [];
        const positionStats = {};

        submissions.forEach(submission => {
            // Aggrega attributi
            Object.keys(attributeStats).forEach(attr => {
                const value = submission.attributes[attr];
                attributeStats[attr].values.push(value);
                attributeStats[attr].total += value;
            });

            // ⭐ AGGREGA STELLE (additionalAttributes)
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

            // Aggrega overall ratings (ora dovrebbero essere validi)
            if (submission.overallRating && !isNaN(submission.overallRating)) {
                overallRatings.push(submission.overallRating);
            }

            // Aggrega posizioni
            if (submission.playerProfile.position) {
                const pos = submission.playerProfile.position;
                positionStats[pos] = (positionStats[pos] || 0) + 1;
            }
        });

        // 5. Calcola statistiche finali
        const voteCount = submissions.length;

        // ✅ CALCOLA finalOverallRating correttamente
        const finalOverallRating = overallRatings.length > 0
            ? Math.round(overallRatings.reduce((sum, r) => sum + r, 0) / overallRatings.length)
            : null;

        const results = {
            targetPlayerId: session.targetId,
            sessionId: sessionId,

            finalAttributes: {},
            finalOverallRating: finalOverallRating,

            // ⭐ AGGIUNGI STELLE AI RISULTATI
            finalAdditionalAttributes: {},

            statistics: {
                voteCount,
                attributeBreakdown: {},
                // ⭐ AGGIUNGI BREAKDOWN STELLE
                additionalAttributeBreakdown: {}
            },

            positionConsensus: {
                mostVoted: null,
                distribution: positionStats
            }
        };

        // Calcola medie e statistiche per ogni attributo
        Object.keys(attributeStats).forEach(attr => {
            const stats = attributeStats[attr];
            const average = stats.total / voteCount;
            const sortedValues = [...stats.values].sort((a, b) => a - b);
            const median = sortedValues.length % 2 === 0
                ? (sortedValues[Math.floor(sortedValues.length / 2) - 1] + sortedValues[Math.floor(sortedValues.length / 2)]) / 2
                : sortedValues[Math.floor(sortedValues.length / 2)];

            results.finalAttributes[attr] = Math.round(average);
            results.statistics.attributeBreakdown[attr] = {
                average: Math.round(average * 10) / 10,
                median: Math.round(median * 10) / 10,
                min: Math.min(...stats.values),
                max: Math.max(...stats.values)
            };
        });

        // ⭐ CALCOLA MEDIE E STATISTICHE DELLE STELLE
        Object.keys(additionalAttributeStats).forEach(attr => {
            const stats = additionalAttributeStats[attr];
            if (stats.count > 0) {
                const average = stats.total / stats.count;
                const sortedValues = [...stats.values].sort((a, b) => a - b);
                const median = sortedValues.length % 2 === 0
                    ? (sortedValues[Math.floor(sortedValues.length / 2) - 1] + sortedValues[Math.floor(sortedValues.length / 2)]) / 2
                    : sortedValues[Math.floor(sortedValues.length / 2)];

                results.finalAdditionalAttributes[attr] = Math.round(average);
                results.statistics.additionalAttributeBreakdown[attr] = {
                    average: Math.round(average * 10) / 10,
                    median: Math.round(median * 10) / 10,
                    min: Math.min(...stats.values),
                    max: Math.max(...stats.values),
                    count: stats.count,
                    percentage: Math.round((stats.count / voteCount) * 100)
                };
            } else {
                results.finalAdditionalAttributes[attr] = null;
                results.statistics.additionalAttributeBreakdown[attr] = {
                    average: null,
                    median: null,
                    min: null,
                    max: null,
                    count: 0,
                    percentage: 0
                };
            }
        });

        // Trova posizione più votata
        if (Object.keys(positionStats).length > 0) {
            const mostVotedPos = Object.entries(positionStats)
                .sort(([, a], [, b]) => b - a)[0];
            results.positionConsensus.mostVoted = mostVotedPos[0];
        }

        console.log('✅ Calcoli player card live completati');
        console.log('📊 Target Player:', session.targetId);
        console.log('🗳️ Votanti totali:', voteCount);
        console.log('⭐ Final Overall Rating:', finalOverallRating);
        console.log('⭐ Final Additional Attributes (stelle):', results.finalAdditionalAttributes);
        console.log('📊 Stelle stats:', results.statistics.additionalAttributeBreakdown);

        res.json({
            success: true,
            calculation: results,
            isOfficial: false,
            calculatedAt: new Date()
        });

    } catch (error) {
        console.error('❌ ERRORE GET PLAYER CARD CALCULATION:', error);
        res.status(500).json({ error: 'Server error calculating player card results' });
    }
};

// @desc    Complete PlayerCard session and save official results
// @route   POST /api/v1/player-cards/sessions/:id/complete
// @access  Private
const completePlayerCardSession = async (req, res) => {
    try {
        console.log('\n🏁 === COMPLETE PLAYER CARD SESSION ===');
        console.log('📊 User:', req.user?.name);
        console.log('📊 Session ID:', req.params.id);

        const { id: sessionId } = req.params;
        const { forceReopen } = req.body || {};

        // 1. Verifica che la sessione esista e sia player_card_rating
        const session = await VotingSession.findById(sessionId);
        if (!session) {
            return res.status(404).json({ error: 'Player card session not found' });
        }

        if (session.type !== 'player_card_rating') {
            return res.status(400).json({ error: 'Invalid session type' });
        }

        // 2. ✅ RIMUOVI CONTROLLO CREATOR - TUTTI POSSONO COMPLETARE
        // (rimosso: if (session.createdBy.toString() !== req.user.id))

        // 3. Gestione force reopen
        if (session.status === 'completed' && !forceReopen) {
            const existingResult = await PlayerCardResult.findOne({
                votingSessionId: sessionId,
                targetPlayerId: session.targetId,
                'sessionMetadata.sessionType': 'player_card_rating'
            });
            if (existingResult) {
                return res.status(400).json({
                    error: 'Player card session already completed',
                    completedAt: existingResult.createdAt,
                    canReopen: true
                });
            }
        }

        if (forceReopen && session.status === 'completed') {
            session.status = 'active';
            await session.save();
            await PlayerCardResult.deleteOne({
                votingSessionId: sessionId,
                targetPlayerId: session.targetId,
                'sessionMetadata.sessionType': 'player_card_rating'
            });

            console.log('🔄 Player card session riaperta per modifiche');
            return res.json({
                success: true,
                message: 'Player card session reopened successfully',
                status: 'active'
            });
        }

        // 4. Calcola risultati finali
        const submissions = await PlayerCardSubmission.find({
            votingSessionId: sessionId,
            targetPlayerId: session.targetId,
            isActive: true
        }).populate('voterId', 'name');

        if (submissions.length === 0) {
            return res.status(400).json({ error: 'Cannot complete session with no votes' });
        }

        // 5. Aggrega dati per PlayerCardResult
        const attributeStats = {};
        const overallRatings = [];
        const positionStats = {};

        // Inizializza strutture
        ['tir', 'pas', 'dri', 'fin', 'vis', 'res', 'for'].forEach(attr => {
            attributeStats[attr] = {
                values: [],
                average: 0,
                median: 0,
                standardDeviation: 0
            };
        });

        // Aggrega dati
        submissions.forEach(submission => {
            Object.keys(attributeStats).forEach(attr => {
                attributeStats[attr].values.push(submission.attributes[attr]);
            });

            // ✅ CONTROLLO NaN per overall rating
            if (submission.overallRating && !isNaN(submission.overallRating)) {
                overallRatings.push(submission.overallRating);
            }

            if (submission.playerProfile.position) {
                const pos = submission.playerProfile.position;
                positionStats[pos] = (positionStats[pos] || 0) + 1;
            }
        });

        // ✅ VERIFICA che abbiamo overall ratings validi
        if (overallRatings.length === 0) {
            return res.status(400).json({
                error: 'Cannot calculate overall rating - no valid overall ratings found'
            });
        }

        // 6. Calcola statistiche
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

        const overallAverage = overallRatings.reduce((sum, r) => sum + r, 0) / overallRatings.length;

        // ✅ MIGLIORE CONTROLLO NaN
        if (isNaN(overallAverage) || overallRatings.length === 0 || !isFinite(overallAverage)) {
            return res.status(400).json({
                error: 'Cannot calculate overall rating - invalid submission data',
                debug: {
                    overallRatings: overallRatings,
                    overallAverage: overallAverage,
                    submissionsCount: submissions.length
                }
            });
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

        // 7. Crea e salva PlayerCardResult
        const aggregatedData = {
            attributeStats,
            overallStats,
            positionStats
        };

        const playerCardResult = PlayerCardResult.createPlayerCardResult(
            sessionId,
            session.targetId,
            aggregatedData,
            submissions.length
        );

        await playerCardResult.save();

        // 8. Aggiorna session status
        session.status = 'completed';
        session.completedAt = new Date();
        session.completionType = req.body?.completionType || 'manual'; // 'automatic' se chiamato da auto-complete
        await session.save();

        console.log('✅ Player card session completata e risultati salvati');
        console.log('📊 Target Player:', session.targetId);
        console.log('🗳️ Votanti totali:', submissions.length);
        console.log('⭐ Overall Average:', overallAverage);

        // 9. Leggi i risultati salvati per la risposta
        const savedResults = playerCardResult.getPlayerCardResults();

        res.json({
            success: true,
            message: 'Player card session completed successfully',
            officialResults: savedResults,
            completedAt: session.completedAt,
            playerCardResultId: playerCardResult._id
        });

    } catch (error) {
        console.error('❌ ERRORE COMPLETE PLAYER CARD SESSION:', error);
        res.status(500).json({ error: 'Server error completing player card session' });
    }
};

// @desc    Get PlayerCard results for specific user
// @route   GET /api/v1/player-cards/results/user/:userId
// @access  Private (team members only)
const getPlayerCardResults = async (req, res) => {
    try {
        console.log('\n🏆 === GET PLAYER CARD RESULTS ===');
        console.log('🎯 Requested User ID:', req.params.userId);
        console.log('👤 Current User:', req.user?.name);

        const { userId } = req.params;

        // Verifica che l'utente target esista
        const targetUser = await User.findById(userId);
        if (!targetUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Trova il team dell'utente che fa la richiesta
        const requesterTeam = await Team.findOne({ memberIds: req.user.id });
        if (!requesterTeam) {
            return res.status(403).json({ error: 'You must be part of a team to access player card results' });
        }

        // Verifica che l'utente target sia dello stesso team
        const targetUserTeam = await Team.findOne({ memberIds: userId });
        if (!targetUserTeam || !targetUserTeam._id.equals(requesterTeam._id)) {
            return res.status(403).json({ error: 'You can only access player card results for members of your team' });
        }

        // Trova tutti i PlayerCardResult per questo utente
        const playerCardResults = await PlayerCardResult.find({
            targetPlayerId: userId
        })
            .populate('votingSessionId', 'title description createdAt completedAt')
            .sort({ createdAt: -1 })
            .lean();

        if (playerCardResults.length === 0) {
            return res.json({
                success: true,
                playerId: userId,
                playerName: targetUser.name,
                results: [],
                total: 0,
                message: 'No player card results found for this user'
            });
        }

        // Formatta i risultati per una risposta più pulita
        const formattedResults = playerCardResults.map(result => ({
            id: result._id,
            sessionInfo: {
                id: result.votingSessionId._id,
                title: result.votingSessionId.title,
                description: result.votingSessionId.description,
                createdAt: result.votingSessionId.createdAt,
                completedAt: result.votingSessionId.completedAt
            },
            finalAttributes: result.finalAttributes,
            finalAdditionalAttributes: result.finalAdditionalAttributes,
            finalOverallRating: result.finalOverallRating,
            consensusProfile: result.consensusProfile,
            statistics: result.statistics,
            sessionMetadata: result.sessionMetadata,
            grade: result.grade,
            evaluationDate: result.createdAt
        }));

        // Calcola statistiche riassuntive
        const summaryStats = {
            totalEvaluations: playerCardResults.length,
            latestOverallRating: formattedResults[0]?.finalOverallRating,
            latestGrade: formattedResults[0]?.grade,
            averageOverallRating: Math.round(
                playerCardResults.reduce((sum, r) => sum + r.finalOverallRating, 0) / playerCardResults.length
            ),
            attributeAverages: {},
            mostVotedPosition: formattedResults[0]?.consensusProfile?.mostVotedPosition
        };

        // Calcola medie attributi attraverso tutte le valutazioni
        ['tir', 'pas', 'dri', 'fin', 'vis', 'res', 'for'].forEach(attr => {
            const total = playerCardResults.reduce((sum, r) => sum + r.finalAttributes[attr], 0);
            summaryStats.attributeAverages[attr] = Math.round(total / playerCardResults.length);
        });

        console.log('✅ PlayerCard results retrieved for user:', targetUser.name);
        console.log('📊 Total evaluations found:', playerCardResults.length);

        res.json({
            success: true,
            playerId: userId,
            playerName: targetUser.name,
            teamId: targetUserTeam._id,
            teamName: targetUserTeam.name,
            summary: summaryStats,
            results: formattedResults,
            total: playerCardResults.length
        });

    } catch (error) {
        console.error('❌ ERRORE GET PLAYER CARD RESULTS:', error);
        res.status(500).json({ error: 'Server error retrieving player card results' });
    }
};

module.exports = {
    createPlayerCardSession,
    getUserPlayerCardSessions,
    getPlayerCardSession,
    submitPlayerCardVote,
    getPlayerCardCalculation,
    completePlayerCardSession,
    getPlayerCardResults
};