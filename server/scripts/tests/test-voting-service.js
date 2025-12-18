// Test Script per VotingService (da creare)
require('dotenv').config();
const mongoose = require('mongoose');

// Import tutti i model necessari
require('../../src/models/User');
require('../../src/models/Team');
require('../../src/models/VotingSession');
require('../../src/models/VoteSubmission');
require('../../src/models/VoteResult');
require('../../src/models/Match');
require('../../src/models/PlayerLeaderboardStats');

// VotingService sarà creato durante il refactoring
const VotingService = require('../../src/services/VotingService');

async function testVotingService() {
    try {
        console.log('🧪 === TEST VOTING SERVICE ===\n');

        // Connetti al database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Database connesso\n');

        // === TEST 1: VALIDATION ===
        console.log('📋 TEST 1: Vote Input Validation');

        try {
            VotingService.validateVoteInput({});
            console.log('❌ FAIL: Doveva fallire la validazione voto');
        } catch (error) {
            console.log('✅ PASS: Vote validation error:', error.message);
        }

        try {
            VotingService.validateVoteInput({
                sessionId: '507f1f77bcf86cd799439011',
                playerId: '507f1f77bcf86cd799439012',
                rating: 7,
                submitterId: '507f1f77bcf86cd799439013'
            });
            console.log('✅ PASS: Vote validation corretta\n');
        } catch (error) {
            console.log('❌ FAIL: Vote validation doveva passare:', error.message);
        }

        // === TEST 2: VOTING SESSION CREATION ===
        console.log('📋 TEST 2: Voting Session Creation');

        try {
            const sessionData = {
                type: 'match_rating',
                title: 'Test Voting Session',
                description: 'Test session per unit test',
                teamId: '507f1f77bcf86cd799439014',
                createdBy: '507f1f77bcf86cd799439015'
            };

            const session = await VotingService.createVotingSession(sessionData);
            console.log('✅ Voting session creata:', {
                id: session.id,
                title: session.title,
                status: session.status
            });

            // === TEST 3: VOTE SUBMISSION ===
            console.log('\n📋 TEST 3: Vote Submission');

            const voteData = {
                sessionId: session.id,
                playerId: '507f1f77bcf86cd799439016',
                rating: 8,
                submitterId: '507f1f77bcf86cd799439017'
            };

            const vote = await VotingService.submitVote(voteData);
            console.log('✅ Vote submitted:', {
                id: vote.id,
                rating: vote.rating,
                sessionId: vote.sessionId
            });

            // === TEST 4: AUTO-COMPLETION CHECK ===
            console.log('\n📋 TEST 4: Auto-completion Logic');

            const shouldComplete = await VotingService.checkAutoCompletion(session.id);
            console.log('✅ Auto-completion check:', shouldComplete);

            // === TEST 5: VOTING RESULTS CALCULATION ===
            console.log('\n📋 TEST 5: Results Calculation');

            const results = await VotingService.calculateVotingResults(session.id);
            console.log('✅ Results calculated:', {
                totalVotes: results.totalVotes || 0,
                averageRating: results.averageRating || 0
            });

            // === TEST 6: SESSION COMPLETION ===
            console.log('\n📋 TEST 6: Session Completion');

            const completedSession = await VotingService.completeVotingSession(session.id);
            console.log('✅ Session completed:', {
                id: completedSession.id,
                status: completedSession.status,
                completedAt: !!completedSession.completedAt
            });

            // === CLEANUP ===
            console.log('\n🧹 CLEANUP: Removing test data');
            await mongoose.model('VotingSession').findByIdAndDelete(session.id);
            await mongoose.model('VoteSubmission').deleteMany({ votingSessionId: session.id });
            console.log('✅ Test data removed');

        } catch (error) {
            console.log('❌ VOTING SERVICE ERROR:', error.message);
        }

        console.log('\n🎉 === TUTTI I TEST VOTING COMPLETATI ===');

    } catch (error) {
        console.error('❌ ERRORE TEST:', error);
    } finally {
        await mongoose.disconnect();
        console.log('📦 Database disconnesso');
        process.exit(0);
    }
}

// Esegui i test solo se il file viene eseguito direttamente
if (require.main === module) {
    testVotingService();
}

module.exports = { testVotingService };