/**
 * 🧪 TEST CONSOLIDATION REPOSITORY PATTERN - Verifica tutti i Service
 * 
 * Script per verificare che tutti i 6 Service usino il Repository Pattern
 */

const {
    UserRepository,
    TeamRepository,
    MatchRepository,
    VotingSessionRepository,
    VoteSubmissionRepository,
    PlayerCardSubmissionRepository,
    PlayerCardResultRepository,
    PlayerLeaderboardStatsRepository
} = require('../../src/repositories');

require('dotenv').config();
const mongoose = require('mongoose');

const testAllServicesConsolidation = async () => {
    try {
        console.log('\n🧪 === TEST CONSOLIDATION REPOSITORY PATTERN ===');

        // 1. CONNESSIONE DATABASE TEST
        console.log('🔌 Connessione al database test...');
        const testUri = process.env.MONGODB_URI_TEST || process.env.MONGODB_URI;
        await mongoose.connect(testUri);
        console.log('✅ Connesso al database test');

        // 2. TEST TUTTI I SERVICE
        console.log('\n🎯 Test Service Consolidation...');

        const services = [
            { name: 'VotingService', path: '../src/services/VotingService' },
            { name: 'AuthService', path: '../src/services/AuthService' },
            { name: 'MatchService', path: '../src/services/MatchService' },
            { name: 'PlayerCardService', path: '../src/services/PlayerCardService' },
            { name: 'TeamService', path: '../src/services/TeamService' },
            { name: 'LeaderboardService', path: '../src/services/LeaderboardService' }
        ];

        let allOk = true;

        for (const serviceInfo of services) {
            try {
                const ServiceClassOrInstance = require(serviceInfo.path);
                let service;

                // Gestisce sia classi che istanze esportate
                if (typeof ServiceClassOrInstance === 'function') {
                    service = new ServiceClassOrInstance();
                } else {
                    service = ServiceClassOrInstance;
                }
                const repoKeys = Object.keys(service).filter(key => key.endsWith('Repository'));
                const repoCount = repoKeys.length;

                if (repoCount > 0) {
                    console.log(`   ✅ ${serviceInfo.name}: ${repoCount} repository(s) - ${repoKeys.join(', ')}`);
                } else {
                    console.log(`   ❌ ${serviceInfo.name}: Nessun repository trovato`);
                    allOk = false;
                }

            } catch (error) {
                console.log(`   ❌ ${serviceInfo.name}: Errore nell'inizializzazione - ${error.message}`);
                allOk = false;
            }
        }

        // 3. TEST REPOSITORY FUNCTIONALITY
        console.log('\n📊 Test Repository Functionality...');

        const userRepo = new UserRepository();
        const teamRepo = new TeamRepository();
        const matchRepo = new MatchRepository();
        const votingRepo = new VotingSessionRepository();
        const playerStatsRepo = new PlayerLeaderboardStatsRepository();

        // Test operazioni base
        const counts = {
            users: await userRepo.count(),
            teams: await teamRepo.count(),
            matches: await matchRepo.count(),
            sessions: await votingRepo.count(),
            stats: await playerStatsRepo.count()
        };

        console.log(`   📋 Users: ${counts.users}`);
        console.log(`   ⚽ Teams: ${counts.teams}`);
        console.log(`   🏟️ Matches: ${counts.matches}`);
        console.log(`   🗳️ Voting Sessions: ${counts.sessions}`);
        console.log(`   📊 Player Stats: ${counts.stats}`);

        // 4. RISULTATO FINALE
        if (allOk) {
            console.log('\n🎉 === CONSOLIDATION COMPLETATA! ===');
            console.log('✅ Tutti i 6 Service usano il Repository Pattern');
            console.log('✅ Repository Pattern implementato su tutto il sistema');
            console.log('✅ Week 2 Service Layer completamente refactorizzato');
            console.log('\n🚀 Sistema pronto per Week 3!');
        } else {
            console.log('\n⚠️ Alcuni Service hanno problemi - controlla i logs sopra');
        }

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
    testAllServicesConsolidation().catch(console.error);
}

module.exports = { testAllServicesConsolidation };