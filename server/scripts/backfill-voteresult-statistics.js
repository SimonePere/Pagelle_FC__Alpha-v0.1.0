require('dotenv').config();
const mongoose = require('mongoose');

/**
 * BACKFILL statistics.* nei VoteResult storici.
 *
 * I VoteResult creati prima del fix a VotingService.completeSession hanno il
 * dettaglio per-giocatore (matchRatingResults) corretto ma il riassunto
 * statistics.{totalGoalsReported,totalAssistsReported,badgesSummary,ratingDistribution}
 * a 0. Questo script ricalcola quei campi dal dettaglio già presente.
 *
 * Idempotente: rieseguirlo produce lo stesso risultato.
 *
 * Uso:  $env:NODE_ENV="test"; node scripts/backfill-voteresult-statistics.js
 * Dry-run (default true): non scrive, stampa solo. Passa `--apply` per scrivere.
 */
async function main() {
    const apply = process.argv.includes('--apply');
    const nodeEnv = process.env.NODE_ENV?.trim();
    const uri = nodeEnv === 'development' ? process.env.MONGODB_URI_DEV
        : nodeEnv === 'test' ? process.env.MONGODB_URI_TEST
            : process.env.MONGODB_URI;
    await mongoose.connect(uri);
    console.log(`Connesso a env=${nodeEnv || 'prod'} — modalità: ${apply ? 'APPLY (scrive)' : 'DRY-RUN (sola lettura)'}`);

    const VoteResult = require('../src/models/VoteResult');
    const results = await VoteResult.find({}).lean();

    let changed = 0;
    let totGoals = 0, totAssists = 0;

    for (const r of results) {
        const map = r.matchRatingResults || {};
        const players = map instanceof Map ? [...map.values()] : Object.values(map);

        let goals = 0, assists = 0, ratingSum = 0, count = 0;
        const badgesSummary = { mvp: 0, goleador: 0, assist_man: 0, difensore: 0, maratoneta: 0, gol_bello: 0 };
        const ratingDistribution = { '9-10': 0, '8-9': 0, '7-8': 0, '6-7': 0, '5-6': 0, 'below-5': 0 };

        for (const p of players) {
            const g = p.goals || 0, a = p.assists || 0, avg = p.averageRating || 0;
            goals += g; assists += a; ratingSum += avg; count++;
            (p.badges || []).forEach(b => { if (badgesSummary[b] !== undefined) badgesSummary[b] += 1; });
            if (avg >= 9) ratingDistribution['9-10']++;
            else if (avg >= 8) ratingDistribution['8-9']++;
            else if (avg >= 7) ratingDistribution['7-8']++;
            else if (avg >= 6) ratingDistribution['6-7']++;
            else if (avg >= 5) ratingDistribution['5-6']++;
            else ratingDistribution['below-5']++;
        }

        const overallAverageRating = count > 0 ? Math.round((ratingSum / count) * 10) / 10 : 0;
        const old = r.statistics || {};
        const needsUpdate =
            (old.totalGoalsReported || 0) !== goals ||
            (old.totalAssistsReported || 0) !== assists;

        totGoals += goals; totAssists += assists;

        if (needsUpdate) {
            changed++;
            console.log(`  VoteResult ${r._id} (${new Date(r.createdAt).toISOString().slice(0, 10)}): gol ${old.totalGoalsReported || 0}→${goals}, assist ${old.totalAssistsReported || 0}→${assists}`);
            if (apply) {
                await VoteResult.updateOne(
                    { _id: r._id },
                    {
                        $set: {
                            'statistics.totalGoalsReported': goals,
                            'statistics.totalAssistsReported': assists,
                            'statistics.overallAverageRating': overallAverageRating,
                            'statistics.badgesSummary': badgesSummary,
                            'statistics.ratingDistribution': ratingDistribution,
                        }
                    }
                );
            }
        }
    }

    console.log(`\nDocumenti analizzati: ${results.length}`);
    console.log(`Documenti da aggiornare: ${changed}`);
    console.log(`Totali dopo backfill → gol=${totGoals}  assist=${totAssists}`);
    if (!apply) console.log('\n(DRY-RUN: nessuna scrittura. Rilancia con --apply per applicare.)');

    await mongoose.disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
