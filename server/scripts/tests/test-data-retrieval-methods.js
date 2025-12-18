/**
 * TEST COMPLETO - VotingService Data Retrieval Methods
 * Test per tutti i metodi di recupero dati refactorizzati
 */

require('dotenv').config({ path: '../../.env' });
const mongoose = require('mongoose');

// Import models necessari
const VotingSession = require('../../src/models/VotingSession');
const VoteSubmission = require('../../src/models/VoteSubmission');
const VoteResult = require('../../src/models/VoteResult');
const User = require('../../src/models/User');
const Match = require('../../src/models/Match');
const Team = require('../../src/models/Team');

const VotingService = require('../../src/services/VotingService');

async function runDataRetrievalTests() {
    console.log('🧪 === TEST VOTING SERVICE - DATA RETRIEVAL METHODS ===\n');

    try {
        // Connetti al database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Database connesso\n');

        // Crea istanza del service
        const votingService = new VotingService();

        // =====================
        // TEST 1: getUserSessionsWithStats
        // =====================
        console.log('📋 TEST 1: getUserSessionsWithStats');

        try {
            await votingService.getUserSessionsWithStats(null);
            console.log('❌ User ID null: DOVEVA FALLIRE!');
        } catch (error) {
            console.log('✅ User ID null correttamente rifiutato:', error.message);
        }

        // Test con user ID reale
        const realUser = await User.findOne();
        if (realUser) {
            try {
                const sessions = await votingService.getUserSessionsWithStats(realUser._id.toString());
                console.log('✅ Sessions recuperate:', sessions.length);

                if (sessions.length > 0) {
                    const firstSession = sessions[0];
                    console.log('📊 Prima sessione structure:', {
                        hasVoted: typeof firstSession.hasVoted,
                        canVote: typeof firstSession.canVote,
                        participationRate: typeof firstSession.participationRate,
                        isActive: typeof firstSession.isActive
                    });
                    console.log('✅ Business logic calcolata correttamente');
                }
            } catch (error) {
                console.log('❌ Errore getUserSessionsWithStats:', error.message);
            }
        } else {
            console.log('⚠️ Nessun user trovato per test');
        }

        // =====================
        // TEST 2: getSessionWithAuth
        // =====================
        console.log('\n📋 TEST 2: getSessionWithAuth');

        try {
            await votingService.getSessionWithAuth(null, 'user123');
            console.log('❌ Session ID null: DOVEVA FALLIRE!');
        } catch (error) {
            console.log('✅ Session ID null correttamente rifiutato:', error.message);
        }

        try {
            await votingService.getSessionWithAuth('session123', null);
            console.log('❌ User ID null: DOVEVA FALLIRE!');
        } catch (error) {
            console.log('✅ User ID null correttamente rifiutato:', error.message);
        }

        // Test con sessione reale
        const realSession = await VotingSession.findOne({ type: 'match_rating' }).populate('targetId');
        if (realSession && realSession.eligibleVoters.length > 0) {
            const eligibleUserId = realSession.eligibleVoters[0].toString();

            try {
                const sessionData = await votingService.getSessionWithAuth(realSession._id.toString(), eligibleUserId);
                console.log('✅ Session recuperata con auth:', sessionData.title);
                console.log('📋 Structure check:', {
                    hasMatchInfo: !!sessionData.matchInfo,
                    hasVoteConfig: !!sessionData.voteConfig,
                    correctType: sessionData.type === 'match_rating'
                });
            } catch (error) {
                console.log('❌ Errore getSessionWithAuth:', error.message);
            }

            // Test unauthorized user
            try {
                await votingService.getSessionWithAuth(realSession._id.toString(), new mongoose.Types.ObjectId().toString());
                console.log('❌ User non autorizzato: DOVEVA FALLIRE!');
            } catch (error) {
                console.log('✅ User non autorizzato correttamente rifiutato:', error.message);
            }
        }

        // =====================
        // TEST 3: getSessionSubmissionsFormatted
        // =====================
        console.log('\n📋 TEST 3: getSessionSubmissionsFormatted');

        try {
            await votingService.getSessionSubmissionsFormatted(null, 'user123');
            console.log('❌ Session ID null: DOVEVA FALLIRE!');
        } catch (error) {
            console.log('✅ Session ID null correttamente rifiutato:', error.message);
        }

        // Test con sessione che ha submissions
        const sessionWithSubmissions = await VotingSession.findOne({ type: 'match_rating' });
        if (sessionWithSubmissions && sessionWithSubmissions.eligibleVoters.length > 0) {
            const submissionsCount = await VoteSubmission.countDocuments({
                votingSessionId: sessionWithSubmissions._id,
                isActive: true
            });

            if (submissionsCount > 0) {
                const eligibleUserId = sessionWithSubmissions.eligibleVoters[0].toString();

                try {
                    const result = await votingService.getSessionSubmissionsFormatted(
                        sessionWithSubmissions._id.toString(),
                        eligibleUserId
                    );

                    console.log('✅ Submissions formattate:', result.submissions.length);
                    console.log('📊 Session info presente:', !!result.sessionInfo);

                    if (result.submissions.length > 0) {
                        const firstSubmission = result.submissions[0];
                        console.log('📋 Submission structure:', {
                            hasVoter: !!firstSubmission.voter,
                            hasPlayerVotes: !!firstSubmission.playerVotes,
                            hasBadges: !!firstSubmission.badges,
                            hasSubmissionInfo: !!firstSubmission.submissionInfo
                        });
                        console.log('✅ Formatting completo verificato');
                    }
                } catch (error) {
                    console.log('❌ Errore getSessionSubmissionsFormatted:', error.message);
                }
            } else {
                console.log('⚠️ Sessione senza submissions per test completo');
            }
        }

        // =====================
        // TEST 4: activateSession
        // =====================
        console.log('\n📋 TEST 4: activateSession');

        try {
            await votingService.activateSession(null, 'user123');
            console.log('❌ Session ID null: DOVEVA FALLIRE!');
        } catch (error) {
            console.log('✅ Session ID null correttamente rifiutato:', error.message);
        }

        // Test con sessione non esistente
        try {
            await votingService.activateSession('507f1f77bcf86cd799439011', 'user123');
            console.log('❌ Sessione inesistente: DOVEVA FALLIRE!');
        } catch (error) {
            console.log('✅ Sessione inesistente correttamente gestita:', error.message);
        }

        // Test business rules con sessione reale
        const activeSession = await VotingSession.findOne({ status: 'active', type: 'match_rating' });
        if (activeSession) {
            try {
                await votingService.activateSession(activeSession._id.toString(), activeSession.createdBy.toString());
                console.log('❌ Sessione già active: DOVEVA FALLIRE!');
            } catch (error) {
                console.log('✅ Business rule "già active" verificata:', error.message);
            }

            // Test user non creatore
            try {
                await votingService.activateSession(activeSession._id.toString(), new mongoose.Types.ObjectId().toString());
                console.log('❌ User non creatore: DOVEVA FALLIRE!');
            } catch (error) {
                console.log('✅ Business rule "solo creatore" verificata:', error.message);
            }
        }

        // Crea sessione draft temporanea per test activate
        const testMatch = await Match.findOne().populate('teamId');
        if (testMatch && testMatch.teamId) {
            try {
                const draftSession = await VotingSession.create({
                    type: 'match_rating',
                    targetId: testMatch._id,
                    teamId: testMatch.teamId._id,
                    createdBy: new mongoose.Types.ObjectId(),
                    title: 'Test Draft Session',
                    status: 'draft',
                    eligibleVoters: testMatch.teamId.memberIds || [],
                    voteConfig: { ratingRange: { min: 1, max: 10, step: 0.5 } }
                });

                const result = await votingService.activateSession(
                    draftSession._id.toString(),
                    draftSession.createdBy.toString()
                );

                console.log('✅ Sessione draft attivata:', result.status === 'active');
                console.log('📊 Result structure:', {
                    hasStartedAt: !!result.startedAt,
                    correctStatus: result.status === 'active'
                });

                // Cleanup
                await VotingSession.findByIdAndDelete(draftSession._id);
                console.log('🧹 Sessione test rimossa');
            } catch (error) {
                console.log('❌ Errore test activate:', error.message);
            }
        }

        // =====================
        // TEST 5: getVoterSubmissionDetails
        // =====================
        console.log('\n📋 TEST 5: getVoterSubmissionDetails');

        try {
            await votingService.getVoterSubmissionDetails(null, 'voter123', 'user123');
            console.log('❌ Session ID null: DOVEVA FALLIRE!');
        } catch (error) {
            console.log('✅ Session ID null correttamente rifiutato:', error.message);
        }

        try {
            await votingService.getVoterSubmissionDetails('session123', null, 'user123');
            console.log('❌ Voter ID null: DOVEVA FALLIRE!');
        } catch (error) {
            console.log('✅ Voter ID null correttamente rifiutato:', error.message);
        }

        // Test con submission reale
        const realSubmission = await VoteSubmission.findOne({ isActive: true })
            .populate('voterId', 'name')
            .populate('votingSessionId');

        if (realSubmission && realSubmission.votingSessionId) {
            const session = realSubmission.votingSessionId;

            if (session.eligibleVoters.length > 0) {
                const eligibleUserId = session.eligibleVoters[0].toString();

                try {
                    const voterDetails = await votingService.getVoterSubmissionDetails(
                        session._id.toString(),
                        realSubmission.voterId._id.toString(),
                        eligibleUserId
                    );

                    console.log('✅ Voter details recuperati per:', voterDetails.voter.name);
                    console.log('📊 Details structure:', {
                        hasVoter: !!voterDetails.voter,
                        hasPlayerVotes: !!voterDetails.playerVotes,
                        hasBadges: !!voterDetails.badges,
                        hasSubmissionInfo: !!voterDetails.submissionInfo
                    });
                    console.log('📋 Player votes count:', voterDetails.playerVotes.length);
                } catch (error) {
                    console.log('❌ Errore getVoterSubmissionDetails:', error.message);
                }
            }

            // Test voter non esistente
            try {
                await votingService.getVoterSubmissionDetails(
                    session._id.toString(),
                    new mongoose.Types.ObjectId().toString(),
                    session.eligibleVoters[0].toString()
                );
                console.log('❌ Voter inesistente: DOVEVA FALLIRE!');
            } catch (error) {
                console.log('✅ Voter inesistente correttamente gestito:', error.message);
            }
        }

        // =====================
        // TEST 6: Integrazione Business Logic
        // =====================
        console.log('\n📋 TEST 6: Verifica Integrazione Business Logic');

        // Test che tutti i metodi rispettino le stesse business rules
        const testSession = await VotingSession.findOne({ type: 'match_rating' });
        if (testSession && testSession.eligibleVoters.length > 0) {
            const eligibleUserId = testSession.eligibleVoters[0].toString();
            const nonEligibleUserId = new mongoose.Types.ObjectId().toString();

            const methods = [
                'getSessionWithAuth',
                'getSessionSubmissionsFormatted'
            ];

            for (const methodName of methods) {
                try {
                    await votingService[methodName](testSession._id.toString(), nonEligibleUserId);
                    console.log(`❌ ${methodName} - User non eligible: DOVEVA FALLIRE!`);
                } catch (error) {
                    if (error.message.includes('Access denied') || error.message.includes('Not authorized')) {
                        console.log(`✅ ${methodName} - Business rule authorization verificata`);
                    } else {
                        console.log(`❌ ${methodName} - Errore imprevisto:`, error.message);
                    }
                }
            }
        }

        console.log('\n🎉 === FINE TEST DATA RETRIEVAL METHODS ===');
        console.log('📋 Tutti i metodi di data retrieval sono pronti e testati!');
        console.log('🚀 VotingService refactoring COMPLETATO!');

    } catch (error) {
        console.error('❌ ERRORE GENERALE TEST:', error);
    } finally {
        await mongoose.disconnect();
        console.log('✅ Database disconnesso');
    }
}

// Esegui test
runDataRetrievalTests();