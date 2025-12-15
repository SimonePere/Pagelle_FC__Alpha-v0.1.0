require('dotenv').config();
const mongoose = require('mongoose');

// Import dei modelli
const Match = require('./src/models/Match');
const VotingSession = require('./src/models/VotingSession');
const VoteResult = require('./src/models/VoteResult');
const PlayerLeaderboardStats = require('./src/models/PlayerLeaderboardStats');

async function connectDB() {
    try {
        // Usa la stessa logica del backend per selezione database
        const nodeEnv = process.env.NODE_ENV?.trim();
        const mongoUri = nodeEnv === 'test'
            ? process.env.MONGODB_URI_TEST
            : process.env.MONGODB_URI;

        console.log(`🔍 NODE_ENV: "${nodeEnv}"`);
        console.log(`🔗 Selected URI contains: ${mongoUri?.includes('test') ? 'TEST' : 'PROD'} database`);

        await mongoose.connect(mongoUri);
        console.log('✅ MongoDB Connesso');
    } catch (error) {
        console.error('❌ Errore connessione MongoDB:', error);
        process.exit(1);
    }
}

async function cleanupBulkData() {
    console.log('🧹 === PULIZIA COMPLETA DATI BULK ===\n');

    try {
        // PULIZIA COMPLETA: Rimuovi TUTTO quello che abbiamo creato
        console.log('🔄 Rimuovendo TUTTI i dati di test...\n');

        // 1. Rimuovi TUTTI i VoteResult
        const deletedVoteResults = await VoteResult.deleteMany({});
        console.log(`✅ Rimossi ${deletedVoteResults.deletedCount} VoteResult`);

        // 2. Rimuovi TUTTE le VotingSession  
        const deletedSessions = await VotingSession.deleteMany({});
        console.log(`✅ Rimosse ${deletedSessions.deletedCount} VotingSession`);

        // 3. Rimuovi TUTTI i Match
        const deletedMatches = await Match.deleteMany({});
        console.log(`✅ Rimossi ${deletedMatches.deletedCount} Match`);

        // 4. Azzera TUTTE le statistiche PlayerLeaderboardStats
        const resetStats = await PlayerLeaderboardStats.deleteMany({});
        console.log(`✅ Rimossi ${resetStats.deletedCount} PlayerLeaderboardStats`);

        console.log('\n🎉 === PULIZIA COMPLETA COMPLETATA ===');
        console.log('✅ Database completamente pulito e pronto per nuovo inserimento');

    } catch (error) {
        console.error('❌ Errore durante la pulizia completa:', error);
    }
}

async function main() {
    try {
        await connectDB();
        await cleanupBulkData();

        console.log('\n✅ Script di pulizia completato!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Errore generale:', error);
        process.exit(1);
    }
}

// Esegui solo se chiamato direttamente
if (require.main === module) {
    main();
}