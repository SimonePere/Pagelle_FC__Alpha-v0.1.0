/**
 * 🏆 JOB: Generazione Award periodici (MONTHLY_MVP, BALLON_DOR, GOLDEN_BOOT)
 * ───────────────────────────────────────────────────────────────────────────
 *
 * COSA FA
 *   1. MONTHLY_MVP: il 1° di ogni mese alle 09:00 genera il premio MVP del mese precedente
 *      per ogni team con awardsEnabled=true e almeno 2 partite nel mese.
 *
 *   2. BALLON_DOR: il giorno dopo la `seasonEndDate` di ogni team genera il Pallone d'Oro.
 *      `seasonEndDate` (default 30 Giugno) è l'unica data configurabile sul Team e
 *      coincide con la data dell'evento "Pallone d'Oro".
 *
 *   3. GOLDEN_BOOT: 7 giorni dopo BALLON_DOR (= seasonEndDate + 8 giorni il check).
 *      Stessa stagione (finestra dati identica), evento separato per dare risalto.
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

    // Per BALLON_DOR generiamo se "ieri" era seasonEndDate del team.
    // Per GOLDEN_BOOT generiamo se "ieri" era seasonEndDate + 7 giorni.
    // → Le finestre target (per `ieri`) sono quindi: seasonEndDate ∈ [oggi-1g] OR seasonEndDate ∈ [oggi-8g]
    const now = new Date();

    const dayWindow = (offsetDays) => {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offsetDays);
        return {
            start: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0),
            end: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59)
        };
    };

    // BALLON_DOR: trigger il giorno dopo seasonEndDate (offset = 1)
    const ballonWindow = dayWindow(1);
    // GOLDEN_BOOT: trigger 8 giorni dopo seasonEndDate (offset = 8 → ieri = seasonEndDate + 7)
    const goldenWindow = dayWindow(8);

    try {
        const [teamsForBallon, teamsForGolden] = await Promise.all([
            Team.find({
                awardsEnabled: true,
                seasonEndDate: { $gte: ballonWindow.start, $lte: ballonWindow.end }
            }).select('_id name seasonEndDate').lean(),
            Team.find({
                awardsEnabled: true,
                seasonEndDate: { $gte: goldenWindow.start, $lte: goldenWindow.end }
            }).select('_id name seasonEndDate').lean(),
        ]);

        if (teamsForBallon.length === 0 && teamsForGolden.length === 0) {
            // Nessun team interessato — silenzio totale (daily check)
            return;
        }

        const awardService = new AwardService();
        let createdBD = 0;
        let createdGB = 0;

        // ─── BALLON_DOR ───────────────────────────────────────────────────
        if (teamsForBallon.length > 0) {
            console.log(`\n🏆 [CRON ballon-dor] ${teamsForBallon.length} team con fine stagione ieri`);
            for (const team of teamsForBallon) {
                const season = buildSeasonFromEndDate(team.seasonEndDate);
                try {
                    const bd = await awardService.createBallonDorAward(team._id, season);
                    if (bd) {
                        createdBD++;
                        console.log(`  🏆 ${team.name}: BALLON_DOR → ${bd.payload.hero.name}`);
                    }
                } catch (err) {
                    console.error(`  ❌ ${team.name}: BALLON_DOR errore: ${err.message}`);
                }
            }
        }

        // ─── GOLDEN_BOOT (7 giorni dopo BALLON_DOR) ───────────────────────
        if (teamsForGolden.length > 0) {
            console.log(`\n🏆 [CRON golden-boot] ${teamsForGolden.length} team a +7 giorni dalla fine stagione`);
            for (const team of teamsForGolden) {
                const season = buildSeasonFromEndDate(team.seasonEndDate);
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
        }

        console.log(`✅ [CRON season-awards] Fine. BALLON_DOR=${createdBD} GOLDEN_BOOT=${createdGB}\n`);
    } catch (err) {
        console.error('❌ [CRON season-awards] Errore fatale:', err.message);
    } finally {
        runningSeason = false;
    }
}

/**
 * Costruisce l'oggetto season {seasonId, seasonStart, seasonEnd} a partire da seasonEndDate.
 * Convenzione: stagione = 1 Settembre (anno precedente) → seasonEndDate.
 */
function buildSeasonFromEndDate(seasonEndDate) {
    const seasonEnd = new Date(seasonEndDate);
    const seasonEndYear = seasonEnd.getFullYear();
    const seasonStartYear = seasonEndYear - 1;
    return {
        seasonId: `${seasonStartYear}-${String(seasonEndYear).slice(2)}`,
        seasonStart: new Date(seasonStartYear, 8, 1),   // 1 Settembre anno precedente
        seasonEnd
    };
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

    console.log('🏆 [CRON awards] Scheduler avviato — monthly=09:00 1°mese, season=10:00 daily (Europe/Rome). Ballon=+1g da seasonEndDate, Golden=+8g.');
}

module.exports = {
    startPeriodicAwardsCron,
    runMonthlyMVPGeneration,
    runSeasonAwardsGeneration
};
