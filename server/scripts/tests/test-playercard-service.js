// Test Script per PlayerCardService (da creare)
require('dotenv').config();
const mongoose = require('mongoose');

// Import tutti i model necessari
require('../../src/models/User');
require('../../src/models/Team');
require('../../src/models/VotingSession');
require('../../src/models/PlayerCardSubmission');
require('../../src/models/PlayerCardResult');

// PlayerCardService sarà creato durante il refactoring
const PlayerCardService = require('../../src/services/PlayerCardService');

async function testPlayerCardService() {
    try {
        console.log('🧪 === TEST PLAYER CARD SERVICE ===\n');

        // Connetti al database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Database connesso\n');

        // === TEST 1: VALIDATION ===
        console.log('📋 TEST 1: Player Card Input Validation');

        try {
            PlayerCardService.validatePlayerCardInput({});
            console.log('❌ FAIL: Doveva fallire la validazione player card');
        } catch (error) {
            console.log('✅ PASS: Player card validation error:', error.message);
        }

        try {
            PlayerCardService.validatePlayerCardInput({
                targetPlayerId: '507f1f77bcf86cd799439011',
                title: 'Test Player Card',
                teamId: '507f1f77bcf86cd799439012'
            });
            console.log('✅ PASS: Player card validation corretta\n');
        } catch (error) {
            console.log('❌ FAIL: Player card validation doveva passare:', error.message);
        }

        // === TEST 2: PLAYER CARD SESSION CREATION ===
        console.log('📋 TEST 2: Player Card Session Creation');

        try {
            const sessionData = {
                targetPlayerId: '507f1f77bcf86cd799439011',
                title: 'Test Player Card Session',
                description: 'Test session per player card',
                teamId: '507f1f77bcf86cd799439012',
                createdBy: '507f1f77bcf86cd799439013',
                deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 giorni
            };

            const session = await PlayerCardService.createPlayerCardSession(sessionData);
            console.log('✅ Player card session creata:', {
                id: session.votingSession.id,
                title: session.votingSession.title,
                targetPlayer: session.targetPlayer.name
            });

            // === TEST 3: PLAYER CARD SUBMISSION ===
            console.log('\n📋 TEST 3: Player Card Submission');

            const submissionData = {
                votingSessionId: session.votingSession.id,
                submitterId: '507f1f77bcf86cd799439014',
                attributes: {
                    tir: 8,
                    pas: 7,
                    dif: 6,
                    cor: 7,
                    dri: 8,
                    fis: 9,
                    vel: 7,
                    men: 8
                },
                profile: 'Attaccante completo e veloce'
            };

            const submission = await PlayerCardService.submitPlayerCard(submissionData);
            console.log('✅ Player card submitted:', {
                id: submission.id,
                overallRating: submission.overallRating,
                submitter: submission.submitterId
            });

            // === TEST 4: AUTO-COMPLETION CHECK ===
            console.log('\n📋 TEST 4: Auto-completion Check');

            const shouldComplete = await PlayerCardService.checkAutoCompletion(session.votingSession.id);
            console.log('✅ Auto-completion check:', shouldComplete);

            // === TEST 5: PLAYER CARD RESULTS CALCULATION ===
            console.log('\n📋 TEST 5: Results Calculation');

            const results = await PlayerCardService.calculatePlayerCardResults(session.votingSession.id);
            console.log('✅ Results calculated:', {
                finalOverallRating: results.finalOverallRating || 0,
                totalSubmissions: results.totalSubmissions || 0
            });

            // === TEST 6: SESSION COMPLETION ===
            console.log('\n📋 TEST 6: Session Completion');

            const completedSession = await PlayerCardService.completePlayerCardSession(session.votingSession.id);
            console.log('✅ Session completed:', {
                id: completedSession.id,
                status: completedSession.status,
                hasResults: !!completedSession.finalResults
            });

            // === TEST 7: GET PLAYER CARD HISTORY ===
            console.log('\n📋 TEST 7: Player Card History');

            const history = await PlayerCardService.getPlayerCardHistory('507f1f77bcf86cd799439011');
            console.log('✅ Player card history retrieved:', {
                count: history.length,
                hasHistory: history.length > 0
            });

            // === CLEANUP ===
            console.log('\n🧹 CLEANUP: Removing test data');
            await mongoose.model('VotingSession').findByIdAndDelete(session.votingSession.id);
            await mongoose.model('PlayerCardSubmission').deleteMany({ votingSessionId: session.votingSession.id });
            await mongoose.model('PlayerCardResult').deleteMany({ votingSessionId: session.votingSession.id });
            console.log('✅ Test data removed');

        } catch (error) {
            console.log('❌ PLAYER CARD SERVICE ERROR:', error.message);
        }

        console.log('\n🎉 === TUTTI I TEST PLAYER CARD COMPLETATI ===');

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
    testPlayerCardService();
}

module.exports = { testPlayerCardService };