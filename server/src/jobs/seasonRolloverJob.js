/**
 * 🔄 JOB: Rollover automatico stagione (Fase 6)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * COSA FA
 *   Ogni giorno alle 11:00 (dopo il cron season-awards alle 10:00) controlla
 *   se la stagione `active` ha raggiunto la propria `seasonEnd`. Se sì:
 *     1. Archivia la stagione corrente (active → archived).
 *     2. Promuove la stagione `upcoming` successiva ad `active`
 *        (o la crea on-demand via SeasonService).
 *
 * IDEMPOTENZA
 *   Il passaggio active → archived è atomico (findOneAndUpdate con guard
 *   `{ status: 'active' }`). Se un secondo tick o una chiamata admin concorrente
 *   entra mentre il job è già in esecuzione, trova la stagione già archiviata
 *   e termina come noop.
 *
 * SCHEDULING
 *   '0 11 * * *'  → ogni giorno alle 11:00 Europe/Rome
 *   (deliberatamente DOPO il cron season-awards delle 10:00 per garantire che
 *   Pallone d'Oro / Scarpa d'Oro siano stati emessi prima del rollover)
 *
 * ENDPOINT ADMIN
 *   POST /api/v1/seasons/rollover — trigger manuale (vedi routes/seasons.js)
 */

const cron = require('node-cron');
const Season = require('../models/Season');
const SeasonService = require('../services/SeasonService');

const seasonService = new SeasonService();

// Flag singleton per evitare overlap
let running = false;

/**
 * Esegue il rollover della stagione corrente.
 * Può essere invocato sia dal cron che dall'endpoint admin.
 *
 * @returns {Promise<Object>} Risultato dell'operazione.
 */
async function runSeasonRollover() {
    if (running) {
        console.log('⏭️  [CRON rollover] Esecuzione precedente ancora in corso, skip.');
        return { action: 'skipped_already_running' };
    }
    running = true;

    try {
        // 1. Trova la stagione attiva
        const active = await Season.findOne({ status: 'active' });

        if (!active) {
            // Safety net: nessuna stagione attiva → ne crea/ripristina una
            console.warn('⚠️  [rollover] Nessuna stagione active trovata. Creo la corrente on-demand.');
            await seasonService.getCurrentSeason();
            return { action: 'created_current_on_demand' };
        }

        // 2. Controlla se il rollover è dovuto
        const now = new Date();
        if (now < active.seasonEnd) {
            console.log(`ℹ️  [rollover] Stagione ${active.seasonId} ancora in corso fino al ${active.seasonEnd.toISOString()}. Nessun rollover.`);
            return { action: 'noop_not_yet', activeSeasonId: active.seasonId, nextRolloverAt: active.seasonEnd };
        }

        // 3. Archiviazione atomica (lock ottimistico: aggiorna solo se ancora active)
        const wasActive = await Season.findOneAndUpdate(
            { _id: active._id, status: 'active' },
            { $set: { status: 'archived', archivedAt: new Date() } },
            { new: false } // restituisce il doc PRIMA dell'update
        );

        if (!wasActive) {
            console.log(`ℹ️  [rollover] Stagione ${active.seasonId} già archiviata da un altro processo. Nessun rollover.`);
            return { action: 'noop_already_archived', seasonId: active.seasonId };
        }

        // 4. Determina la stagione successiva: resolveSeasonId(active.seasonEnd)
        //    active.seasonEnd = 1 luglio YYYY → risolve a "YYYY-YY+1"
        const nextSeasonId = seasonService.resolveSeasonId(active.seasonEnd);
        console.log(`🔄 [rollover] Stagione ${active.seasonId} archiviata. Promuovo ${nextSeasonId} ad active.`);

        // Assicura che la stagione successiva esista nell'anagrafica
        await seasonService.ensureSeason(nextSeasonId, 'upcoming');

        // Promuovi upcoming → active (atomico)
        const newActive = await Season.findOneAndUpdate(
            { seasonId: nextSeasonId, status: { $in: ['upcoming', 'archived'] } },
            { $set: { status: 'active', archivedAt: null } },
            { new: true }
        );

        if (!newActive) {
            // Caso raro: la stagione era già active (es. due invocazioni contemporanee)
            const existing = await Season.findOne({ seasonId: nextSeasonId });
            console.log(`ℹ️  [rollover] ${nextSeasonId} già in stato '${existing?.status}'. Nessun ulteriore aggiornamento.`);
        } else {
            console.log(`✅ [rollover] Rollover completato. ${active.seasonId} → archived · ${nextSeasonId} → active.`);
        }

        // ── Reset news: elimina tutto e lascia solo le news dei premi stagionali.
        //    Fire-and-forget: non blocca il rollover se fallisce.
        try {
            const Team = require('../models/Team');
            const NewsService = require('../services/NewsService');
            const newsService = new NewsService();
            const teams = await Team.find({}).select('_id').lean();
            for (const team of teams) {
                await newsService.resetNewsForSeasonEnd(team._id, active.seasonId);
            }
            console.log(`🗞️  [rollover] News resettate per ${teams.length} team. Solo award news mantenute.`);
        } catch (newsErr) {
            console.warn(`⚠️  [rollover] News reset error: ${newsErr.message}`);
        }

        return {
            action: 'rolled_over',
            prevSeason: active.seasonId,
            newSeason: nextSeasonId
        };

    } catch (err) {
        console.error('❌ [rollover] Errore:', err.message);
        throw err;
    } finally {
        running = false;
    }
}

/**
 * Avvia il cron giornaliero del rollover (ore 11:00 Europe/Rome).
 */
function startSeasonRolloverCron() {
    cron.schedule('0 11 * * *', () => {
        runSeasonRollover().catch(err =>
            console.error('❌ [CRON rollover] Unhandled:', err)
        );
    }, { timezone: 'Europe/Rome' });

    console.log('🔄 [CRON rollover] Scheduler avviato — rollover=11:00 daily (Europe/Rome).');
}

module.exports = {
    startSeasonRolloverCron,
    runSeasonRollover
};
