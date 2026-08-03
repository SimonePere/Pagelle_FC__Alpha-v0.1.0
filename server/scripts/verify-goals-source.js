require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
    const nodeEnv = process.env.NODE_ENV?.trim();
    const uri = nodeEnv === 'development' ? process.env.MONGODB_URI_DEV
        : nodeEnv === 'test' ? process.env.MONGODB_URI_TEST
            : process.env.MONGODB_URI;
    await mongoose.connect(uri);

    const PlayerSeasonStats = require('../src/models/PlayerSeasonStats');
    const VoteResult = require('../src/models/VoteResult');

    // 1) PlayerSeasonStats: somma per stagione e globale
    const bySeason = await PlayerSeasonStats.aggregate([
        { $group: { _id: '$seasonId', goals: { $sum: '$totalGoals' }, assists: { $sum: '$totalAssists' }, players: { $sum: 1 } } },
        { $sort: { _id: 1 } },
    ]);
    console.log('=== PlayerSeasonStats (fonte della HOME) ===');
    let gTot = 0, aTot = 0;
    for (const r of bySeason) {
        console.log(`  stagione ${r._id}: gol=${r.goals}  assist=${r.assists}  (righe giocatore: ${r.players})`);
        gTot += r.goals; aTot += r.assists;
    }
    console.log(`  >>> TOTALE TUTTE LE STAGIONI: gol=${gTot}  assist=${aTot}`);

    // 2) VoteResult.statistics (fonte SBAGLIATA usata dalla God Dashboard)
    const [vr] = await VoteResult.aggregate([
        { $group: { _id: null, goals: { $sum: '$statistics.totalGoalsReported' }, assists: { $sum: '$statistics.totalAssistsReported' } } },
    ]);
    console.log('\n=== VoteResult.statistics (fonte ATTUALE God Dashboard) ===');
    console.log(`  gol=${vr?.goals || 0}  assist=${vr?.assists || 0}`);

    // 3) Verita' vera: somma dal dettaglio per-giocatore dentro i VoteResult
    const all = await VoteResult.find({}).lean();
    let dg = 0, da = 0;
    for (const r of all) {
        const map = r.matchRatingResults || {};
        const players = map instanceof Map ? [...map.values()] : Object.values(map);
        for (const p of players) { dg += p.goals || 0; da += p.assists || 0; }
    }
    console.log('\n=== Somma dal DETTAGLIO per-giocatore nei VoteResult (verita\' grezza) ===');
    console.log(`  gol=${dg}  assist=${da}`);

    // Eventuale modello lifetime
    try {
        const PlayerLeaderboardStats = require('../src/models/PlayerLeaderboardStats');
        const [lb] = await PlayerLeaderboardStats.aggregate([
            { $group: { _id: null, goals: { $sum: '$totalGoals' }, assists: { $sum: '$totalAssists' } } },
        ]);
        console.log('\n=== PlayerLeaderboardStats (lifetime, se usato) ===');
        console.log(`  gol=${lb?.goals || 0}  assist=${lb?.assists || 0}`);
    } catch (e) {
        console.log('\n(PlayerLeaderboardStats non presente)');
    }

    await mongoose.disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
