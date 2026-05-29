/**
 * 🏆 trigger-award.js — Genera manualmente un Award (test/operativo).
 *
 * Tipi supportati:
 *   - monthly         → MONTHLY_MVP (richiede --month=YYYY-MM)
 *   - ballon          → BALLON_DOR  (usa team.seasonEndDate, override con --season-end=YYYY-MM-DD)
 *   - golden          → GOLDEN_BOOT (idem)
 *   - season          → BALLON_DOR + GOLDEN_BOOT insieme
 *
 * Uso:
 *   node scripts/trigger-award.js monthly --team=<TEAM_ID> --month=2026-04
 *   node scripts/trigger-award.js ballon  --team=<TEAM_ID>
 *   node scripts/trigger-award.js golden  --team=<TEAM_ID>
 *   node scripts/trigger-award.js season  --team=<TEAM_ID> --season-end=2026-05-28
 *   node scripts/trigger-award.js monthly --all --month=2026-04
 *
 * Flag:
 *   --team=<id>       ID del team. Alternativa: --all (tutti i team awardsEnabled=true)
 *   --all             tutti i team con awardsEnabled=true
 *   --month=YYYY-MM   solo per `monthly`
 *   --season-end=YYYY-MM-DD  override della seasonEndDate del team (solo per ballon/golden/season)
 *
 * NB: idempotente — se l'award esiste già viene restituito quello esistente (vedi findByTeamAndRef).
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Team = require('../src/models/Team');
const Award = require('../src/models/Award');
const AwardService = require('../src/services/AwardService');
const { renderAndUpload } = require('../src/renderer/renderAward');

// ─── ARGS ───────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const cmd = args[0];
const flags = {};
for (const a of args.slice(1)) {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    if (m) flags[m[1]] = m[2] === undefined ? true : m[2];
}

function usage(msg) {
    if (msg) console.error(`\n❌ ${msg}\n`);
    console.log(`
Uso:
  node scripts/trigger-award.js monthly --team=<TEAM_ID> --month=YYYY-MM
  node scripts/trigger-award.js ballon  --team=<TEAM_ID> [--season-end=YYYY-MM-DD]
  node scripts/trigger-award.js golden  --team=<TEAM_ID> [--season-end=YYYY-MM-DD]
  node scripts/trigger-award.js season  --team=<TEAM_ID> [--season-end=YYYY-MM-DD]
  (sostituisci --team=<ID> con --all per tutti i team awardsEnabled=true)
`);
    process.exit(msg ? 1 : 0);
}

if (!cmd || !['monthly', 'ballon', 'golden', 'season'].includes(cmd)) usage('Comando mancante o non valido');
if (!flags.team && !flags.all) usage('Specifica --team=<ID> o --all');
if (cmd === 'monthly' && !flags.month) usage('Per `monthly` serve --month=YYYY-MM');

// ─── DB CONNECT ─────────────────────────────────────────────────────────────
async function connectDB() {
    const nodeEnv = process.env.NODE_ENV?.trim();
    const mongoUri = nodeEnv === 'test'
        ? process.env.MONGODB_URI_TEST
        : process.env.MONGODB_URI;
    console.log(`🔍 NODE_ENV: "${nodeEnv}"`);
    console.log(`🔗 DB: ${mongoUri?.includes('test') ? 'TEST' : 'PROD'}`);
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB connesso');
}

// ─── HELPER ─────────────────────────────────────────────────────────────────
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

async function getTargetTeams() {
    if (flags.all) {
        return Team.find({ awardsEnabled: true }).select('_id name seasonEndDate').lean();
    }
    const team = await Team.findById(flags.team).select('_id name seasonEndDate').lean();
    if (!team) throw new Error(`Team non trovato: ${flags.team}`);
    return [team];
}

function resolveSeasonForTeam(team) {
    const endDate = flags['season-end']
        ? new Date(flags['season-end'])
        : team.seasonEndDate;
    if (!endDate || Number.isNaN(endDate.getTime())) {
        throw new Error(`seasonEndDate non valida per team ${team.name || team._id}. Usa --season-end=YYYY-MM-DD`);
    }
    return buildSeasonFromEndDate(endDate);
}

// ─── MAIN ───────────────────────────────────────────────────────────────────
async function main() {
    await connectDB();

    const teams = await getTargetTeams();
    if (teams.length === 0) {
        console.warn('⚠️ Nessun team trovato.');
        return;
    }

    const svc = new AwardService();
    let ok = 0, skip = 0, fail = 0;
    const createdAwardIds = [];

    for (const team of teams) {
        const tag = team.name || team._id;
        try {
            if (cmd === 'monthly') {
                const a = await svc.createMonthlyMVPAward(team._id, flags.month);
                if (a) { ok++; createdAwardIds.push(a._id); console.log(`  🏆 ${tag}: MONTHLY_MVP (${flags.month}) → ${a.payload?.hero?.name || '(no hero)'} [id=${a._id}]`); }
                else { skip++; console.log(`  ⏭️  ${tag}: MONTHLY_MVP skip (sotto soglia o no dati)`); }
            } else {
                const season = resolveSeasonForTeam(team);
                console.log(`\n→ Team: ${tag} | stagione=${season.seasonId} (end=${season.seasonEnd.toISOString().slice(0, 10)})`);
                if (cmd === 'ballon' || cmd === 'season') {
                    const bd = await svc.createBallonDorAward(team._id, season);
                    if (bd) { ok++; createdAwardIds.push(bd._id); console.log(`  🏆 BALLON_DOR → ${bd.payload?.hero?.name || '(no hero)'} [id=${bd._id}]`); }
                    else { skip++; console.log(`  ⏭️  BALLON_DOR skip`); }
                }
                if (cmd === 'golden' || cmd === 'season') {
                    const gb = await svc.createGoldenBootAward(team._id, season);
                    if (gb) { ok++; createdAwardIds.push(gb._id); console.log(`  🏆 GOLDEN_BOOT → ${gb.payload?.hero?.name || '(no hero)'} [id=${gb._id}]`); }
                    else { skip++; console.log(`  ⏭️  GOLDEN_BOOT skip`); }
                }
            }
        } catch (err) {
            fail++;
            console.error(`  ❌ ${tag}: errore → ${err.message}`);
        }
    }

    console.log(`\n✅ Creazione fine. ok=${ok} skip=${skip} fail=${fail}`);

    // ─── Forza il re-render per quelli rimasti PENDING/FAILED ─────────────
    // L'AwardService chiama renderAndUpload in fire-and-forget; ma se l'award
    // esisteva già o se uno script precedente è uscito troppo presto, lo
    // status può essere ancora PENDING. Qui chiamiamo renderAndUpload in modo
    // sincrono (await) per assicurare che il PNG venga generato prima di
    // chiudere il processo.
    if (createdAwardIds.length > 0) {
        const stale = await Award.find({
            _id: { $in: createdAwardIds },
            status: { $in: ['PENDING', 'FAILED'] }
        }).lean();

        if (stale.length > 0) {
            console.log(`\n🎨 Re-render diretto di ${stale.length} award (${stale.map(s => s.type).join(', ')})...`);
            for (const a of stale) {
                try {
                    await renderAndUpload(a);
                    console.log(`  ✅ ${a.type} [${a._id}] → READY`);
                } catch (err) {
                    console.error(`  ❌ ${a.type} [${a._id}] render fallito: ${err.message}`);
                }
            }
        } else {
            // Tutti già READY (renderizzati dal fire-and-forget interno mentre creavamo gli altri)
            console.log(`✅ Tutti gli award sono già READY.`);
        }
    }
}

main()
    .catch(err => { console.error('❌ Fatal:', err); process.exitCode = 1; })
    .finally(async () => {
        await mongoose.disconnect();
        process.exit(process.exitCode || 0);
    });
