// Master Test Script - Esegue tutti i test dei servizi
require('dotenv').config();

async function runAllTests() {
    console.log('🚀 === ESECUZIONE TUTTI I TEST SERVIZI ===\n');

    const testResults = {
        auth: 'PENDING',
        voting: 'PENDING',
        match: 'PENDING',
        playerCard: 'PENDING',
        team: 'PENDING',
        leaderboard: 'PENDING'
    };

    // TEST AUTH SERVICE
    try {
        console.log('🔵 Avvio test AuthService...');
        const { testAuthService } = require('./test-auth-service');
        await testAuthService();
        testResults.auth = 'PASSED';
        console.log('✅ AuthService tests PASSED\n');
    } catch (error) {
        if (error.code === 'MODULE_NOT_FOUND' && error.message.includes('AuthService')) {
            testResults.auth = 'SKIPPED (Service not yet created)';
            console.log('⚠️ AuthService tests SKIPPED (Service not yet created)\n');
        } else {
            testResults.auth = 'FAILED';
            console.log('❌ AuthService tests FAILED:', error.message, '\n');
        }
    }

    // TEST VOTING SERVICE  
    try {
        console.log('🟡 Avvio test VotingService...');
        const { testVotingService } = require('./test-voting-service');
        await testVotingService();
        testResults.voting = 'PASSED';
        console.log('✅ VotingService tests PASSED\n');
    } catch (error) {
        if (error.code === 'MODULE_NOT_FOUND' && error.message.includes('VotingService')) {
            testResults.voting = 'SKIPPED (Service not yet created)';
            console.log('⚠️ VotingService tests SKIPPED (Service not yet created)\n');
        } else {
            testResults.voting = 'FAILED';
            console.log('❌ VotingService tests FAILED:', error.message, '\n');
        }
    }

    // TEST MATCH SERVICE  
    try {
        console.log('🟢 Avvio test MatchService...');
        const { testMatchService } = require('./test-match-service');
        await testMatchService();
        testResults.match = 'PASSED';
        console.log('✅ MatchService tests PASSED\n');
    } catch (error) {
        if (error.code === 'MODULE_NOT_FOUND' && error.message.includes('MatchService')) {
            testResults.match = 'SKIPPED (Service not yet created)';
            console.log('⚠️ MatchService tests SKIPPED (Service not yet created)\n');
        } else {
            testResults.match = 'FAILED';
            console.log('❌ MatchService tests FAILED:', error.message, '\n');
        }
    }

    // TEST PLAYER CARD SERVICE  
    try {
        console.log('🟣 Avvio test PlayerCardService...');
        const { testPlayerCardService } = require('./test-playercard-service');
        await testPlayerCardService();
        testResults.playerCard = 'PASSED';
        console.log('✅ PlayerCardService tests PASSED\n');
    } catch (error) {
        if (error.code === 'MODULE_NOT_FOUND' && error.message.includes('PlayerCardService')) {
            testResults.playerCard = 'SKIPPED (Service not yet created)';
            console.log('⚠️ PlayerCardService tests SKIPPED (Service not yet created)\n');
        } else {
            testResults.playerCard = 'FAILED';
            console.log('❌ PlayerCardService tests FAILED:', error.message, '\n');
        }
    }

    // TEST TEAM SERVICE  
    try {
        console.log('🔴 Avvio test TeamService...');
        const { testTeamService } = require('./test-team-service');
        await testTeamService();
        testResults.team = 'PASSED';
        console.log('✅ TeamService tests PASSED\n');
    } catch (error) {
        if (error.code === 'MODULE_NOT_FOUND' && error.message.includes('TeamService')) {
            testResults.team = 'SKIPPED (Service not yet created)';
            console.log('⚠️ TeamService tests SKIPPED (Service not yet created)\n');
        } else {
            testResults.team = 'FAILED';
            console.log('❌ TeamService tests FAILED:', error.message, '\n');
        }
    }

    // TEST LEADERBOARD SERVICE  
    try {
        console.log('🟠 Avvio test LeaderboardService...');
        const { testLeaderboardService } = require('./test-leaderboard-service');
        await testLeaderboardService();
        testResults.leaderboard = 'PASSED';
        console.log('✅ LeaderboardService tests PASSED\n');
    } catch (error) {
        if (error.code === 'MODULE_NOT_FOUND' && error.message.includes('LeaderboardService')) {
            testResults.leaderboard = 'SKIPPED (Service not yet created)';
            console.log('⚠️ LeaderboardService tests SKIPPED (Service not yet created)\n');
        } else {
            testResults.leaderboard = 'FAILED';
            console.log('❌ LeaderboardService tests FAILED:', error.message, '\n');
        }
        console.log('🎯 === RISULTATI FINALI TEST SERVIZI ===');
        console.log('📊 Summary:');
        console.log(`   AuthService:       ${testResults.auth}`);
        console.log(`   VotingService:     ${testResults.voting}`);
        console.log(`   MatchService:      ${testResults.match}`);
        console.log(`   PlayerCardService: ${testResults.playerCard}`);
        console.log(`   TeamService:       ${testResults.team}`);
        console.log(`   LeaderboardService: ${testResults.leaderboard}`);
        console.log('');

        const passedCount = Object.values(testResults).filter(result => result === 'PASSED').length;
        const failedCount = Object.values(testResults).filter(result => result === 'FAILED').length;
        const skippedCount = Object.values(testResults).filter(result => result.includes('SKIPPED')).length;

        console.log(`🎉 PASSED: ${passedCount}`);
        console.log(`❌ FAILED: ${failedCount}`);
        console.log(`⚠️ SKIPPED: ${skippedCount}`);
        console.log('');

        if (failedCount === 0) {
            console.log('🏆 TUTTI I TEST DISPONIBILI SONO PASSATI!');
        } else {
            console.log('⚠️ Alcuni test sono falliti. Controllare gli errori sopra.');
        }

        console.log('🎯 === FINE TEST SERVIZI ===');
    }

    // Esegui tutti i test se il file viene chiamato direttamente
    if (require.main === module) {
        runAllTests()
            .then(() => process.exit(0))
            .catch((error) => {
                console.error('❌ ERRORE GENERALE:', error);
                process.exit(1);
            });
    }

    module.exports = { runAllTests };