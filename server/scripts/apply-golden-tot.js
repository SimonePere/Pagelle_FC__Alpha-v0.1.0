/**
 * apply-golden-tot.js — Applica (o ri-applica) i bonus GoldenTot per la stagione corrente.
 *
 * =============================================================================
 * COSA FA
 * =============================================================================
 * Per ogni team che ha almeno un award stagionale READY nella stagione PRECEDENTE
 * (BALLON_DOR o GOLDEN_BOOT), chiama GoldenTotService.applyBonusesForSeason
 * che scrive i bonus nella stagione CORRENTE (o quella specificata via --season).
 *
 * Operazione IDEMPOTENTE: può essere eseguita più volte senza creare duplicati.
 * L'upsert su (teamId, seasonId, playerId, source) garantisce un solo documento
 * per vincitore/fonte/stagione, indipendentemente da quante volte si esegue.
 *
 * =============================================================================
 * QUANDO USARLO
 * =============================================================================
 *  1. Una-tantum su PROD per la stagione 2026-27 (Dux ha già vinto 2025-26).
 *  2. Ogni volta che si vuole forzare un ricalcolo (es. dopo rollback manuale).
 *  3. Staging/QA: per simulare l'effetto bonus senza aspettare il cron.
 *  4. Debug: --dry-run per vedere cosa verrebbe applicato senza scrivere nulla.
 *
 * Dalle stagioni future il meccanismo è automatico (hook in generatePeriodicAwards
 * + seasonRolloverJob): questo script serve solo per operazioni manuali/backfill.
 *
 * =============================================================================
 * USO
 * =============================================================================
 *   # Applica i bonus per la stagione CORRENTE (default) su tutti i team
 *   node scripts/apply-golden-tot.js
 *
 *   # Applica per una stagione specifica
 *   node scripts/apply-golden-tot.js --season=2026-27
 *
 *   # Solo un team specifico
 *   node scripts/apply-golden-tot.js --team=6932f76cdd1f324fdff48481
 *
 *   # Dry-run: mostra cosa farebbe senza scrivere
 *   node scripts/apply-golden-tot.js --dry-run
 *
 *   # Combinazioni
 *   node scripts/apply-golden-tot.js --season=2026-27 --team=6932f76cdd1f324fdff48481 --dry-run
 *
 *   # Ambienti
 *   NODE_ENV=development node scripts/apply-golden-tot.js
 *   NODE_ENV=test        node scripts/apply-golden-tot.js
 * =============================================================================
 */

require('dotenv').config();
const mongoose = require('mongoose');

// ─── PARSING ARGOMENTI CLI ────────────────────────────────────────────────────
const DRY_RUN = process.argv.includes('--dry-run');
const SEASON_ARG = process.argv.find(a => a.startsWith('--season='))?.split('=')[1] ?? null;
const TEAM_ARG = process.argv.find(a => a.startsWith('--team='))?.split('=')[1] ?? null;

// ─── CONNESSIONE DB (stessa logica degli altri script) ────────────────────────
async function connectDB() {
    const nodeEnv = process.env.NODE_ENV?.trim();
    let mongoUri;
    if (nodeEnv === 'development') mongoUri = process.env.MONGODB_URI_DEV;
    else if (nodeEnv === 'test') mongoUri = process.env.MONGODB_URI_TEST;
    else mongoUri = process.env.MONGODB_URI;

    const label = mongoUri?.includes('test') ? 'TEST'
        : mongoUri?.includes('dev') ? 'DEV' : 'PROD';

    console.log(
        `🔍 NODE_ENV: "${nodeEnv || '(default→prod)'}" · DB: ${label}` +
        `${DRY_RUN ? ' · 🟡 DRY-RUN (nessuna scrittura)' : ' · 🔴 SCRITTURA REALE'}`
    );

    if (!mongoUri) throw new Error('MONGODB_URI non configurato per questo ambiente.');
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB connesso\n');
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
    await connectDB();

    // Importazioni ritardate (dopo connessione DB, stessa convenzione degli altri script).
    const SeasonService = require('../src/services/SeasonService');
    const GoldenTotService = require('../src/services/GoldenTotService');
    const Team = require('../src/models/Team');
    const AwardRepository = require('../src/repositories/AwardRepository');

    const seasonService = new SeasonService();
    const goldenTotService = new GoldenTotService();
    const awardRepo = new AwardRepository();

    // ── 1. Risolvi la stagione ATTIVA (quella su cui i bonus saranno applicati).
    //       Se --season è specificato, usa quello; altrimenti la stagione corrente.
    let currentSeasonId;
    if (SEASON_ARG) {
        // Validiamo il formato: deve essere "YYYY-YY"
        currentSeasonId = seasonService.resolveSeasonParam(SEASON_ARG);
        console.log(`📅 Stagione forzata via --season: ${currentSeasonId}`);
    } else {
        currentSeasonId = seasonService.resolveSeasonId(new Date());
        console.log(`📅 Stagione corrente (auto-rilevata): ${currentSeasonId}`);
    }

    // La stagione PRECEDENTE è quella da cui si leggono i vincitori degli award.
    const prevSeasonId = goldenTotService._previousSeasonId(currentSeasonId);
    console.log(`🏆 Award letti dalla stagione precedente: ${prevSeasonId}`);
    console.log(`🎯 Bonus applicati sulla stagione attiva: ${currentSeasonId}\n`);

    // ── 2. Costruisce la lista di team da elaborare.
    //       Se --team è specificato, elabora solo quello; altrimenti tutti i team attivi.
    let teams;
    if (TEAM_ARG) {
        const t = await Team.findById(TEAM_ARG).select('_id name').lean();
        if (!t) {
            console.error(`❌ Team ID "${TEAM_ARG}" non trovato nel DB. Abort.`);
            process.exit(1);
        }
        teams = [t];
        console.log(`👥 Team filtrato via --team: ${t.name} (${t._id})\n`);
    } else {
        teams = await Team.find({ isActive: true }).select('_id name').lean();
        console.log(`👥 Team attivi trovati: ${teams.length}\n`);
    }

    // ── 3. Per ogni team: dry-run mostra cosa farebbe, altrimenti applica.
    let totalApplied = 0;
    let totalSkipped = 0;
    let teamsWithBonuses = 0;

    for (const team of teams) {
        const teamId = team._id.toString();
        const teamName = team.name;

        if (DRY_RUN) {
            // In dry-run, carichiamo gli award per mostrare cosa verrebbe scritto.
            const awards = await awardRepo.findByTeam(teamId, {
                status: 'READY',
                seasonId: prevSeasonId,
                limit: 10
            });

            const seasonAwards = awards.filter(a =>
                ['BALLON_DOR', 'GOLDEN_BOOT'].includes(a.type)
            );

            if (seasonAwards.length === 0) {
                console.log(`  ⏭️  ${teamName} (${teamId}): nessun award READY in ${prevSeasonId}, skip.`);
                continue;
            }

            teamsWithBonuses++;
            for (const award of seasonAwards) {
                const winnerId = award.payload?.hero?.playerId;
                const delta = award.type === 'BALLON_DOR' ? '+3 playerCardTOT' : '+2 fin';
                console.log(
                    `  [DRY-RUN] ${teamName} → ${award.type}: ` +
                    `winner=${winnerId ?? 'null (skip)'}, bonus=${delta}, ` +
                    `stagione-attiva=${currentSeasonId}`
                );
            }

        } else {
            // Applicazione reale: idempotente, sicura su re-run.
            try {
                const result = await goldenTotService.applyBonusesForSeason(teamId, currentSeasonId);

                if (result.applied > 0) {
                    teamsWithBonuses++;
                    totalApplied += result.applied;
                    console.log(
                        `✅ ${teamName} (${teamId}): ` +
                        `applicati=${result.applied}, skippati=${result.skipped}`
                    );
                    // Dettaglio per audit
                    for (const d of result.details) {
                        if (d.status === 'applied') {
                            console.log(
                                `   └─ ${d.awardType}: winner=${d.winnerId}, ` +
                                `+${d.delta} su ${d.field}`
                            );
                        } else {
                            console.log(`   └─ ${d.awardType}: SKIP (${d.reason})`);
                        }
                    }
                } else {
                    // Nessun award READY per questo team: normale, non è un errore.
                    console.log(`  ⏭️  ${teamName} (${teamId}): nessun bonus da applicare.`);
                }

                totalSkipped += result.skipped;

            } catch (err) {
                // Non interrompiamo l'intera esecuzione per un singolo team fallito.
                console.error(`❌ Errore team ${teamName} (${teamId}): ${err.message}`);
            }
        }
    }

    // ── 4. Riepilogo finale.
    console.log('\n═══════════════════════════════════════════════════');
    if (DRY_RUN) {
        console.log(`🟡 DRY-RUN completato.`);
        console.log(`   Team con bonus da applicare: ${teamsWithBonuses} / ${teams.length}`);
        console.log(`   Nessuna scrittura effettuata.`);
    } else {
        console.log(`✅ apply-golden-tot completato.`);
        console.log(`   Team con bonus applicati: ${teamsWithBonuses} / ${teams.length}`);
        console.log(`   Bonus totali applicati/aggiornati: ${totalApplied}`);
        console.log(`   Bonus saltati (no winner / no membership): ${totalSkipped}`);
        console.log(`   Stagione attiva: ${currentSeasonId}`);
        console.log(`   Award letti da: ${prevSeasonId}`);
    }
    console.log('═══════════════════════════════════════════════════\n');
}

main()
    .catch(err => {
        console.error('\n💥 Errore fatale:', err.message);
        process.exit(1);
    })
    .finally(() => mongoose.disconnect());
