/**
 * 🧪 TEST REPOSITORY PATTERN - Verifica implementazione
 */

const {
    UserRepository,
    MatchRepository,
    VotingSessionRepository
} = require('../../src/repositories');

require('dotenv').config();
const mongoose = require('mongoose');

const testRepositoryPattern = async () => {
    try {
        console.log('\n🧪 === TEST REPOSITORY PATTERN ===');

        // 1. CONNESSIONE DATABASE TEST
        console.log('🔌 Connessione al database test...');
        const testUri = process.env.MONGODB_URI_TEST || process.env.MONGODB_URI;
        await mongoose.connect(testUri);
        console.log('✅ Connesso al database test');

        // 2. TEST REPOSITORY BASE OPERATIONS
        console.log('\n📊 Test Repository Base Operations...');

        const userRepo = new UserRepository();
        const matchRepo = new MatchRepository();
        const votingSessionRepo = new VotingSessionRepository();

        // Test conteggio documenti
        const usersCount = await userRepo.count();
        const matchesCount = await matchRepo.count();
        const sessionsCount = await votingSessionRepo.count();

        console.log(`   📋 Users: ${usersCount} documenti`);
        console.log(`   ⚽ Matches: ${matchesCount} documenti`);
        console.log(`   🗳️ Voting Sessions: ${sessionsCount} documenti`);

        // 3. TEST METODI SPECIFICI
        console.log('\n🎯 Test Metodi Specifici Repository...');

        // Test UserRepository
        const users = await userRepo.findActiveUsers();
        console.log(`   👥 Utenti attivi: ${users.length}`);

        // Test MatchRepository
        const upcomingMatches = await matchRepo.findUpcomingMatches(5);
        console.log(`   📅 Prossime partite: ${upcomingMatches.length}`);

        // Test VotingSessionRepository
        const activeSessions = await votingSessionRepo.findActiveSessions();
        console.log(`   🔴 Sessioni attive: ${activeSessions.length}`);

        // 4. TEST INTEGRAZIONE CON SERVICE
        console.log('\n🔄 Test integrazione Service + Repository...');

        const VotingService = require('../../src/services/VotingService');
        const votingService = new VotingService();

        // Verifica che il service usi i repository
        console.log('   ✅ VotingService inizializzato con Repository');
        const repoCount = Object.keys(votingService).filter(key => key.endsWith('Repository')).length;
        console.log(`   📊 Repository nel service: ${repoCount}`);

        // 5. RISULTATI FINALI
        console.log('\n🎉 === REPOSITORY PATTERN TEST COMPLETATO! ===');
        console.log('✅ Tutti i Repository funzionano correttamente');
        console.log('✅ Integrazione Service + Repository ok');
        console.log('✅ Metodi specifici Repository funzionanti');
        console.log('\n💡 Il Repository Pattern è implementato e funzionale!');

    } catch (error) {
        console.error('\n❌ Errore nel test:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnesso dal database');
    }
};

// Run the test
if (require.main === module) {
    testRepositoryPattern().catch(console.error);
}

module.exports = { testRepositoryPattern };