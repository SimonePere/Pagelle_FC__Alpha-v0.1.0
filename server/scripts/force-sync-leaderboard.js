/**
 * SCRIPT per forzare sincronizzazione PlayerLeaderboardStats
 * Risalva tutti i PlayerCardResult per triggerare gli hooks
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const PlayerCardResult = require(path.join(__dirname, '..', 'src', 'models', 'PlayerCardResult'));
const PlayerLeaderboardStats = require(path.join(__dirname, '..', 'src', 'models', 'PlayerLeaderboardStats'));
const VotingSession = require(path.join(__dirname, '..', 'src', 'models', 'VotingSession'));
const User = require(path.join(__dirname, '..', 'src', 'models', 'User'));

async function forceSyncLeaderboard() {
    try {
        console.log('🔄 Starting forced PlayerLeaderboard sync...');

        // Connetti al DB PRODUZIONE
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to PRODUCTION database');

        // Trova tutti i PlayerCardResult
        const results = await PlayerCardResult.find({});
        console.log(`📋 Found ${results.length} PlayerCardResults`);

        // Risalva ogni documento per triggerare post('save') hook
        for (const result of results) {
            console.log(`🔄 Force saving: ${result._id}`);
            await result.save(); // Questo triggerà l'hook post('save')
            console.log('✅ Saved - hook should have fired');
        }

        console.log('🎉 Sync completed!');
        await mongoose.disconnect();

    } catch (error) {
        console.error('❌ Error:', error);
        await mongoose.disconnect();
    }
}

forceSyncLeaderboard();