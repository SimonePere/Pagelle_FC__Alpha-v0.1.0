/**
 * 🔎 verify-season-data.js — Verifica post-backfill della stagionalità (Fase 2).
 *
 * COSA CONTROLLA
 *   1. Documenti SENZA seasonId per ogni collection (atteso: 0)
 *   2. Coerenza VotingSession.seasonId == Match.seasonId collegato (match_rating)
 *   3. Coerenza VoteResult.seasonId == VotingSession.seasonId collegato
 *   4. Distribuzione record per seasonId (riepilogo)
 *
 * Sola lettura: non modifica nulla.
 *
 * USO
 *   node scripts/verify-season-data.js
 *   NODE_ENV=development node scripts/verify-season-data.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const Match = require('../src/models/Match');
const VotingSession = require('../src/models/VotingSession');
const VoteResult = require('../src/models/VoteResult');
const Award = require('../src/models/Award');

const MISSING = { $or: [{ seasonId: null }, { seasonId: { $exists: false } }] };

async function connectDB() {
    const nodeEnv = process.env.NODE_ENV?.trim();
    let mongoUri;
    if (nodeEnv === 'development') mongoUri = process.env.MONGODB_URI_DEV;
    else if (nodeEnv === 'test') mongoUri = process.env.MONGODB_URI_TEST;
    else mongoUri = process.env.MONGODB_URI;
    const label = mongoUri?.includes('test') ? 'TEST' : mongoUri?.includes('dev') ? 'DEV' : 'PROD';
    console.log(`🔍 NODE_ENV: "${nodeEnv || '(default→prod)'}" · DB: ${label}\n`);
    if (!mongoUri) throw new Error('MONGODB_URI non configurato per questo ambiente');
    await mongoose.connect(mongoUri);
}

async function distribution(Model, name) {
    const rows = await Model.aggregate([
        { $group: { _id: '$seasonId', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
    ]);
    const parts = rows.map(r => `${r._id || 'NULL'}=${r.count}`).join('  ');
    console.log(`   ${name.padEnd(14)} ${parts}`);
}

async function main() {
    await connectDB();

    // 1. Missing
    console.log('1️⃣  Documenti senza seasonId (atteso 0):');
    const missing = {
        Match: await Match.countDocuments(MISSING),
        VotingSession: await VotingSession.countDocuments(MISSING),
        VoteResult: await VoteResult.countDocuments(MISSING),
        Award: await Award.countDocuments(MISSING)
    };
    let allZero = true;
    for (const [k, v] of Object.entries(missing)) {
        console.log(`   ${v === 0 ? '✅' : '❌'} ${k.padEnd(14)} ${v}`);
        if (v !== 0) allZero = false;
    }

    // 2. Coerenza VotingSession ↔ Match
    console.log('\n2️⃣  Coerenza VotingSession.seasonId == Match.seasonId (match_rating):');
    const sessions = await VotingSession.find({ type: 'match_rating' }).select('seasonId targetId').lean();
    let sMismatch = 0;
    for (const s of sessions) {
        const m = await Match.findById(s.targetId).select('seasonId').lean();
        if (m && m.seasonId && s.seasonId && m.seasonId !== s.seasonId) sMismatch++;
    }
    console.log(`   ${sMismatch === 0 ? '✅' : '❌'} mismatch=${sMismatch} su ${sessions.length} sessioni`);

    // 3. Coerenza VoteResult ↔ VotingSession
    console.log('\n3️⃣  Coerenza VoteResult.seasonId == VotingSession.seasonId:');
    const results = await VoteResult.find().select('seasonId votingSessionId').lean();
    let rMismatch = 0;
    for (const r of results) {
        const s = await VotingSession.findById(r.votingSessionId).select('seasonId').lean();
        if (s && s.seasonId && r.seasonId && s.seasonId !== r.seasonId) rMismatch++;
    }
    console.log(`   ${rMismatch === 0 ? '✅' : '❌'} mismatch=${rMismatch} su ${results.length} risultati`);

    // 4. Distribuzione
    console.log('\n4️⃣  Distribuzione per seasonId:');
    await distribution(Match, 'Match');
    await distribution(VotingSession, 'VotingSession');
    await distribution(VoteResult, 'VoteResult');
    await distribution(Award, 'Award');

    const ok = allZero && sMismatch === 0 && rMismatch === 0;
    console.log(`\n${ok ? '✅ VERIFICA OK' : '❌ VERIFICA CON ANOMALIE'} — controlla i punti contrassegnati ❌`);
    process.exitCode = ok ? 0 : 2;
}

main()
    .then(async () => { await mongoose.disconnect(); })
    .catch(async (err) => {
        console.error('❌ Verifica fallita:', err.message);
        await mongoose.disconnect().catch(() => { });
        process.exit(1);
    });
