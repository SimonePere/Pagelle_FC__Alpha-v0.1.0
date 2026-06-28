/**
 * 🔁 backfill-season-id.js — Popola `seasonId` sui record storici (Fase 2).
 *
 * COSA FA (idempotente: salta i documenti che hanno già `seasonId`)
 *   - Match         → resolveSeasonId(match.date)
 *   - VotingSession → dal Match collegato (targetId) per match_rating;
 *                     fallback resolveSeasonId(startedAt) (es. player_card_rating)
 *   - VoteResult    → propagato dalla VotingSession (join votingSessionId);
 *                     fallback via Match della sessione, poi startedAt/createdAt
 *   - Award         → da refId "season-XXXX" se stagionale; "YYYY-MM" per MONTHLY_MVP;
 *                     altrimenti resolveSeasonId(payload.period.dateTo)
 *
 * ORDINE: Match → VotingSession → VoteResult → Award (le dipendenze a monte
 * vengono taggate prima, così i fallback hanno i dati pronti).
 *
 * USO
 *   node scripts/backfill-season-id.js
 *   node scripts/backfill-season-id.js --dry-run        # nessuna scrittura, solo conteggi
 *   NODE_ENV=development node scripts/backfill-season-id.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const Match = require('../src/models/Match');
const VotingSession = require('../src/models/VotingSession');
const VoteResult = require('../src/models/VoteResult');
const Award = require('../src/models/Award');
const SeasonService = require('../src/services/SeasonService');

const DRY_RUN = process.argv.includes('--dry-run');
const season = new SeasonService();

// Match "senza seasonId": null OR campo assente
const MISSING = { $or: [{ seasonId: null }, { seasonId: { $exists: false } }] };

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

// Esegue le updateOne in bulk (a meno di dry-run)
async function flush(Model, ops, name) {
    if (DRY_RUN || ops.length === 0) return;
    await Model.bulkWrite(ops, { ordered: false });
}

function safeSeasonId(...dateCandidates) {
    for (const d of dateCandidates) {
        if (!d) continue;
        try {
            return season.resolveSeasonId(d);
        } catch (_) { /* prova il prossimo */ }
    }
    return null;
}

// ─── MATCH ───────────────────────────────────────────────────────────────────
async function backfillMatches() {
    const docs = await Match.find(MISSING).select('_id date').lean();
    let updated = 0, unresolved = 0;
    const ops = [];
    for (const m of docs) {
        const sid = safeSeasonId(m.date);
        if (!sid) { unresolved++; continue; }
        ops.push({ updateOne: { filter: { _id: m._id }, update: { $set: { seasonId: sid } } } });
        updated++;
    }
    await flush(Match, ops, 'Match');
    console.log(`📄 Match:         trovati=${docs.length} aggiornati=${updated} irrisolti=${unresolved}`);
    return { updated, unresolved };
}

// ─── VOTING SESSION ───────────────────────────────────────────────────────────
async function backfillVotingSessions() {
    const docs = await VotingSession.find(MISSING).select('_id type targetId startedAt createdAt').lean();
    let updated = 0, unresolved = 0;
    const ops = [];
    for (const s of docs) {
        let sid = null;
        if (s.type === 'match_rating' && s.targetId) {
            const match = await Match.findById(s.targetId).select('date seasonId').lean();
            sid = match?.seasonId || safeSeasonId(match?.date);
        }
        // fallback (player_card_rating o match mancante)
        sid = sid || safeSeasonId(s.startedAt, s.createdAt);
        if (!sid) { unresolved++; continue; }
        ops.push({ updateOne: { filter: { _id: s._id }, update: { $set: { seasonId: sid } } } });
        updated++;
    }
    await flush(VotingSession, ops, 'VotingSession');
    console.log(`🗳️  VotingSession: trovati=${docs.length} aggiornati=${updated} irrisolti=${unresolved}`);
    return { updated, unresolved };
}

// ─── VOTE RESULT ──────────────────────────────────────────────────────────────
async function backfillVoteResults() {
    const docs = await VoteResult.find(MISSING).select('_id votingSessionId createdAt').lean();
    let updated = 0, unresolved = 0;
    const ops = [];
    for (const r of docs) {
        let sid = null;
        const sess = await VotingSession.findById(r.votingSessionId).select('seasonId targetId startedAt').lean();
        if (sess) {
            sid = sess.seasonId;
            if (!sid && sess.targetId) {
                const match = await Match.findById(sess.targetId).select('date seasonId').lean();
                sid = match?.seasonId || safeSeasonId(match?.date);
            }
            sid = sid || safeSeasonId(sess.startedAt);
        }
        sid = sid || safeSeasonId(r.createdAt);
        if (!sid) { unresolved++; continue; }
        ops.push({ updateOne: { filter: { _id: r._id }, update: { $set: { seasonId: sid } } } });
        updated++;
    }
    await flush(VoteResult, ops, 'VoteResult');
    console.log(`📊 VoteResult:    trovati=${docs.length} aggiornati=${updated} irrisolti=${unresolved}`);
    return { updated, unresolved };
}

// ─── AWARD ────────────────────────────────────────────────────────────────────
async function backfillAwards() {
    const docs = await Award.find(MISSING).select('_id type refId payload generatedAt').lean();
    let updated = 0, unresolved = 0;
    const ops = [];
    for (const a of docs) {
        let sid = null;
        if (typeof a.refId === 'string' && a.refId.startsWith('season-')) {
            sid = a.refId.slice('season-'.length);                 // "season-2025-26" → "2025-26"
        } else if (a.type === 'MONTHLY_MVP' && /^\d{4}-\d{2}$/.test(a.refId || '')) {
            const [y, mm] = a.refId.split('-').map(Number);
            sid = safeSeasonId(new Date(y, mm - 1, 15));            // metà mese, evita edge fuso
        } else {
            sid = safeSeasonId(a.payload?.period?.dateTo, a.payload?.period?.dateFrom, a.generatedAt);
        }
        if (!sid) { unresolved++; continue; }
        const update = { seasonId: sid, 'payload.seasonId': sid };
        ops.push({ updateOne: { filter: { _id: a._id }, update: { $set: update } } });
        updated++;
    }
    await flush(Award, ops, 'Award');
    console.log(`🏆 Award:         trovati=${docs.length} aggiornati=${updated} irrisolti=${unresolved}`);
    return { updated, unresolved };
}

async function main() {
    await connectDB();
    console.log(`▶️  Backfill seasonId${DRY_RUN ? ' (DRY-RUN, nessuna scrittura)' : ''}\n`);

    const r1 = await backfillMatches();
    const r2 = await backfillVotingSessions();
    const r3 = await backfillVoteResults();
    const r4 = await backfillAwards();

    const totalUnresolved = r1.unresolved + r2.unresolved + r3.unresolved + r4.unresolved;
    console.log(`\n✅ Backfill completato.${DRY_RUN ? ' (DRY-RUN)' : ''}`);
    if (totalUnresolved > 0) {
        console.warn(`⚠️  ${totalUnresolved} documenti non risolti (seasonId non calcolabile). Esegui verify-season-data.js per dettagli.`);
    }
}

main()
    .then(async () => { await mongoose.disconnect(); process.exit(0); })
    .catch(async (err) => {
        console.error('❌ Backfill fallito:', err.message);
        await mongoose.disconnect().catch(() => { });
        process.exit(1);
    });
