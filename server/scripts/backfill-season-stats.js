/**
 * 🔁 backfill-season-stats.js — Popola `PlayerSeasonStats` dallo storico (Fase 3).
 *
 * COSA FA (idempotente: ogni stagione viene RICALCOLATA da zero)
 *   - Trova tutte le coppie (teamId, seasonId) dalle VotingSession `match_rating`
 *     COMPLETATE (prerequisito: la Fase 2 ha già popolato `seasonId`).
 *   - Per ciascuna coppia invoca PlayerSeasonStatsService.recompute(teamId, seasonId),
 *     che sostituisce atomicamente le righe della stagione aggregando i VoteResult.
 *
 * Sicuro da ri-eseguire: il recompute è full e idempotente (deleteMany + insert).
 *
 * USO
 *   node scripts/backfill-season-stats.js
 *   node scripts/backfill-season-stats.js --dry-run     # nessuna scrittura, solo elenco coppie
 *   NODE_ENV=development node scripts/backfill-season-stats.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const VotingSession = require('../src/models/VotingSession');
const PlayerSeasonStatsService = require('../src/services/PlayerSeasonStatsService');

const DRY_RUN = process.argv.includes('--dry-run');

// ─── DB CONNECT (stessa logica di src/config/database.js) ────────────────────
async function connectDB() {
    const nodeEnv = process.env.NODE_ENV?.trim();
    let mongoUri;
    if (nodeEnv === 'development') mongoUri = process.env.MONGODB_URI_DEV;
    else if (nodeEnv === 'test') mongoUri = process.env.MONGODB_URI_TEST;
    else mongoUri = process.env.MONGODB_URI;

    const label = mongoUri?.includes('test') ? 'TEST'
        : mongoUri?.includes('dev') ? 'DEV' : 'PROD';
    console.log(`🔍 NODE_ENV: "${nodeEnv || '(default→prod)'}" · DB: ${label}${DRY_RUN ? ' · DRY-RUN' : ''}`);
    if (!mongoUri) throw new Error('MONGODB_URI non configurato per questo ambiente');
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB connesso\n');
}

async function main() {
    await connectDB();
    console.log(`▶️  Backfill PlayerSeasonStats${DRY_RUN ? ' (DRY-RUN, nessuna scrittura)' : ''}\n`);

    // Coppie distinte (teamId, seasonId) dalle sessioni match_rating completate e taggate.
    const pairs = await VotingSession.aggregate([
        {
            $match: {
                type: 'match_rating',
                status: 'completed',
                seasonId: { $ne: null, $exists: true }
            }
        },
        { $group: { _id: { teamId: '$teamId', seasonId: '$seasonId' } } },
        { $sort: { '_id.seasonId': 1 } }
    ]);

    if (pairs.length === 0) {
        console.log('ℹ️  Nessuna coppia (team, stagione) da elaborare. Hai eseguito il backfill seasonId (Fase 2)?');
        return;
    }

    const service = new PlayerSeasonStatsService();
    let totalPlayers = 0;

    for (const { _id } of pairs) {
        const teamId = _id.teamId?.toString();
        const seasonId = _id.seasonId;

        if (DRY_RUN) {
            console.log(`• team=${teamId} season=${seasonId} (dry-run, nessuna scrittura)`);
            continue;
        }

        const res = await service.recompute(teamId, seasonId);
        totalPlayers += res.players;
        console.log(`✅ team=${teamId} season=${seasonId} · giocatori=${res.players} · sessioni=${res.sessions}`);
    }

    console.log(`\n✅ Backfill completato.${DRY_RUN ? ' (DRY-RUN)' : ''} Coppie=${pairs.length} · righe totali=${totalPlayers}`);
}

main()
    .then(async () => { await mongoose.disconnect(); process.exit(0); })
    .catch(async (err) => {
        console.error('❌ Backfill fallito:', err.message);
        await mongoose.disconnect().catch(() => { });
        process.exit(1);
    });
