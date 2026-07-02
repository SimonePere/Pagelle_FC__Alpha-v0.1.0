/**
 * 🌱 seed-seasons.js — Popola l'anagrafica GLOBALE delle stagioni (Fase 1).
 *
 * COSA FA
 *   - Crea (se mancante) la stagione CORRENTE → status 'active'
 *   - Crea (se mancante) la stagione SUCCESSIVA → status 'upcoming'
 *   Tutto derivato dinamicamente da SeasonService (confine 1 luglio → 30 giugno).
 *
 * IDEMPOTENTE
 *   Ri-eseguibile senza effetti collaterali: ensureSeason() non tocca le stagioni
 *   già esistenti (status incluso).
 *
 * USO
 *   node scripts/seed-seasons.js
 *   NODE_ENV=development node scripts/seed-seasons.js
 *
 * Seleziona il DB come server/src/config/database.js:
 *   development → MONGODB_URI_DEV · test → MONGODB_URI_TEST · default → MONGODB_URI
 */

require('dotenv').config();
const mongoose = require('mongoose');
const SeasonService = require('../src/services/SeasonService');

// ─── DB CONNECT (stessa logica di src/config/database.js) ────────────────────
async function connectDB() {
    const nodeEnv = process.env.NODE_ENV?.trim();
    let mongoUri;
    if (nodeEnv === 'development') mongoUri = process.env.MONGODB_URI_DEV;
    else if (nodeEnv === 'test') mongoUri = process.env.MONGODB_URI_TEST;
    else mongoUri = process.env.MONGODB_URI;

    const label = mongoUri?.includes('test') ? 'TEST'
        : mongoUri?.includes('dev') ? 'DEV' : 'PROD';
    console.log(`🔍 NODE_ENV: "${nodeEnv || '(default→prod)'}"`);
    console.log(`🔗 DB target: ${label}`);

    if (!mongoUri) throw new Error('MONGODB_URI non configurato per questo ambiente');
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB connesso');
}

// ─── SELF-CHECK FORMULA (sanity, nessun DB) ──────────────────────────────────
function selfCheck(service) {
    const cases = [
        ['2025-10-15', '2025-26'],
        ['2026-03-02', '2025-26'],
        ['2026-06-30', '2025-26'],
        ['2026-07-01', '2026-27']
    ];
    for (const [date, expected] of cases) {
        const got = service.resolveSeasonId(date);
        if (got !== expected) {
            throw new Error(`Self-check fallito: resolveSeasonId(${date}) = ${got}, atteso ${expected}`);
        }
    }
    console.log('🧪 Self-check formula stagione: OK');
}

async function main() {
    const service = new SeasonService();
    selfCheck(service);

    await connectDB();

    const now = new Date();
    const currentId = service.resolveSeasonId(now);
    const { seasonEnd } = service.seasonBounds(currentId);
    // seasonEnd è il 1 luglio successivo (escluso) → cade già nella stagione dopo
    const nextId = service.resolveSeasonId(seasonEnd);

    console.log(`\n📅 Stagione corrente: ${currentId} (${service.displayNameFor(currentId)})`);
    console.log(`📅 Stagione successiva: ${nextId} (${service.displayNameFor(nextId)})\n`);

    const current = await service.ensureSeason(currentId, 'active');
    const next = await service.ensureSeason(nextId, 'upcoming');

    console.log(`  ${current.status === 'active' ? '🟢' : '⚪'} ${current.seasonId} → status=${current.status}`);
    console.log(`  ${next.status === 'active' ? '🟢' : '⚪'} ${next.seasonId} → status=${next.status}`);

    const all = await service.listSeasons();
    console.log(`\n✅ Seed completato. Stagioni in anagrafica: ${all.length}`);
    all.forEach(s => console.log(`   • ${s.seasonId}  [${s.status}]  ${s.displayName}`));
}

main()
    .then(async () => { await mongoose.disconnect(); process.exit(0); })
    .catch(async (err) => {
        console.error('❌ Seed fallito:', err.message);
        await mongoose.disconnect().catch(() => { });
        process.exit(1);
    });
