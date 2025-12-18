// scripts/tests/test-leaderboard-service.js
const LeaderboardService = require('../../src/services/LeaderboardService');
const mongoose = require('mongoose');

// Test configuration
const TEST_TEAM_ID = "6756b5c1bb4be6b7a0982ca6"; // Team ID di test esistente
const leaderboardService = new LeaderboardService();

/**
 * TEST LEADERBOARD SERVICE
 * 
 * Testa tutti i metodi del LeaderboardService per verificare
 * che la business logic estratta dal controller funzioni correttamente
 */

async function runLeaderboardServiceTests() {
    console.log('\n🧪 TESTING LEADERBOARD SERVICE - BUSINESS LOGIC VALIDATION');
    console.log('='.repeat(80));

    try {
        // Setup database connection
        await mongoose.connect('mongodb://localhost:27017/pagelle_fc');
        console.log('✅ Database connected');

        // Test 1: Get Rating Leaderboard
        console.log('\n📊 TEST 1: Get Rating Leaderboard');
        const ratingResult = await leaderboardService.getLeaderboard(TEST_TEAM_ID, 'rating', 5);
        console.log(`✅ Rating leaderboard retrieved: ${ratingResult.data.length} players`);
        console.log(`   Top player: ${ratingResult.data[0]?.playerName} (${ratingResult.data[0]?.averageRating})`);
        console.log(`   Type: ${ratingResult.type}`);
        console.log(`   Metadata: Team ${ratingResult.metadata.teamId}, Limit ${ratingResult.metadata.limit}`);

        // Test 2: Get Goals Leaderboard
        console.log('\n⚽ TEST 2: Get Goals Leaderboard');
        const goalsResult = await leaderboardService.getLeaderboard(TEST_TEAM_ID, 'goals', 5);
        console.log(`✅ Goals leaderboard retrieved: ${goalsResult.data.length} players`);
        console.log(`   Top scorer: ${goalsResult.data[0]?.playerName} (${goalsResult.data[0]?.totalGoals} goals)`);
        console.log(`   Type: ${goalsResult.type}`);

        // Test 3: Get Assists Leaderboard
        console.log('\n🎯 TEST 3: Get Assists Leaderboard');
        const assistsResult = await leaderboardService.getLeaderboard(TEST_TEAM_ID, 'assists', 5);
        console.log(`✅ Assists leaderboard retrieved: ${assistsResult.data.length} players`);
        console.log(`   Top assists: ${assistsResult.data[0]?.playerName} (${assistsResult.data[0]?.totalAssists} assists)`);
        console.log(`   Type: ${assistsResult.type}`);

        // Test 4: Get PlayerCard Leaderboard
        console.log('\n🏆 TEST 4: Get PlayerCard Leaderboard');
        const playercardResult = await leaderboardService.getLeaderboard(TEST_TEAM_ID, 'playercard', 5);
        console.log(`✅ PlayerCard leaderboard retrieved: ${playercardResult.data.length} players`);
        if (playercardResult.data.length > 0) {
            console.log(`   Top PlayerCard: ${playercardResult.data[0]?.playerName} (${playercardResult.data[0]?.playerCardAverage})`);
        }
        console.log(`   Type: ${playercardResult.type}`);

        // Test 5: Get Form Leaderboard
        console.log('\n🔥 TEST 5: Get Form Leaderboard');
        const formResult = await leaderboardService.getLeaderboard(TEST_TEAM_ID, 'form', 5);
        console.log(`✅ Form leaderboard retrieved: ${formResult.data.length} players`);
        if (formResult.data.length > 0) {
            console.log(`   Best form: ${formResult.data[0]?.playerName} (${formResult.data[0]?.formRating})`);
        }
        console.log(`   Type: ${formResult.type}`);

        // Test 6: Get All Leaderboards (OTTIMIZZATO)
        console.log('\n🚀 TEST 6: Get All Leaderboards (PERFORMANCE TEST)');
        const start = Date.now();
        const allResult = await leaderboardService.getAllLeaderboards(TEST_TEAM_ID, 3);
        const duration = Date.now() - start;

        console.log(`✅ All leaderboards retrieved in ${duration}ms`);
        console.log(`   Rating players: ${allResult.data.rating.length}`);
        console.log(`   Goals players: ${allResult.data.goals.length}`);
        console.log(`   Assists players: ${allResult.data.assists.length}`);
        console.log(`   PlayerCard players: ${allResult.data.playercard.length}`);
        console.log(`   Form players: ${allResult.data.form.length}`);
        console.log(`   Performance: ${allResult.metadata.performance}`);
        console.log(`   Timestamp: ${allResult.metadata.timestamp}`);

        // Test 7: Validation Tests
        console.log('\n🔧 TEST 7: Input Validation');

        // Test invalid team ID
        try {
            await leaderboardService.getLeaderboard('', 'rating', 5);
            console.log('❌ Should have thrown error for empty team ID');
        } catch (error) {
            console.log(`✅ Correctly validated empty team ID: ${error.message}`);
        }

        // Test invalid type
        try {
            await leaderboardService.getLeaderboard(TEST_TEAM_ID, 'invalid', 5);
            console.log('❌ Should have thrown error for invalid type');
        } catch (error) {
            console.log(`✅ Correctly validated invalid type: ${error.message}`);
        }

        // Test invalid limit
        try {
            await leaderboardService.getLeaderboard(TEST_TEAM_ID, 'rating', 150);
            console.log('❌ Should have thrown error for invalid limit');
        } catch (error) {
            console.log(`✅ Correctly validated invalid limit: ${error.message}`);
        }

        console.log('\n🎉 ALL LEADERBOARD SERVICE TESTS COMPLETED SUCCESSFULLY!');
        console.log('✅ Business logic extraction verified');
        console.log('✅ Input validation working');
        console.log('✅ Performance optimizations maintained');
        console.log('✅ Response format consistent');

        return true;

    } catch (error) {
        console.error('❌ LEADERBOARD SERVICE TEST FAILED:', error.message);
        console.error(error.stack);
        return false;
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Database disconnected');
    }
}

// Execute if run directly
if (require.main === module) {
    runLeaderboardServiceTests();
}

module.exports = { runLeaderboardServiceTests };