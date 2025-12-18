// scripts/tests/test-playercard-service-fixed.js
const PlayerCardService = require('../../src/services/PlayerCardService');
const mongoose = require('mongoose');
require('dotenv').config();

// Test configuration - IDs reali dal database di produzione
const TEST_TEAM_ID = "6932f76cdd1f324fdff48481"; // DosiMele team
const TEST_USER_ID = "6932f5c0dd1f324fdff4847a"; // Six (team creator)
const TEST_TARGET_PLAYER_ID = "6932f50ddd1f324fdff48476"; // Dux (target per valutazione)

const playerCardService = new PlayerCardService();

/**
 * TEST PLAYER CARD SERVICE
 * 
 * Testa tutti i metodi del PlayerCardService per verificare
 * che la business logic estratta dal controller funzioni correttamente
 */

async function runPlayerCardServiceTests() {
    console.log('\n🧪 TESTING PLAYER CARD SERVICE - BUSINESS LOGIC VALIDATION');
    console.log('='.repeat(80));

    let sessionResult = null;
    let testSessionId = null;

    try {
        // Setup database connection to production
        process.env.NODE_ENV = 'production';
        const mongoUri = process.env.MONGODB_URI;

        await mongoose.connect(mongoUri);
        console.log('✅ Database connected to production');
        console.log('🎯 Database:', mongoose.connection.name);

        // Test 1: Input Validation Tests
        console.log('\n🔧 TEST 1: Input Validation');

        // Test invalid session creation
        try {
            await playerCardService.createPlayerCardSession(TEST_USER_ID, {
                // Missing required targetPlayerId
                title: 'Test Player Card'
            });
            console.log('❌ Should have thrown error for missing targetPlayerId');
        } catch (error) {
            console.log(`✅ Correctly validated missing targetPlayerId: ${error.message}`);
        }

        // Test invalid vote data
        try {
            await playerCardService.submitPlayerCardVote('invalid-session-id', TEST_USER_ID, {
                vote: {
                    attributes: {
                        tir: 50 // Missing required attributes
                    }
                }
            });
            console.log('❌ Should have thrown error for invalid session');
        } catch (error) {
            console.log(`✅ Correctly validated invalid session: ${error.message}`);
        }

        // Test 2: Create Player Card Session
        console.log('\n📋 TEST 2: Create Player Card Session');
        try {
            sessionResult = await playerCardService.createPlayerCardSession(TEST_USER_ID, {
                targetPlayerId: TEST_TARGET_PLAYER_ID,
                title: 'Test Player Card Session',
                description: 'Valutazione di test per il service',
                teamId: TEST_TEAM_ID
            });

            console.log('✅ Player card session created successfully');
            console.log(`   Target player: ${sessionResult.playerCardRequest.targetPlayerName}`);
            console.log(`   Team: ${sessionResult.playerCardRequest.teamName}`);
            console.log(`   Voting session ID: ${sessionResult.votingSession.id}`);
            console.log(`   Eligible voters: ${sessionResult.votingSession.eligibleVoters}`);

            // Save session ID for next tests (convert to string!)
            testSessionId = sessionResult.votingSession.id.toString();
            console.log(`   Session ID type: ${typeof testSessionId}, value: "${testSessionId}"`);

        } catch (error) {
            console.log(`❌ Failed to create player card session: ${error.message}`);
        }

        // Test 3: Get User Player Card Sessions
        console.log('\n📊 TEST 3: Get User Player Card Sessions');
        try {
            const sessionsResult = await playerCardService.getUserPlayerCardSessions(TEST_USER_ID);

            console.log('✅ User player card sessions retrieved');
            console.log(`   Total sessions: ${sessionsResult.total}`);
            console.log(`   Active sessions: ${sessionsResult.votingSessions.filter(s => s.isActive).length}`);

            if (sessionsResult.votingSessions.length > 0) {
                const firstSession = sessionsResult.votingSessions[0];
                console.log(`   Sample session: "${firstSession.title}" - ${firstSession.status}`);
                console.log(`   Target player: ${firstSession.targetPlayerInfo?.name || 'N/A'}`);
                console.log(`   Can vote: ${firstSession.canVote}, Has voted: ${firstSession.hasVoted}`);
            }

        } catch (error) {
            console.log(`❌ Failed to get user sessions: ${error.message}`);
        }

        // Test 4: Get Specific Player Card Session
        if (testSessionId) {
            console.log('\n🟢 TEST 4: Get Specific Player Card Session');
            try {
                const sessionDetailsResult = await playerCardService.getPlayerCardSession(testSessionId, TEST_USER_ID);

                console.log('✅ Player card session details retrieved');
                console.log(`   Session title: "${sessionDetailsResult.session.title}"`);
                console.log(`   Status: ${sessionDetailsResult.session.status}`);
                console.log(`   Target player: ${sessionDetailsResult.session.targetPlayerInfo?.name || 'N/A'}`);
                console.log(`   Eligible voters: ${sessionDetailsResult.session.eligibleVoters.length}`);
                console.log(`   Submissions count: ${sessionDetailsResult.session.submissionsCount}`);
                console.log(`   Participation rate: ${sessionDetailsResult.session.participationRate}%`);

            } catch (error) {
                console.log(`❌ Failed to get session details: ${error.message}`);
            }
        }

        // Test 5: Submit Player Card Vote
        if (testSessionId) {
            console.log('\n🟣 TEST 5: Submit Player Card Vote');
            try {
                const voteData = {
                    vote: {
                        attributes: {
                            tir: 85,      // 10-100 range
                            pas: 78,
                            dri: 82,
                            fin: 80,
                            vis: 75,
                            res: 88,
                            for: 90
                        },
                        additionalAttributes: {
                            piedeDebole: 3,  // 1-5 stars
                            skill: 4         // 1-5 stars
                        },
                        playerProfile: {
                            position: 'CC'
                        },
                        comment: 'Ottimo giocatore di centrocampo, molto fisico'
                    },
                    deviceInfo: { platform: 'test' },
                    timeSpent: 120
                };

                const voteResult = await playerCardService.submitPlayerCardVote(
                    testSessionId,
                    TEST_USER_ID,
                    voteData
                );

                console.log('✅ Player card vote submitted successfully');
                console.log(`   Submission ID: ${voteResult.submission.id}`);
                console.log(`   Overall rating: ${voteResult.submission.overallRating}`);
                console.log(`   Target player: ${voteResult.submission.targetPlayerId}`);
                console.log(`   Auto-completed: ${voteResult.autoCompleted}`);

            } catch (error) {
                console.log(`❌ Failed to submit vote: ${error.message}`);
                // Expected if user already voted
                if (error.message.includes('already voted')) {
                    console.log('ℹ️  This is expected if user already voted for this player');
                }
            }
        }

        // Test 6: Get Player Card Calculation
        if (testSessionId) {
            console.log('\n🧮 TEST 6: Get Player Card Calculation');
            try {
                const calculationResult = await playerCardService.getPlayerCardCalculation(testSessionId);

                console.log('✅ Player card calculation retrieved');
                console.log(`   Is official: ${calculationResult.isOfficial}`);
                console.log(`   Total votes: ${calculationResult.calculation?.totalVotes || 'N/A'}`);

                if (calculationResult.calculation?.overallStats) {
                    console.log(`   Overall average: ${calculationResult.calculation.overallStats.average}`);
                    console.log(`   Overall std dev: ${calculationResult.calculation.overallStats.standardDeviation}`);
                }

                if (calculationResult.calculation?.attributeStats) {
                    const attrs = calculationResult.calculation.attributeStats;
                    console.log(`   Top attributes: TIR:${attrs.tir?.average || 'N/A'}, PAS:${attrs.pas?.average || 'N/A'}, DRI:${attrs.dri?.average || 'N/A'}`);
                }

            } catch (error) {
                console.log(`❌ Failed to get calculation: ${error.message}`);
                if (error.message.includes('No votes found')) {
                    console.log('ℹ️  This is expected if no votes have been submitted yet');
                }
            }
        }

        // Test 7: Complete Player Card Session (SKIPPED)
        if (testSessionId) {
            console.log('\n🏁 TEST 7: Complete Player Card Session (SKIPPED - to preserve test data)');
            console.log('ℹ️  Session completion skipped to avoid finalizing test session');
            console.log(`   Session ID for manual testing: ${testSessionId}`);
        }

        // Test 8: Get Player Card Results (historical)
        console.log('\n🏆 TEST 8: Get Player Card Results');
        try {
            const resultsData = await playerCardService.getPlayerCardResults({
                targetPlayerId: TEST_TARGET_PLAYER_ID,
                limit: 3,
                offset: 0
            });

            console.log('✅ Player card historical results retrieved');
            console.log(`   Total results found: ${resultsData.pagination.total}`);
            console.log(`   Results returned: ${resultsData.results.length}`);

            if (resultsData.results.length > 0) {
                const latest = resultsData.results[0];
                console.log(`   Latest result: Overall ${latest.overallRating || 'N/A'} with ${latest.totalVotes} votes`);
                console.log(`   Created: ${new Date(latest.createdAt).toLocaleDateString()}`);
            }

        } catch (error) {
            console.log(`❌ Failed to get historical results: ${error.message}`);
        }

        console.log('\n✅ === ALL PLAYER CARD SERVICE TESTS COMPLETED ===');

    } catch (error) {
        console.error('\n❌ Test suite failed:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        // Close database connection
        await mongoose.connection.close();
        console.log('\n📊 Database connection closed');
    }
}

// Run the tests
runPlayerCardServiceTests().catch(console.error);