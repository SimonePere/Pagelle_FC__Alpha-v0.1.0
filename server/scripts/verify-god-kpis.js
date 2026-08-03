/**
 * 🔎 verify-god-kpis.js — Verifica incrociata dei numeri della God Dashboard.
 *
 * COSA FA (sola lettura, non modifica nulla)
 *   Per ognuno dei 4 range (7d, 30d, 90d, total) stampa in parallelo:
 *     A) CONTEGGI GREZZI  → query dirette sulle collection (verità indipendente)
 *     B) NUMERI DEL SERVIZIO → gli stessi metodi che alimentano le API live
 *     C) SNAPSHOT → cosa servirebbe l'endpoint /overview se usa lo snapshot
 *   Così si confronta: DB reale  vs  API live  vs  snapshot  vs  UI.
 *
 * USO (l'app di test punta a MONGODB_URI_TEST):
 *   $env:NODE_ENV="test"; node scripts/verify-god-kpis.js
 *   (oppure development → MONGODB_URI_DEV, default → MONGODB_URI)
 */

require('dotenv').config();
const mongoose = require('mongoose');

const GodKpiService = require('../src/god/services/GodKpiService');
const User = require('../src/models/User');
const Team = require('../src/models/Team');
const Match = require('../src/models/Match');
const VotingSession = require('../src/models/VotingSession');
const VoteSubmission = require('../src/models/VoteSubmission');
const VoteResult = require('../src/models/VoteResult');
const PlayerCardSubmission = require('../src/models/PlayerCardSubmission');
const Award = require('../src/models/Award');

const RANGES = ['7d', '30d', '90d', 'total'];

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

const fmtDate = (d) => new Date(d).toISOString().replace('T', ' ').substring(0, 16);
const row = (label, ...vals) => console.log(`   ${String(label).padEnd(34)} ${vals.join('   ')}`);

async function main() {
    await connectDB();
    const service = new GodKpiService();
    const repo = service.repo;

    // Snapshot totali una tantum (non dipendono dal range)
    const totalUsersAll = await User.countDocuments({});
    const guestAll = await User.countDocuments({ isGuest: true });
    const registeredAll = await User.countDocuments({ isGuest: { $ne: true } });
    const active7d = await repo.countActiveUsers7d();
    const openSessions = await repo.countOpenVotingSessions();

    console.log('═══════════════════════════════════════════════════════════════');
    console.log(' NUMERI GLOBALI (identici in tutti i range)');
    console.log('═══════════════════════════════════════════════════════════════');
    row('Utenti totali (guest + registrati)', totalUsersAll);
    row('  di cui registrati (isGuest≠true)', registeredAll);
    row('  di cui ospiti  (isGuest=true)', guestAll);
    row('Attivi ultimi 7 giorni', active7d, '→ deve restare uguale su ogni range');
    row('Sessioni voto APERTE ora (match_rating active)', openSessions);

    for (const range of RANGES) {
        const r = service.resolveRange({ range });
        const { start, end } = r;
        const createdFilter = { createdAt: { $gte: start, $lte: end } };

        console.log(`\n═══════════════════════════════════════════════════════════════`);
        console.log(` RANGE = ${range.toUpperCase()}   (${fmtDate(start)} → ${fmtDate(end)})`);
        console.log('═══════════════════════════════════════════════════════════════');

        // ── A) CONTEGGI GREZZI indipendenti ─────────────────────────────────
        const [
            rawNewUsers, rawNewTeams, rawTeamsTotal, rawMatchesTotal, rawMatchesWin,
            rawSessAll, rawSessMatchRating, rawSessMatchCompleted,
            rawSessCard, rawSessCardCompleted,
            rawVoteSub, rawCardSub, rawVoteResults,
            rawAwardsByCreated, rawAwardsByGenerated,
        ] = await Promise.all([
            User.countDocuments({ ...createdFilter, isGuest: { $ne: true } }),
            Team.countDocuments(createdFilter),
            Team.countDocuments({}),
            Match.countDocuments({}),
            Match.countDocuments(createdFilter),
            VotingSession.countDocuments(createdFilter),
            VotingSession.countDocuments({ type: 'match_rating', ...createdFilter }),
            VotingSession.countDocuments({ type: 'match_rating', status: 'completed', ...createdFilter }),
            VotingSession.countDocuments({ type: 'player_card_rating', ...createdFilter }),
            VotingSession.countDocuments({ type: 'player_card_rating', status: 'completed', ...createdFilter }),
            VoteSubmission.countDocuments(createdFilter),
            PlayerCardSubmission.countDocuments(createdFilter),
            VoteResult.countDocuments(createdFilter),
            Award.countDocuments(createdFilter),
            Award.countDocuments({ generatedAt: { $gte: start, $lte: end } }),
        ]);

        console.log('\n  ── A) CONTEGGI GREZZI (query dirette DB) ──');
        row('Nuovi utenti registrati nel periodo', rawNewUsers);
        row('Nuovi team nel periodo', rawNewTeams, `(totali: ${rawTeamsTotal})`);
        row('Partite create nel periodo', rawMatchesWin, `(totali: ${rawMatchesTotal})`);
        row('Sessioni voto create nel periodo (tutte)', rawSessAll);
        row('  match_rating create', rawSessMatchRating);
        row('  match_rating completate', rawSessMatchCompleted);
        row('  player_card create', rawSessCard);
        row('  player_card completate', rawSessCardCompleted);
        row('VoteSubmission nel periodo', rawVoteSub);
        row('PlayerCardSubmission nel periodo', rawCardSub);
        row('VoteResult nel periodo (base gameplay)', rawVoteResults);
        row('Award per createdAt (overview)', rawAwardsByCreated);
        row('Award per generatedAt (endpoint awards)', rawAwardsByGenerated, '← usato dalla card Award');

        // ── B) NUMERI DEL SERVIZIO (API live) ───────────────────────────────
        const [overview, engagement, awards, guest, graph] = await Promise.all([
            service.computeOverviewMetrics(r),
            service.getEngagement({ range }),
            service.getAwardsKpi({ range }),
            service.getGuestConversionData({ range }),
            service.getDashboardGraphData({ range }),
        ]);

        console.log('\n  ── B) OVERVIEW (card principali, calcolo LIVE) ──');
        row('users.totalRegistered', overview.users.totalRegistered);
        row('users.newInWindow', overview.users.newInWindow);
        row('users.guestUsers', overview.users.guestUsers);
        row('users.activeUsers7d', overview.users.activeUsers7d);
        row('teams.total', overview.teams.total);
        row('teams.createdInWindow', overview.teams.createdInWindow);
        row('matches.total', overview.matches.total);
        row('matches.createdInWindow', overview.matches.createdInWindow);
        row('matches.openVotingSessions', overview.matches.openVotingSessions);
        row('voting.sessionsCreatedInWindow', overview.voting.sessionsCreatedInWindow);
        row('voting.submissionsInWindow', overview.voting.submissionsInWindow);
        row('playerCards.submissionsInWindow', overview.playerCards.submissionsInWindow);
        row('gameplay.totalGoals', overview.gameplay.totalGoals);
        row('gameplay.totalAssists', overview.gameplay.totalAssists);
        row('gameplay.avgRating', overview.gameplay.avgRating);
        row('gameplay.totalBadges', overview.gameplay.totalBadges);
        console.log(`   ${'gameplay.badgesBreakdown'.padEnd(34)} ${JSON.stringify(overview.gameplay.badgesBreakdown)}`);

        console.log('\n  ── ENGAGEMENT (LIVE) ──');
        row('voting.sessionsCreated', engagement.voting.sessionsCreated);
        row('voting.submissions', engagement.voting.submissions);
        row('voting.completionRate %', engagement.voting.completionRate);
        row('voting.avgParticipationRate %', engagement.voting.avgParticipationRate);
        row('voting.activeUsers7d', engagement.voting.activeUsers7d);
        row('playerCards.sessionsCreated', engagement.playerCards.sessionsCreated);
        row('playerCards.submissions', engagement.playerCards.submissions);
        row('playerCards.completionRate %', engagement.playerCards.completionRate);

        console.log('\n  ── AWARDS (LIVE) ──');
        row('pending', awards.pending);
        row('viewed', awards.viewed);
        row('shared', awards.shared);
        row('publicVisits', awards.publicVisits);
        row('downloads', awards.downloads);

        console.log('\n  ── GUEST CONVERSION (LIVE) ──');
        row('invited / guestLogins / promoted / rate', guest.invited, guest.guestLogins, guest.promoted, `${guest.conversionRate}%`);

        console.log('\n  ── GRAFICO TREND (LIVE) ──');
        const sum = (arr) => arr.reduce((a, b) => a + b, 0);
        row('n° etichette (bucket con dati)', graph.labels.length);
        for (const s of graph.series) row(`  serie "${s.label}" (somma)`, sum(s.data));

        // ── C) SNAPSHOT (cosa mostra la UI se badge = "snapshot") ───────────
        const snap = range === 'custom' ? null : await repo.getLatestSnapshot(range, 'hourly');
        console.log('\n  ── C) SNAPSHOT salvato (overview servito dalla UI) ──');
        if (!snap) {
            console.log('   ⚠️  Nessuno snapshot presente → la UI userà il calcolo LIVE (badge "live").');
        } else {
            const m = snap.metrics || {};
            row('generato il', fmtDate(snap.updatedAt || snap.bucketStart));
            row('users.totalRegistered (snap)', m.users?.totalRegistered);
            row('matches.createdInWindow (snap)', m.matches?.createdInWindow);
            row('gameplay.totalGoals (snap)', m.gameplay?.totalGoals);
            const liveVsSnap = m.users?.totalRegistered === overview.users.totalRegistered
                && m.matches?.createdInWindow === overview.matches.createdInWindow;
            console.log(`   ${liveVsSnap ? '✅ snapshot allineato al live' : '⚠️  snapshot DIVERSO dal live (dati cambiati dopo l\'ultimo cron)'}`);
        }
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(' Fatto. Confronta la colonna B (LIVE) con la UI.');
    console.log(' Se la UI mostra badge "snapshot", confronta invece con la sezione C.');
    console.log('═══════════════════════════════════════════════════════════════\n');

    await mongoose.disconnect();
}

main().catch((err) => {
    console.error('❌ Errore:', err);
    process.exit(1);
});
