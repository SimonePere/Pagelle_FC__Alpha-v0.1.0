/**
 * 🏆 JOB: Generazione Award periodici (MONTHLY_MVP, BALLON_DOR, GOLDEN_BOOT)
 * ───────────────────────────────────────────────────────────────────────────
 *
 * COSA FA
 *   1. MONTHLY_MVP: il 1° di ogni mese alle 09:00 genera il premio MVP del mese precedente
 *      per ogni team con awardsEnabled=true e almeno 2 partite nel mese.
 *
 *   2. BALLON_DOR: 2 giorni dopo la `seasonEndDate` di ogni team genera il Pallone d'Oro.
 *      `seasonEndDate` (default 30 Giugno) è l'unica data configurabile sul Team e
 *      coincide con la data dell'evento "Pallone d'Oro".
 *
 *   3. GOLDEN_BOOT: il giorno dopo BALLON_DOR (= seasonEndDate + 3 giorni il check).
 *      Stessa stagione (finestra dati identica), evento separato per dare risalto.
 *
 * SCHEDULING
 *   - Monthly:  '0 9 1 * *'   → 1° del mese, ore 09:00 Rome
 *   - Season:   '0 18 * * *'  → ogni giorno ore 18:00 Rome (check leggero)
 *
 * SINGLETON & IDEMPOTENZA
 *   - Flag `running` per evitare overlap.
 *   - L'anti-duplicato è nel AwardService (findByTeamAndRef). Se il cron
 *     gira 2 volte di fila, la seconda è un no-op gratuito.
 */

const cron = require('node-cron');
const Team = require('../models/Team');
const AwardService = require('../services/AwardService');
const SeasonService = require('../services/SeasonService');

const seasonService = new SeasonService();

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

    // Per BALLON_DOR generiamo se la seasonEndDate è di 2 giorni fa.
    // Per GOLDEN_BOOT generiamo se la seasonEndDate è di 3 giorni fa.
    // → Le finestre target sono: seasonEndDate ∈ [oggi-2g] OR seasonEndDate ∈ [oggi-3g]
    const now = new Date();

    const BALLON_TRIGGER_OFFSET_DAYS = 2;
    const GOLDEN_TRIGGER_OFFSET_DAYS = BALLON_TRIGGER_OFFSET_DAYS + 1;

    const dayWindow = (offsetDays) => {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offsetDays);
        return {
            start: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0),
            end: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59)
        };
    };

    // BALLON_DOR: trigger 2 giorni dopo seasonEndDate
    const ballonWindow = dayWindow(BALLON_TRIGGER_OFFSET_DAYS);
    // GOLDEN_BOOT: trigger 3 giorni dopo seasonEndDate (= +1 giorno dal BALLON_DOR)
    const goldenWindow = dayWindow(GOLDEN_TRIGGER_OFFSET_DAYS);

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
            console.log(`\n🏆 [CRON ballon-dor] ${teamsForBallon.length} team con fine stagione da ${BALLON_TRIGGER_OFFSET_DAYS} giorni`);
            for (const team of teamsForBallon) {
                const seasonId = seasonService.resolveSeasonId(team.seasonEndDate);
                const { seasonStart, seasonEnd } = seasonService.seasonBounds(seasonId);
                const season = { seasonId, seasonStart, seasonEnd };
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

        // ─── GOLDEN_BOOT (1 giorno dopo BALLON_DOR) ───────────────────────
        if (teamsForGolden.length > 0) {
            console.log(`\n🏆 [CRON golden-boot] ${teamsForGolden.length} team con fine stagione da ${GOLDEN_TRIGGER_OFFSET_DAYS} giorni`);
            for (const team of teamsForGolden) {
                const seasonId = seasonService.resolveSeasonId(team.seasonEndDate);
                const { seasonStart, seasonEnd } = seasonService.seasonBounds(seasonId);
                const season = { seasonId, seasonStart, seasonEnd };
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

    // SEASON: ogni giorno alle 18:00 (check leggero)
    cron.schedule('0 18 * * *', () => {
        runSeasonAwardsGeneration().catch(err =>
            console.error('❌ [CRON season-awards] Unhandled:', err)
        );
    }, { timezone: 'Europe/Rome' });

    console.log('🏆 [CRON awards] Scheduler avviato — monthly=09:00 1°mese, season=18:00 daily (Europe/Rome). Ballon=+2g da seasonEndDate, Golden=+3g.');
}

/* ════════════════════════════════════════════════════════════════════════════
 * 📒 NOTE / DEBITI TECNICI APERTI sul sottosistema Awards periodici
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Contesto: il 1° giugno 2026 il cron MONTHLY_MVP NON ha generato nulla in
 * produzione, pur funzionando perfettamente nei test con script (trigger-award.js).
 * Debug del giorno: lo scheduler era partito regolarmente, il job era stato
 * eseguito alle 09:00 Rome, ma `Team.find({ awardsEnabled: true })` restituiva
 * Teams=0 → zero iterazioni, zero award creati.
 *
 * ── CAUSA ROOT ─────────────────────────────────────────────────────────────
 * Sui documenti `teams` in PROD, il campo `awardsEnabled` era salvato come
 * STRINGA `"true"` invece che come BOOLEAN `true`. Stesso problema (su almeno
 * un team) per `seasonEndDate`, salvata come stringa ISO invece che come Date.
 * Mongo è schemaless e Mongoose non riconverte i tipi su documenti già
 * esistenti; un filtro `{ awardsEnabled: true }` matcha SOLO il boolean true,
 * non la stringa "true" → no match → no award.
 *
 * Probabile origine: patch manuale dei documenti via Compass / script senza
 * cast dei tipi (es. inserimento di `"true"` con virgolette).
 *
 * Il test con `scripts/trigger-award.js --team=<id>` non si era accorto del
 * problema perché bypassa il filtro `awardsEnabled` (usa `Team.findById` diretto).
 *
 * ── FIX ONE-SHOT APPLICATO IN DB (PROD) ────────────────────────────────────
 *   db.teams.updateMany(
 *     { awardsEnabled: { $type: "string" } },
 *     [ { $set: { awardsEnabled: { $eq: ["$awardsEnabled", "true"] } } } ]
 *   )
 *   db.teams.updateMany(
 *     { seasonEndDate: { $type: "string" } },
 *     [ { $set: { seasonEndDate: { $toDate: "$seasonEndDate" } } } ]
 *   )
 *
 * ── DEBITI TECNICI / HARDENING DA PIANIFICARE ──────────────────────────────
 *
 *  1) RESILIENZA DEL FILTRO QUERY (codice qui in `runMonthlyMVPGeneration` e
 *     `runSeasonAwardsGeneration`):
 *     Valutare di usare `{ awardsEnabled: { $ne: false } }` invece di
 *     `{ awardsEnabled: true }`. Semantica "feature attiva di default, esclude
 *     solo opt-out esplicito" — tollera valori legacy (stringa, null, undefined).
 *
 *  2) NORMALIZZAZIONE TIPI ALLA SCRITTURA:
 *     Hook pre-save su Team che forzi `awardsEnabled` a Boolean(...) e
 *     `seasonEndDate` a `new Date(...)`. Evita che future patch manuali o
 *     payload API mal formati ri-introducano stringhe.
 *
 *  3) CATCH-UP ALL'AVVIO DEL PROCESSO (alto valore, basso rischio):
 *     `node-cron` non ha persistenza né recupero dei tick mancati. Se il
 *     processo è giù alle 09:00 del 1° del mese (deploy, restart, crash),
 *     il MONTHLY_MVP del mese precedente NON viene più generato fino al mese
 *     successivo. Soluzione: all'avvio del server, se siamo nei primi N
 *     giorni del mese (es. 1-7), per ogni team awardsEnabled controllare se
 *     esiste già l'Award `(team, refId=YYYY-MM mese precedente, MONTHLY_MVP)`;
 *     se no, eseguire `createMonthlyMVPAward` subito. L'anti-duplicato già
 *     presente nel service (`findByTeamAndRef`) rende l'operazione idempotente.
 *     Stesso ragionamento estendibile a BALLON_DOR / GOLDEN_BOOT.
 *
 *  4) MIGRAZIONE / BACKFILL ESISTENTI:
 *     Script `scripts/migrate-awards-fields.js` riusabile (esegue le 2
 *     updateMany sopra) da rilanciare se in futuro emergono altri doc con
 *     tipi sbagliati. Per ora applicato a mano in PROD il 1/6/2026.
 *
 *  5) OSSERVABILITÀ:
 *     Loggare all'avvio dello scheduler il count di team con
 *     `awardsEnabled === true` (sanity-check immediato). Se appare "Teams
 *     awards-enabled in DB: 0", è chiaro a colpo d'occhio che c'è un
 *     problema dati prima del primo tick.
 *
 *  6) TEST E2E PERIODIC AWARDS:
 *     I test attuali usano `trigger-award.js` (bypass filtro). Aggiungere
 *     un test che invoca direttamente `runMonthlyMVPGeneration()` su un DB
 *     di test con team che hanno `awardsEnabled` rispettivamente true / false
 *     / "true" (stringa) / mancante, per coprire la regressione di oggi.
 * ════════════════════════════════════════════════════════════════════════════
 */

module.exports = {
    startPeriodicAwardsCron,
    runMonthlyMVPGeneration,
    runSeasonAwardsGeneration
};
