/**
 * 🏆 JOB: Generazione Award periodici (MONTHLY_MVP, BALLON_DOR, GOLDEN_BOOT)
 * ───────────────────────────────────────────────────────────────────────────
 *
 * COSA FA
 *   1. MONTHLY_MVP: il 1° di ogni mese alle 09:00 genera il premio MVP del mese precedente
 *      per ogni team con awardsEnabled=true e almeno 2 partite nel mese.
 *
 *   2. BALLON_DOR + GOLDEN_BOOT: il giorno dopo la seasonEndDate di ogni team
 *      (default 1 Luglio, perché seasonEndDate = 30 Giugno) genera i premi stagionali.
 *      In pratica: ogni giorno alle 10:00 controlla se ieri era la seasonEndDate
 *      di qualche team, e se sì genera i due award.
 *
 * SCHEDULING
 *   - Monthly:  '0 9 1 * *'   → 1° del mese, ore 09:00 Rome
 *   - Season:   '0 10 * * *'  → ogni giorno ore 10:00 Rome (check leggero)
 *
 * SINGLETON & IDEMPOTENZA
 *   - Flag `running` per evitare overlap.
 *   - L'anti-duplicato è nel AwardService (findByTeamAndRef). Se il cron
 *     gira 2 volte di fila, la seconda è un no-op gratuito.
 */

const cron = require('node-cron');
const Team = require('../models/Team');
const AwardService = require('../services/AwardService');

let runningMonthly = false;
let runningSeason = false;

// ============================================================
//  MONTHLY MVP
// ============================================================

async function runMonthlyMVPGeneration() {
    if (runningMonthly) return;
    runningMonthly = true;

    // Il mese target è il mese PRECEDENTE a oggi
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const monthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;

    console.log(`\n🏆 [CRON monthly-mvp] Generazione MONTHLY_MVP per ${monthStr}`);

    try {
        const teams = await Team.find({ awardsEnabled: true }).select('_id name').lean();
        let created = 0;
        let skipped = 0;
        let errors = 0;

        const awardService = new AwardService();

        for (const team of teams) {
            try {
                const award = await awardService.createMonthlyMVPAward(team._id, monthStr);
                if (award && award.createdAt && award.createdAt.getTime() > now.getTime() - 60000) {
                    created++;
                    console.log(`  🏆 ${team.name || team._id}: MVP = ${award.payload.hero.name}`);
                } else {
                    skipped++;
                }
            } catch (err) {
                errors++;
                console.error(`  ❌ ${team.name || team._id}: ${err.message}`);
            }
        }

        console.log(`✅ [CRON monthly-mvp] Fine. Teams=${teams.length} creati=${created} skip=${skipped} errori=${errors}\n`);
    } catch (err) {
        console.error('❌ [CRON monthly-mvp] Errore fatale:', err.message);
    } finally {
        runningMonthly = false;
    }
}


// ============================================================
//  SEASON AWARDS (BALLON_DOR + GOLDEN_BOOT)
// ============================================================

async function runSeasonAwardsGeneration() {
    if (runningSeason) return;
    runningSeason = true;

    // Controlla se IERI era la seasonEndDate di qualche team
    const now = new Date();
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    // Finestra: da inizio a fine di ieri (mezzanotte-mezzanotte)
    const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0);
    const endOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59);

    try {
        const teams = await Team.find({
            awardsEnabled: true,
            seasonEndDate: { $gte: startOfYesterday, $lte: endOfYesterday }
        }).select('_id name seasonEndDate').lean();

        if (teams.length === 0) {
            // Nessun team con fine stagione ieri — silenzio totale (daily check)
            return;
        }

        console.log(`\n🏆 [CRON season-awards] ${teams.length} team con fine stagione ieri (${yesterday.toLocaleDateString('it-IT')})`);

        const awardService = new AwardService();
        let createdBD = 0;
        let createdGB = 0;

        for (const team of teams) {
            const seasonEnd = new Date(team.seasonEndDate);
            const seasonEndYear = seasonEnd.getFullYear();
            const seasonStartYear = seasonEndYear - 1;
            const seasonId = `${seasonStartYear}-${String(seasonEndYear).slice(2)}`;

            const season = {
                seasonId,
                seasonStart: new Date(seasonStartYear, 8, 1),   // 1 Settembre anno precedente
                seasonEnd: seasonEnd
            };

            try {
                const bd = await awardService.createBallonDorAward(team._id, season);
                if (bd) {
                    createdBD++;
                    console.log(`  🏆 ${team.name}: BALLON_DOR → ${bd.payload.hero.name}`);
                }
            } catch (err) {
                console.error(`  ❌ ${team.name}: BALLON_DOR errore: ${err.message}`);
            }

            try {
                const gb = await awardService.createGoldenBootAward(team._id, season);
                if (gb) {
                    createdGB++;
                    console.log(`  🏆 ${team.name}: GOLDEN_BOOT → ${gb.payload.hero.name}`);
                }
            } catch (err) {
                console.error(`  ❌ ${team.name}: GOLDEN_BOOT errore: ${err.message}`);
            }
        }

        console.log(`✅ [CRON season-awards] Fine. BALLON_DOR=${createdBD} GOLDEN_BOOT=${createdGB}\n`);
    } catch (err) {
        console.error('❌ [CRON season-awards] Errore fatale:', err.message);
    } finally {
        runningSeason = false;
    }
}


// ============================================================
//  SCHEDULER
// ============================================================

function startPeriodicAwardsCron() {
    // MONTHLY: 1° del mese alle 09:00
    cron.schedule('0 9 1 * *', () => {
        runMonthlyMVPGeneration().catch(err =>
            console.error('❌ [CRON monthly-mvp] Unhandled:', err)
        );
    }, { timezone: 'Europe/Rome' });

    // SEASON: ogni giorno alle 10:00 (check leggero)
    cron.schedule('0 10 * * *', () => {
        runSeasonAwardsGeneration().catch(err =>
            console.error('❌ [CRON season-awards] Unhandled:', err)
        );
    }, { timezone: 'Europe/Rome' });

    console.log('🏆 [CRON awards] Scheduler avviato — monthly=09:00 1°mese, season=10:00 daily (Europe/Rome).');
}

module.exports = {
    startPeriodicAwardsCron,
    runMonthlyMVPGeneration,
    runSeasonAwardsGeneration
};
