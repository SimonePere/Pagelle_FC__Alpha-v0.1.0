/**
 * SCRIPT per sincronizzare manualmente PlayerLeaderboardStats con PlayerCardResult - PRODUZIONE
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const PlayerCardResult = require(path.join(__dirname, '..', 'src', 'models', 'PlayerCardResult'));
const PlayerLeaderboardStats = require(path.join(__dirname, '..', 'src', 'models', 'PlayerLeaderboardStats'));
const User = require(path.join(__dirname, '..', 'src', 'models', 'User'));

async function manualSyncLeaderboard() {
    try {
        console.log('🔄 Starting manual PlayerLeaderboard sync - PRODUCTION...');

        // Connetti al DB PRODUZIONE
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to PRODUCTION database');
        console.log('🚨 WARNING: Operating on PRODUCTION data!');

        // Trova tutti i PlayerCardResult con i dati dei giocatori
        const results = await PlayerCardResult.find({}).populate('targetPlayerId');
        console.log(`📋 Found ${results.length} PlayerCardResults`);

        // Per ogni risultato, aggiorna/crea la stat nella leaderboard
        for (const result of results) {
            if (!result.targetPlayerId) {
                console.log(`⚠️ Skipping result ${result._id} - no targetPlayerId`);
                continue;
            }

            const playerName = result.targetPlayerId.username;
            const playerId = result.targetPlayerId._id;
            const overallRating = result.finalOverallRating;

            console.log(`🔄 Syncing ${playerName}: ${overallRating}`);

            // Aggiorna/crea la stat per questo giocatore
            await PlayerLeaderboardStats.findOneAndUpdate(
                {
                    playerId: playerId
                },
                {
                    $set: {
                        playerName: playerName,
                        playerCardTOT: overallRating,
                        lastUpdatedAt: new Date()
                    }
                },
                {
                    upsert: true, // Crea se non esiste
                    new: true
                }
            );

            console.log(`✅ Updated PlayerLeaderboardStats for ${playerName}`);
        }

        console.log('🎉 Manual sync completed!');

        // Verifica i risultati
        const leaderboardStats = await PlayerLeaderboardStats.find({}).sort({ playerCardTOT: -1 });
        console.log('\n📊 FINAL PRODUCTION LEADERBOARD:');
        for (const stat of leaderboardStats) {
            console.log(`- ${stat.playerName}: ${stat.playerCardTOT || 'N/A'}`);
        }

        await mongoose.disconnect();

    } catch (error) {
        console.error('❌ Error:', error);
        await mongoose.disconnect();
    }
}

manualSyncLeaderboard();