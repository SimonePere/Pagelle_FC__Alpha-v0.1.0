/**
 * SCRIPT RICALCOLO OVERALL RATING PLAYERCARD
 * Ricalcola tutti i PlayerCardResult esistenti con il nuovo sistema di pesi
 */

const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Carica il .env dalla cartella parent (server)
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Import modelli singolarmente
const PlayerCardResult = require(path.join(__dirname, '..', 'src', 'models', 'PlayerCardResult'));
const PlayerCardSubmission = require(path.join(__dirname, '..', 'src', 'models', 'PlayerCardSubmission'));
const PlayerCardService = require(path.join(__dirname, '..', 'src', 'services', 'PlayerCardService'));
const { getZoneFromPosition, getWeightsForZone } = require(path.join(__dirname, '..', 'src', 'utils', 'PositionWeights'));

// Statistiche per il log
const stats = {
    totalResults: 0,
    processed: 0,
    updated: 0,
    unchanged: 0,
    errors: 0,
    changes: []
};

/**
 * Ricalcola overall rating per un singolo PlayerCardResult
 */
async function recalculateResult(result) {
    try {
        console.log(`\n🔄 Processing: ${result._id}`);

        // 1. Trova tutte le submissions originali per questo result
        const submissions = await PlayerCardSubmission.find({
            votingSessionId: result.votingSessionId,
            targetPlayerId: result.targetPlayerId,
            isActive: true
        });

        if (submissions.length === 0) {
            console.log('⚠️ No submissions found, skipping...');
            return false;
        }

        // 2. Determina posizione di consenso
        const positionStats = {};
        submissions.forEach(sub => {
            if (sub.playerProfile?.position) {
                const pos = sub.playerProfile.position;
                positionStats[pos] = (positionStats[pos] || 0) + 1;
            }
        });

        const consensusPosition = Object.keys(positionStats).reduce((a, b) =>
            positionStats[a] > positionStats[b] ? a : b
        );

        console.log(`📍 Consensus position: ${consensusPosition}`);
        console.log(`📊 Position distribution:`, positionStats);

        // 3. Ricalcola overall rating per ogni submission
        const playerCardService = new PlayerCardService();
        let newOverallRatings = [];

        submissions.forEach(submission => {
            const isGoalkeeper = submission.playerProfile?.position === 'POR';
            const newRating = playerCardService.calculateOverallRating(
                submission.attributes,
                isGoalkeeper,
                submission.goalkeeperAttributes,
                submission.playerProfile?.position || consensusPosition
            );
            newOverallRatings.push(newRating);
        });

        // 4. Calcola nuovo overall finale (media)
        const newFinalRating = Math.round(
            newOverallRatings.reduce((sum, rating) => sum + rating, 0) / newOverallRatings.length
        );

        const oldRating = result.finalOverallRating;

        console.log(`📈 Old rating: ${oldRating} → New rating: ${newFinalRating} (${newFinalRating > oldRating ? '+' : ''}${newFinalRating - oldRating})`);

        // 5. Aggiorna solo se è cambiato
        if (newFinalRating !== oldRating) {
            // 🔄 Usa save() invece di updateOne() per triggere l'hook post('save')
            // Questo sincronizzerà automaticamente PlayerLeaderboardStats
            result.finalOverallRating = newFinalRating;
            result.updatedAt = new Date();
            result.recalculatedAt = new Date();

            await result.save();

            stats.changes.push({
                playerId: result.targetPlayerId,
                oldRating: oldRating,
                newRating: newFinalRating,
                change: newFinalRating - oldRating,
                position: consensusPosition
            });

            console.log('✅ Updated in database');
            stats.updated++;
            return true;
        } else {
            console.log('⏸️ No change needed');
            stats.unchanged++;
            return false;
        }

    } catch (error) {
        console.error('❌ Error processing result:', error);
        stats.errors++;
        return false;
    }
}

/**
 * Script principale
 */
async function main() {
    try {
        console.log('🚀 Starting PlayerCard ratings recalculation...');
        console.log(`📊 Using weights system: Positions → Zones → Weights`);

        // Connessione DB PRODUZIONE
        const dbUri = process.env.MONGODB_URI;
        if (!dbUri) {
            throw new Error('MONGODB_URI not found in environment');
        }

        await mongoose.connect(dbUri);
        console.log('✅ Connected to PRODUCTION database');
        console.log('🚨 WARNING: Operating on PRODUCTION data!');

        // Trova tutti i PlayerCardResult
        const results = await PlayerCardResult.find({}).sort({ createdAt: -1 });
        stats.totalResults = results.length;

        console.log(`\n📋 Found ${results.length} PlayerCardResults to process\n`);

        // Processa ogni result
        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            console.log(`\n[${i + 1}/${results.length}] Processing PlayerCardResult...`);

            await recalculateResult(result);
            stats.processed++;
        }

        // Report finale
        console.log('\n🎉 RECALCULATION COMPLETED!');
        console.log('📊 STATISTICS:');
        console.log(`   Total Results: ${stats.totalResults}`);
        console.log(`   Processed: ${stats.processed}`);
        console.log(`   Updated: ${stats.updated}`);
        console.log(`   Unchanged: ${stats.unchanged}`);
        console.log(`   Errors: ${stats.errors}`);

        // Mostra i cambiamenti più significativi
        if (stats.changes.length > 0) {
            console.log('\n🔥 TOP CHANGES:');
            stats.changes
                .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
                .slice(0, 10)
                .forEach(change => {
                    const direction = change.change > 0 ? '📈' : '📉';
                    console.log(`   ${direction} ${change.position}: ${change.oldRating} → ${change.newRating} (${change.change > 0 ? '+' : ''}${change.change})`);
                });
        }

    } catch (error) {
        console.error('💥 Fatal error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from database');
    }
}

// Esegui solo se chiamato direttamente
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { main, recalculateResult };