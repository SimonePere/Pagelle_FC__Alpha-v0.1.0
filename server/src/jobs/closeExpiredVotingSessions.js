/**
 * 🕐 JOB: Chiusura automatica votazioni scadute
 * ─────────────────────────────────────────────
 *
 * COSA FA
 *   Ogni 5 minuti il cron interroga il DB per trovare tutte le VotingSession
 *   con status='active' e deadline < adesso. Per ognuna chiama il service
 *   `closeWithAbstainedPending(sessionId, 'automatic_deadline')`, che:
 *     - astiene d'ufficio chi non ha votato (reason='deadline_expired')
 *     - completa la sessione e calcola le medie ufficiali
 *     - se nessuno ha votato → marca la sessione come 'cancelled'
 *
 * PERCHÉ OGNI 5 MINUTI
 *   Compromesso tra reattività (l'utente vede la sessione chiudersi entro
 *   pochi minuti dalla deadline) e carico DB (1 query indicizzata ogni 5 min
 *   è praticamente gratis grazie all'index { deadline: 1, status: 1 }).
 *
 * SINGLETON IN-PROCESS
 *   Render ci dà 1 sola istanza del web service (free tier). Non servono
 *   lock distribuiti tipo Redis. Quando passeremo a multi-istanza dovremo
 *   aggiungere un lock (es. Mongo findOneAndUpdate atomico per "claim"
 *   della sessione prima di chiuderla). Per ora KISS.
 *
 * KEEP-ALIVE
 *   UptimeRobot ci pinga ogni 5 min su Render → il processo non va mai in
 *   sleep → il cron resta vivo.
 *
 * MODALITÀ DEMO
 *   La sessione di voto della squadra dimostrativa deve restare aperta per
 *   sempre: è il cuore di ciò che la demo mostra. Se questo job la chiudesse,
 *   il visitatore troverebbe una demo monca e nessuno se ne accorgerebbe.
 *   Doppia protezione, volutamente ridondante:
 *     1. la sessione demo nasce con deadline: null, che la query già scarta
 *        grazie a { $exists: true, $ne: null }
 *     2. il filtro isDemo: { $ne: true } qui sotto, che la esclude comunque
 *   Basta che una delle due regga. Vedi DEMO_MODE_IMPLEMENTATION_PLAN.md §3.2
 *
 * ROBUSTEZZA
 *   - Errori su una singola sessione NON fermano il job: log + continue.
 *   - Idempotenza: closeWithAbstainedPending gestisce già 'noop_already_closed'
 *     se la sessione fosse stata chiusa nel frattempo (es. force-close admin).
 */

const cron = require('node-cron');
const VotingSession = require('../models/VotingSession');
const VotingService = require('../services/VotingService');

// 🔐 Flag per evitare overlap se un'esecuzione dura più di 5 minuti
//    (improbabile, ma meglio cinture E bretelle).
let running = false;

/**
 * Esegue una scansione delle sessioni scadute e le chiude.
 * Esposto anche separatamente per poter essere invocato manualmente
 * (es. all'avvio del server, per recuperare sessioni scadute mentre era spento).
 */
async function runCloseExpiredVotingSessions() {
    if (running) {
        console.log('⏭️  [CRON close-expired] Esecuzione precedente ancora in corso, salto questo tick.');
        return { skipped: true };
    }

    running = true;
    const startedAt = new Date();
    console.log(`\n🕐 [CRON close-expired] Avvio scansione @ ${startedAt.toISOString()}`);

    try {
        // Query indicizzata sull'index { deadline: 1, status: 1 }
        const expired = await VotingSession.find({
            status: 'active',
            deadline: { $exists: true, $ne: null, $lt: new Date() },
            isDemo: { $ne: true }
        }).select('_id title type deadline').lean();

        if (expired.length === 0) {
            console.log('✅ [CRON close-expired] Nessuna sessione scaduta. Tutto a posto.');
            return { processed: 0, closed: 0, errors: 0 };
        }

        console.log(`📋 [CRON close-expired] Trovate ${expired.length} sessione/i scadute. Inizio chiusura...`);

        const votingService = new VotingService();
        let closed = 0;
        let errors = 0;

        for (const session of expired) {
            try {
                console.log(`  🔒 Chiusura sessione ${session._id} (${session.title || 'no-title'}) — deadline: ${session.deadline?.toISOString()}`);
                const result = await votingService.closeWithAbstainedPending(
                    session._id.toString(),
                    'automatic_deadline'
                );
                console.log(`     → action: ${result.action}`);
                closed++;
            } catch (err) {
                errors++;
                console.error(`  ❌ Errore chiusura sessione ${session._id}:`, err.message);
                // NON throw: continuiamo con le altre.
            }
        }

        const elapsedMs = Date.now() - startedAt.getTime();
        console.log(`✅ [CRON close-expired] Fine scansione. Chiuse: ${closed}/${expired.length}, errori: ${errors}, durata: ${elapsedMs}ms\n`);
        return { processed: expired.length, closed, errors };
    } catch (err) {
        console.error('❌ [CRON close-expired] Errore fatale nella scansione:', err);
        return { error: err.message };
    } finally {
        running = false;
    }
}

/**
 * Avvia lo scheduler. Da chiamare UNA VOLTA all'avvio del server.
 * Pattern '*\/5 * * * *' = ogni 5 minuti (al minuto 0, 5, 10, ...).
 */
function startCloseExpiredVotingSessionsCron() {
    // Schedule: ogni 5 minuti, fuso orario Europe/Rome (per coerenza con le deadline italiane)
    cron.schedule('*/5 * * * *', () => {
        runCloseExpiredVotingSessions().catch(err => {
            console.error('❌ [CRON close-expired] Errore non gestito:', err);
        });
    }, {
        timezone: 'Europe/Rome'
    });

    console.log('🕐 [CRON close-expired] Scheduler avviato — esecuzione ogni 5 minuti (Europe/Rome).');

    // 🚀 BONUS: esegui subito una scansione all'avvio per recuperare eventuali
    //    sessioni scadute mentre il server era spento (deploy, restart, ecc.).
    //    Lo facciamo dopo 10s per dare tempo a MongoDB di essere pronto.
    setTimeout(() => {
        runCloseExpiredVotingSessions().catch(err => {
            console.error('❌ [CRON close-expired] Errore scansione iniziale:', err);
        });
    }, 10_000);
}

module.exports = {
    startCloseExpiredVotingSessionsCron,
    runCloseExpiredVotingSessions, // export anche standalone, utile per test o invocazione manuale
};
