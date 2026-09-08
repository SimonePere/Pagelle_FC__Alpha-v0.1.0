/**
 * 🎬 seedDemoData.js — Popola la squadra dimostrativa pubblica "I Bomber (Demo)"
 *
 * COSA CREA
 *   - 1 team demo con 12 giocatori (nomi corti, niente cognomi, niente avatar:
 *     il fallback a iniziali dell'app fa già il suo lavoro)
 *   - ~25 partite su DUE stagioni, con voti, risultati e MVP
 *   - 12 player card complete (attributi movimento + portieri)
 *   - Statistiche stagionali e di classifica
 *   - Award: recap partita, MVP mensili, Pallone d'Oro e Scarpa d'Oro
 *   - Bonus Golden TOT dei vincitori, attivi nella stagione corrente
 *   - News per popolare la home
 *   - 1 SESSIONE DI VOTO APERTA — il cuore di ciò che la demo mostra
 *
 * ⚠️ SICUREZZA — LEGGERE PRIMA DI MODIFICARE
 *   Questo script gira contro il database di PRODUZIONE. Tre protezioni:
 *
 *   1. GUARDIA D'INGRESSO: se il team demo non è risolto in modo inequivocabile,
 *      aborta PRIMA di qualunque scrittura.
 *   2. safeDelete(): rifiuta i filtri vuoti o con valori undefined. Senza questo,
 *      un `deleteMany({ teamId: undefined })` diventerebbe `deleteMany({})` —
 *      Mongoose scarta le chiavi undefined — e svuoterebbe l'intera collection.
 *   3. DRY-RUN DI DEFAULT: senza --confirm lo script mostra solo cosa farebbe.
 *
 *   In più, ogni documento creato porta `isDemo: true`, quindi tutte le
 *   cancellazioni sono `deleteMany({ isDemo: true })`: nel caso peggiore non
 *   cancellano nulla, mai troppo.
 *
 * USO
 *   node src/utils/seedDemoData.js                   → dry-run (non scrive)
 *   node src/utils/seedDemoData.js --confirm         → esegue davvero
 *   NODE_ENV=test node src/utils/seedDemoData.js --confirm   → sul DB di test
 *
 * IDEMPOTENTE: rilanciabile quante volte si vuole, ricostruisce da zero i soli
 * dati demo.
 *
 * Vedi DEMO_MODE_IMPLEMENTATION_PLAN.md §A.2 e §3.9
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const Team = require('../models/Team');
const User = require('../models/User');
const Match = require('../models/Match');
const VotingSession = require('../models/VotingSession');
const VoteSubmission = require('../models/VoteSubmission');
const VoteResult = require('../models/VoteResult');
const PlayerCardSubmission = require('../models/PlayerCardSubmission');
const PlayerCardResult = require('../models/PlayerCardResult');
const PlayerSeasonStats = require('../models/PlayerSeasonStats');
const PlayerLeaderboardStats = require('../models/PlayerLeaderboardStats');
const Award = require('../models/Award');
const News = require('../models/News');
const { GoldenTot } = require('../models/GoldenTot');
const Avatar = require('../models/Avatar');
const MatchNotification = require('../models/MatchNotification');
const Season = require('../models/Season');

const SeasonService = require('../services/SeasonService');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURAZIONE
// ═══════════════════════════════════════════════════════════════════════════

const DRY_RUN = !process.argv.includes('--confirm');

const TEAM_NAME = 'I Bomber (Demo)';
const TEAM_INVITE_CODE = 'DEMO01';

// Email interne segnaposto: mai comunicate, mai usate per accedere, mai
// destinatarie di alcun invio.
// ⚠️ Il TLD deve essere di 2-3 caratteri: la validazione email di User.js usa
//    la regex (.w{2,3})+, che rifiuta suffissi più lunghi come .local.
// Il visitatore entra via /auth/demo-login, che non richiede credenziali.
const EMAIL_DOMAIN = '@demo.pagellefc.app';

/**
 * I 12 giocatori. Nomi corti e informali, come ci si chiama davvero a calcetto.
 * Nessun avatar: l'app mostra le iniziali su gradiente quando manca la foto,
 * esattamente come per un team vero appena creato.
 *
 * `skill` (0-1) governa quanto forte è il giocatore: alimenta sia i voti partita
 * sia gli attributi della player card, così i numeri raccontano la stessa storia.
 * `consistency` (0-1) quanto è costante: chi ce l'ha bassa produce grafici di
 * rendimento più mossi, che è ciò che rende interessante la pagina Statistiche.
 */
const PLAYERS = [
    { name: 'Simo', position: 'POR', foot: 'right', skill: 0.72, consistency: 0.80, captain: false },
    { name: 'Teo', position: 'POR', foot: 'right', skill: 0.58, consistency: 0.55, captain: false },
    { name: 'Ale', position: 'DIF', foot: 'left', skill: 0.70, consistency: 0.85, captain: true },
    { name: 'Gabri', position: 'DIF', foot: 'right', skill: 0.64, consistency: 0.70, captain: false },
    { name: 'Nico', position: 'DIF', foot: 'right', skill: 0.60, consistency: 0.60, captain: false },
    { name: 'Manu', position: 'DIF', foot: 'left', skill: 0.55, consistency: 0.50, captain: false },
    { name: 'Fede', position: 'CEN', foot: 'right', skill: 0.68, consistency: 0.65, captain: false },
    { name: 'Lore', position: 'CEN', foot: 'left', skill: 0.75, consistency: 0.78, captain: false },
    { name: 'Cri', position: 'CEN', foot: 'right', skill: 0.62, consistency: 0.58, captain: false },
    { name: 'Miki', position: 'CEN', foot: 'both', skill: 0.59, consistency: 0.62, captain: false },
    { name: 'Johnny', position: 'ATT', foot: 'right', skill: 0.88, consistency: 0.82, captain: false }, // 🏆 Pallone d'Oro
    { name: 'Ricky', position: 'ATT', foot: 'left', skill: 0.80, consistency: 0.68, captain: false },  // 👟 Scarpa d'Oro
];

const CAPTAIN_NAME = 'Ale';
const BALLON_DOR_WINNER = 'Johnny';
const GOLDEN_BOOT_WINNER = 'Ricky';

const FIELDS = [
    'Centro Sportivo Meazza',
    'Campo Comunale',
    'Arena Sport Village',
    'Polisportiva San Siro',
    'Bocciofila Sport Center',
];

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * PRNG deterministico (mulberry32): lo stesso seed produce sempre gli stessi
 * dati. Serve perché una demo riproducibile è molto più facile da verificare
 * e da correggere di una che cambia a ogni esecuzione.
 */
function makeRandom(seed) {
    let a = seed;
    return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const rnd = makeRandom(20260908);

const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const between = (min, max) => min + rnd() * (max - min);
const intBetween = (min, max) => Math.floor(between(min, max + 1));
const round2 = (n) => Math.round(n * 100) / 100;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

/**
 * Mescola una copia dell'array (Fisher-Yates).
 * Non si usa `sort(() => rnd() - 0.5)`: non produce una permutazione uniforme
 * e lascia gli elementi quasi in ordine, sbilanciando le presenze.
 */
function shuffled(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/**
 * Cancellazione con guardia. È l'unico punto da cui questo script rimuove dati.
 *
 * Rifiuta qualunque filtro vuoto o con valori undefined/null: senza questo
 * controllo un filtro degenere diventerebbe `{}` e cancellerebbe l'intera
 * collection, dati reali degli utenti compresi.
 */
async function safeDelete(Model, filter, label) {
    const keys = Object.keys(filter || {});
    if (keys.length === 0) {
        throw new Error(`ABORT safeDelete(${label}): filtro vuoto — cancellerebbe tutto`);
    }
    for (const k of keys) {
        if (filter[k] === undefined || filter[k] === null) {
            throw new Error(`ABORT safeDelete(${label}): filtro."${k}" è ${filter[k]}`);
        }
    }

    const count = await Model.countDocuments(filter);
    if (DRY_RUN) {
        console.log(`   [dry-run] ${label.padEnd(26)} cancellerebbe ${count} doc`);
        return count;
    }
    if (count > 0) await Model.deleteMany(filter);
    console.log(`   ${label.padEnd(26)} cancellati ${count} doc`);
    return count;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONNESSIONE DB (stessa logica di src/config/database.js)
// ═══════════════════════════════════════════════════════════════════════════

async function connectDB() {
    const nodeEnv = process.env.NODE_ENV?.trim();
    let mongoUri;
    if (nodeEnv === 'development') mongoUri = process.env.MONGODB_URI_DEV;
    else if (nodeEnv === 'test') mongoUri = process.env.MONGODB_URI_TEST;
    else mongoUri = process.env.MONGODB_URI;

    const label = mongoUri?.includes('test') ? 'TEST'
        : mongoUri?.includes('dev') ? 'DEV' : 'PROD';

    console.log(`🔍 NODE_ENV: "${nodeEnv || '(default → prod)'}"`);
    console.log(`🔗 DB target: ${label}`);

    if (!mongoUri) throw new Error('MONGODB_URI non configurato per questo ambiente');
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB connesso');
    return label;
}

// ═══════════════════════════════════════════════════════════════════════════
// FASE 1 — VERIFICA STAGIONI
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Le stagioni sono un CALENDARIO GLOBALE, uguale per tutti i team, come i mesi
 * dell'anno. Questo script non ne crea: inventarne una la mostrerebbe anche
 * agli utenti veri. Si limita a verificare che esistano quelle che gli servono
 * e a datarci dentro le partite del team demo.
 */
async function verifySeasons() {
    console.log('\n📅 FASE 1 — Verifica calendario stagioni');

    const svc = new SeasonService();
    const currentSeasonId = svc.resolveSeasonId(new Date());

    // Stagione precedente: "2026-27" → "2025-26"
    const startYear = parseInt(currentSeasonId.slice(0, 4), 10);
    const prevSeasonId = `${startYear - 1}-${String(startYear).slice(2)}`;

    const [current, previous] = await Promise.all([
        Season.findOne({ seasonId: currentSeasonId }).lean(),
        Season.findOne({ seasonId: prevSeasonId }).lean(),
    ]);

    if (!current || !previous) {
        const missing = [!current && currentSeasonId, !previous && prevSeasonId].filter(Boolean);
        throw new Error(
            `ABORT: stagioni mancanti nel calendario globale: ${missing.join(', ')}.\n` +
            `   Popolale prima con:  node scripts/seed-seasons.js\n` +
            `   (sono anagrafica condivisa con gli utenti reali, non le crea questo script)`
        );
    }

    console.log(`   Stagione corrente:   ${currentSeasonId} (${current.status})`);
    console.log(`   Stagione precedente: ${prevSeasonId} (${previous.status})`);

    return { currentSeasonId, prevSeasonId, current, previous };
}

// ═══════════════════════════════════════════════════════════════════════════
// FASE 2 — PULIZIA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Rimuove tutti i dati demo preesistenti.
 *
 * Grazie al flag `isDemo` propagato su tutti i modelli, ogni collection si
 * ripulisce da sola con lo stesso filtro: niente cancellazione a cascata,
 * niente ordine di dipendenze da rispettare, niente id da raccogliere prima.
 */
async function cleanup() {
    console.log('\n🧹 FASE 2 — Pulizia dati demo preesistenti');

    // ── Marcatura preventiva ────────────────────────────────────────────
    // Gli hook post-save dei modelli generano documenti derivati SENZA il flag
    // demo (vedi markDerivedDocsAsDemo). Se cancellassimo il team prima di
    // marcarli, quei documenti perderebbero l'unico aggancio che li rende
    // riconoscibili e resterebbero per sempre nel database, accumulandosi a
    // ogni ri-seed. È successo davvero durante lo sviluppo. Quindi: prima si
    // marca, poi si cancella.
    const existingDemoTeam = await Team.findOne({ isDemo: true }).select('_id').lean();
    if (existingDemoTeam?._id) {
        const pending = await PlayerLeaderboardStats.countDocuments({
            teamId: existingDemoTeam._id, isDemo: { $ne: true }
        });
        if (pending > 0) {
            if (DRY_RUN) {
                console.log(`   [dry-run] marcherebbe ${pending} doc derivati prima di cancellare`);
            } else {
                const n = await markDerivedDocsAsDemo(existingDemoTeam._id);
                console.log(`   Marcati ${n} doc derivati dagli hook prima della pulizia`);
            }
        }
    }

    const DEMO = { isDemo: true };
    const collections = [
        [VoteSubmission, 'VoteSubmission'],
        [VoteResult, 'VoteResult'],
        [PlayerCardSubmission, 'PlayerCardSubmission'],
        [PlayerCardResult, 'PlayerCardResult'],
        [VotingSession, 'VotingSession'],
        [Match, 'Match'],
        [PlayerSeasonStats, 'PlayerSeasonStats'],
        [PlayerLeaderboardStats, 'PlayerLeaderboardStats'],
        [Award, 'Award'],
        [News, 'News'],
        [GoldenTot, 'GoldenTot'],
        [MatchNotification, 'MatchNotification'],
        [Avatar, 'Avatar'],
        [User, 'User'],
        [Team, 'Team'],
    ];

    let total = 0;
    for (const [Model, label] of collections) {
        total += await safeDelete(Model, DEMO, label);
    }

    console.log(`   ─────────────────────────────────────────`);
    console.log(`   Totale: ${total} documenti`);
    return total;
}

// ═══════════════════════════════════════════════════════════════════════════
// FASE 3 — TEAM E GIOCATORI
// ═══════════════════════════════════════════════════════════════════════════

async function createTeamAndPlayers(seasons) {
    console.log('\n👥 FASE 3 — Team e giocatori');

    if (DRY_RUN) {
        console.log(`   [dry-run] creerebbe il team "${TEAM_NAME}" con ${PLAYERS.length} giocatori`);
        return null;
    }

    // Password casuale lunga, mai comunicata: l'accesso alla demo passa solo
    // da /auth/demo-login, che non chiede credenziali.
    const hashed = await bcrypt.hash(`demo-${Date.now()}-${Math.random()}`, 10);

    const teamId = new mongoose.Types.ObjectId();

    const users = [];
    for (const p of PLAYERS) {
        const user = await User.create({
            name: p.name,
            email: `${p.name.toLowerCase()}${EMAIL_DOMAIN}`,
            password: hashed,
            birthdate: `19${intBetween(80, 99)}-${String(intBetween(1, 12)).padStart(2, '0')}-${String(intBetween(1, 28)).padStart(2, '0')}`,
            teamIds: [teamId],
            teamName: TEAM_NAME,
            role: p.captain ? 'captain' : 'player',
            profile: {
                position: p.position,
                preferredFoot: p.foot,
                bio: p.captain ? 'Capitano de I Bomber. Organizza le partite e tiene unito il gruppo.' : undefined,
            },
            isActive: true,
            isDemo: true,
        });
        users.push({ ...p, doc: user, id: user._id });
    }

    const captain = users.find(u => u.name === CAPTAIN_NAME);

    // La stagione demo si è chiusa a fine stagione precedente: è la data che
    // rende coerenti Pallone d'Oro e Scarpa d'Oro già assegnati.
    const seasonEndDate = new Date(seasons.previous.seasonEnd);
    seasonEndDate.setDate(seasonEndDate.getDate() - 1);

    const team = await Team.create({
        _id: teamId,
        name: TEAM_NAME,
        description: 'Squadra dimostrativa di Pagelle FC — esplora liberamente, i dati non vengono salvati.',
        city: 'Milano',
        createdBy: captain.id,
        adminIds: [captain.id],
        memberIds: users.map(u => u.id),
        inviteCode: TEAM_INVITE_CODE,
        settings: { isPrivate: true, maxMembers: 25, autoApprove: false, allowGuestVoting: false },
        colors: { primary: '#2563eb', secondary: '#f59e0b' },
        seasonEndDate,
        // I cron sono già esclusi via isDemo, ma questa è la seconda bretella:
        // il contenuto della bacheca demo resta quello curato qui.
        awardsEnabled: false,
        isActive: true,
        isDemo: true,
    });

    console.log(`   Team creato: ${team.name} (${team._id})`);
    console.log(`   Giocatori:   ${users.map(u => u.name).join(', ')}`);
    console.log(`   Capitano:    ${captain.name} — è l'identità in cui entra il visitatore`);

    return { team, users, captain };
}

// ═══════════════════════════════════════════════════════════════════════════
// FASE 4 — PARTITE E VOTI
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Genera il voto di un giocatore in una partita.
 * Parte dalla sua bravura di base, aggiunge una variazione governata dalla
 * costanza, e arrotonda al quarto di punto come fa lo slider dell'app.
 */
function generateRating(player) {
    const base = 5.0 + player.skill * 3.2;                 // 5.0 → 8.2
    const spread = (1 - player.consistency) * 2.4;         // meno costante, più oscilla
    const raw = base + between(-spread, spread);
    return round2(Math.round(clamp(raw, 4, 9.5) * 4) / 4); // step 0.25
}

function gradeFor(avg) {
    if (avg >= 8.5) return 'A+';
    if (avg >= 8.0) return 'A';
    if (avg >= 7.5) return 'B+';
    if (avg >= 7.0) return 'B';
    if (avg >= 6.5) return 'C+';
    if (avg >= 6.0) return 'C';
    if (avg >= 5.0) return 'D';
    return 'F';
}

/**
 * Costruisce le date delle partite: settimanali, il giovedì sera.
 * `count` partite che terminano `endingBefore` giorni fa.
 */
function buildMatchDates(count, endDate) {
    const dates = [];
    const d = new Date(endDate);
    for (let i = 0; i < count; i++) {
        dates.unshift(new Date(d));
        d.setDate(d.getDate() - 7);
    }
    return dates;
}

async function createMatchesAndVotes(ctx, seasons) {
    console.log('\n⚽ FASE 4 — Partite, votazioni e risultati');

    if (DRY_RUN) {
        console.log('   [dry-run] creerebbe ~25 partite su 2 stagioni, con voti e risultati');
        console.log('   [dry-run] l\'ultima resterebbe con la votazione APERTA');
        return null;
    }

    const { team, users, captain } = ctx;
    const svc = new SeasonService();

    // Stagione precedente: 15 partite concluse, l'ultima a maggio.
    const prevEnd = new Date(seasons.previous.seasonEnd);
    prevEnd.setMonth(prevEnd.getMonth() - 1); // circa fine maggio
    const prevDates = buildMatchDates(15, prevEnd);

    // Stagione corrente: 10 partite, l'ultima pochi giorni fa.
    const currEnd = new Date();
    currEnd.setDate(currEnd.getDate() - 2);
    const currDates = buildMatchDates(10, currEnd);

    const allDates = [...prevDates, ...currDates];
    const matches = [];
    const seasonTotals = {}; // seasonId -> playerId -> aggregati

    for (let i = 0; i < allDates.length; i++) {
        const date = allDates[i];
        const isLast = i === allDates.length - 1;
        const dateStr = date.toISOString().slice(0, 10);
        const seasonId = svc.resolveSeasonId(dateStr);

        // 10 dei 12 giocatori per partita: chi salta cambia ogni volta, così le
        // presenze non sono tutte uguali e la pagina Statistiche ha di che dire.
        const roster = shuffled(users).slice(0, 10);

        const teamGoals = intBetween(2, 9);
        const opponentGoals = intBetween(1, 8);

        const match = await Match.create({
            createdBy: captain.id,
            teamId: String(team._id),   // ⚠️ Match.teamId è String, non ObjectId
            date: dateStr,
            field: pick(FIELDS),
            playersCount: 8,
            notes: isLast ? 'Partita appena giocata — votazioni aperte!' : undefined,
            teamMemberIds: roster.map(p => p.id),
            status: isLast ? 'active' : 'completed',
            seasonId,
            isDemo: true,
        });

        // ── Sessione di voto ──────────────────────────────────────────────
        // L'ultima partita resta APERTA: è ciò che permette al visitatore di
        // provare davvero a votare. deadline: null così il cron non la chiude
        // (vedi closeExpiredVotingSessions, che scarta deadline nulle).
        const session = await VotingSession.create({
            type: 'match_rating',
            targetId: match._id,
            teamId: team._id,
            title: `Voti — ${match.field} · ${dateStr}`,
            createdBy: captain.id,
            eligibleVoters: roster.map(p => p.id),   // array di ObjectId, non di oggetti
            requiredVotes: roster.length,
            status: isLast ? 'active' : 'completed',
            deadline: null,
            seasonId,
            isDemo: true,
        });

        // ── Voti dei partecipanti ─────────────────────────────────────────
        const ratings = {};      // playerId -> [voti ricevuti]
        const goalsMap = {};
        const assistsMap = {};

        for (const p of roster) {
            ratings[p.id.toString()] = [];
            goalsMap[p.id.toString()] = 0;
            assistsMap[p.id.toString()] = 0;
        }

        // Gol e assist distribuiti pesando la bravura degli attaccanti
        let goalsLeft = teamGoals;
        const scorers = shuffled(roster).sort((a, b) => b.skill - a.skill);
        for (const s of scorers) {
            if (goalsLeft <= 0) break;
            const isForward = s.position === 'ATT';
            const g = Math.min(goalsLeft, isForward ? intBetween(0, 3) : intBetween(0, 1));
            goalsMap[s.id.toString()] = g;
            goalsLeft -= g;
        }
        for (const s of roster) {
            assistsMap[s.id.toString()] = rnd() > 0.65 ? intBetween(1, 2) : 0;
        }

        // Il votante non vota se stesso: è la regola dell'app.
        // Su una parte dei votanti simuliamo l'astensione, che è una feature
        // dichiarata di Pagelle FC e vale la pena mostrarla.
        for (const voter of roster) {
            const abstains = rnd() > 0.88;
            const playerRatings = [];

            if (!abstains) {
                for (const target of roster) {
                    if (target.id.equals(voter.id)) continue;
                    const rating = generateRating(target);
                    ratings[target.id.toString()].push(rating);
                    playerRatings.push({
                        playerId: target.id,
                        rating,
                        goals: goalsMap[target.id.toString()],
                        assists: assistsMap[target.id.toString()],
                    });
                }
            }

            // Nella sessione ancora aperta lasciamo qualche voto mancante, così
            // il visitatore trova una votazione realmente in corso.
            if (isLast && rnd() > 0.5) continue;

            await VoteSubmission.create({
                votingSessionId: session._id,
                voterId: voter.id,
                voteData: { playerRatings },
                isActive: true,
                isDemo: true,
            });
        }

        // ── Risultato aggregato (solo per le partite concluse) ─────────────
        if (!isLast) {
            const matchRatingResults = {};
            let sumAvg = 0, nPlayers = 0, totGoals = 0, totAssists = 0;
            let best = null;

            for (const p of roster) {
                const key = p.id.toString();
                const list = ratings[key];
                if (!list.length) continue;

                const avg = round2(list.reduce((a, b) => a + b, 0) / list.length);
                const variance = list.reduce((a, b) => a + (b - avg) ** 2, 0) / list.length;

                const entry = {
                    playerId: p.id,
                    averageRating: avg,
                    medianRating: avg,
                    goals: goalsMap[key],
                    assists: assistsMap[key],
                    voteCount: list.length,
                    badges: [],
                    grade: gradeFor(avg),
                    standardDeviation: round2(Math.sqrt(variance)),
                    confidence: round2(clamp(list.length / roster.length, 0, 1)),
                };

                if (goalsMap[key] >= 2) entry.badges.push('goleador');
                if (assistsMap[key] >= 2) entry.badges.push('assist_man');
                if (p.position === 'DIF' && avg >= 7) entry.badges.push('difensore');

                matchRatingResults[key] = entry;
                sumAvg += avg; nPlayers++;
                totGoals += entry.goals; totAssists += entry.assists;

                if (!best || avg > best.avg) best = { id: p.id, avg, key, name: p.name };
            }

            if (best) matchRatingResults[best.key].badges.push('mvp');

            const distribution = { '9-10': 0, '8-9': 0, '7-8': 0, '6-7': 0, '5-6': 0, 'below-5': 0 };
            for (const k of Object.keys(matchRatingResults)) {
                const a = matchRatingResults[k].averageRating;
                if (a >= 9) distribution['9-10']++;
                else if (a >= 8) distribution['8-9']++;
                else if (a >= 7) distribution['7-8']++;
                else if (a >= 6) distribution['6-7']++;
                else if (a >= 5) distribution['5-6']++;
                else distribution['below-5']++;
            }

            const badgesSummary = { mvp: 0, goleador: 0, assist_man: 0, difensore: 0, maratoneta: 0, gol_bello: 0 };
            for (const k of Object.keys(matchRatingResults)) {
                for (const b of matchRatingResults[k].badges) badgesSummary[b]++;
            }

            await VoteResult.create({
                votingSessionId: session._id,
                seasonId,
                matchRatingResults,
                sessionMetadata: {
                    totalVoters: roster.length,
                    sessionType: 'match_rating',
                    calculatedAt: date,
                    playersCount: nPlayers,
                    completionRate: 100,
                },
                statistics: {
                    voteCount: roster.length,
                    overallAverageRating: round2(sumAvg / Math.max(nPlayers, 1)),
                    totalGoalsReported: totGoals,
                    totalAssistsReported: totAssists,
                    ratingDistribution: distribution,
                    badgesSummary,
                },
                isDemo: true,
            });

            await Match.updateOne(
                { _id: match._id },
                {
                    $set: {
                        'finalResults.mvpPlayer': best?.id,
                        'finalResults.teamGoals': teamGoals,
                        'finalResults.opponentGoals': opponentGoals,
                    }
                }
            );

            // Accumula i totali per le statistiche stagionali
            seasonTotals[seasonId] = seasonTotals[seasonId] || {};
            for (const k of Object.keys(matchRatingResults)) {
                const r = matchRatingResults[k];
                const t = seasonTotals[seasonId][k] = seasonTotals[seasonId][k] || {
                    matches: 0, ratingSum: 0, goals: 0, assists: 0, mvp: 0, ratings: []
                };
                t.matches++;
                t.ratingSum += r.averageRating;
                t.ratings.push(r.averageRating);
                t.goals += r.goals;
                t.assists += r.assists;
                if (r.badges.includes('mvp')) t.mvp++;
            }
        }

        matches.push({ match, session, date, seasonId, isLast, mvp: null });
    }

    const openOnes = matches.filter(m => m.isLast).length;
    console.log(`   Partite create: ${matches.length} (${prevDates.length} in ${seasons.prevSeasonId}, ${currDates.length} in ${seasons.currentSeasonId})`);
    console.log(`   Votazioni aperte: ${openOnes} — deadline null, il cron non la tocca`);

    return { matches, seasonTotals };
}

// ═══════════════════════════════════════════════════════════════════════════
// FASE 5 — PLAYER CARDS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Genera gli attributi di una player card a partire dalla bravura del giocatore
 * e dal suo ruolo, così un difensore ha davvero i numeri di un difensore.
 */
function generateAttributes(player) {
    const base = 45 + player.skill * 40;   // 45 → 85
    const jitter = () => intBetween(-8, 8);
    const byRole = {
        POR: { tir: -25, pas: -10, dri: -18, fin: -28, vis: -5, res: 0, for: 5, con: 0, int: 5, prt: 0 },
        DIF: { tir: -12, pas: 0, dri: -8, fin: -15, vis: 0, res: 5, for: 8, con: 5, int: 10, prt: 0 },
        CEN: { tir: 0, pas: 10, dri: 5, fin: -5, vis: 12, res: 8, for: 0, con: 5, int: 5, prt: 0 },
        ATT: { tir: 12, pas: -5, dri: 10, fin: 15, vis: 0, res: 0, for: 0, con: -5, int: -8, prt: 0 },
    }[player.position];

    const attrs = {};
    for (const key of ['tir', 'pas', 'dri', 'fin', 'vis', 'res', 'for', 'con', 'int', 'prt']) {
        attrs[key] = Math.round(clamp(base + byRole[key] + jitter(), 20, 96));
    }
    return attrs;
}

async function createPlayerCards(ctx) {
    console.log('\n🃏 FASE 5 — Player cards');

    if (DRY_RUN) {
        console.log(`   [dry-run] creerebbe ${PLAYERS.length} player card con attributi e valutazioni`);
        return null;
    }

    const { team, users, captain } = ctx;
    const cards = [];

    // Una sessione player_card_rating per giocatore, come fa l'app
    for (const target of users) {
        const session = await VotingSession.create({
            type: 'player_card_rating',
            targetId: target.id,
            teamId: team._id,
            title: `Player Card — ${target.name}`,
            createdBy: captain.id,
            eligibleVoters: users.filter(u => !u.id.equals(target.id)).map(u => u.id),
            requiredVotes: users.length - 1,
            status: 'completed',
            deadline: null,
            isDemo: true,
        });

        // I compagni valutano: ognuno con una piccola variazione personale
        const voters = users.filter(u => !u.id.equals(target.id)).slice(0, 8);
        const collected = {};
        for (const key of ['tir', 'pas', 'dri', 'fin', 'vis', 'res', 'for', 'con', 'int', 'prt']) collected[key] = [];

        for (const voter of voters) {
            const attrs = generateAttributes(target);
            await PlayerCardSubmission.create({
                votingSessionId: session._id,
                voterId: voter.id,
                targetPlayerId: target.id,
                attributes: attrs,
                additionalAttributes: {
                    piedeDebole: intBetween(2, 5),
                    skill: intBetween(2, 5),
                },
                isActive: true,
                isDemo: true,
            });
            for (const k of Object.keys(attrs)) collected[k].push(attrs[k]);
        }

        const finalAttributes = {};
        for (const k of Object.keys(collected)) {
            finalAttributes[k] = Math.round(collected[k].reduce((a, b) => a + b, 0) / collected[k].length);
        }

        // TOT: media pesata semplice degli attributi principali
        const overall = Math.round(
            Object.values(finalAttributes).reduce((a, b) => a + b, 0) / Object.keys(finalAttributes).length
        );

        const result = await PlayerCardResult.create({
            votingSessionId: session._id,
            targetPlayerId: target.id,
            finalAttributes,
            finalAdditionalAttributes: { piedeDebole: intBetween(2, 5), skill: intBetween(2, 5) },
            finalOverallRating: clamp(overall, 10, 100),
            sessionMetadata: {
                totalVoters: voters.length,
                sessionType: 'player_card_rating',
                calculatedAt: new Date(),
            },
            statistics: { voteCount: voters.length },
            isDemo: true,
        });

        cards.push({ player: target, result, overall });
    }

    console.log(`   Player card create: ${cards.length}`);
    console.log(`   TOT più alto: ${cards.sort((a, b) => b.overall - a.overall)[0].player.name} (${cards[0].overall})`);

    return cards;
}

// ═══════════════════════════════════════════════════════════════════════════
// FASE 6 — STATISTICHE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Marca come demo i documenti creati automaticamente dagli hook dei modelli.
 *
 * Alcuni schemi (VoteResult, PlayerCardResult) hanno hook post-save che
 * ricalcolano le classifiche scrivendo su PlayerLeaderboardStats. È un bene:
 * i numeri risultano identici a quelli di un team vero. Ma quegli hook non
 * conoscono la demo e non propagano `isDemo`, quindi la marcatura va fatta
 * qui, a valle, o quelle righe diventano invisibili alle pulizie.
 */
async function markDerivedDocsAsDemo(teamId) {
    const res = await PlayerLeaderboardStats.updateMany(
        { teamId, isDemo: { $ne: true } },
        { $set: { isDemo: true } }
    );
    return res.modifiedCount ?? res.nModified ?? 0;
}

async function createStats(ctx, matchData, cards, seasons) {
    console.log('\n📊 FASE 6 — Statistiche stagionali e classifiche');

    if (DRY_RUN) {
        console.log('   [dry-run] creerebbe PlayerSeasonStats e PlayerLeaderboardStats');
        return;
    }

    const { team, users } = ctx;
    const { seasonTotals } = matchData;
    const cardByPlayer = new Map(cards.map(c => [c.player.id.toString(), c]));

    let seasonRows = 0;
    for (const seasonId of Object.keys(seasonTotals)) {
        for (const playerId of Object.keys(seasonTotals[seasonId])) {
            const t = seasonTotals[seasonId][playerId];
            const user = users.find(u => u.id.toString() === playerId);
            if (!user) continue;

            await PlayerSeasonStats.create({
                playerId: user.id,
                teamId: team._id,
                seasonId,
                playerName: user.name,
                matchesPlayed: t.matches,
                totalGoals: t.goals,
                totalAssists: t.assists,
                averageRating: round2(t.ratingSum / t.matches),
                mvpCount: t.mvp,
                presences: t.matches,
                isDemo: true,
            });
            seasonRows++;
        }
    }

    // ── Classifiche: NON le creiamo noi ─────────────────────────────────
    // PlayerLeaderboardStats viene popolata da sola dagli hook post-save di
    // VoteResult e PlayerCardResult, con la stessa logica che gira in
    // produzione. Ricrearla a mano darebbe duplicate key e, soprattutto,
    // numeri calcolati diversamente da quelli veri.
    //
    // ⚠️ Ma gli hook non sanno nulla della demo: scrivono senza `isDemo`.
    //    Senza questa marcatura quelle righe resterebbero orfane, invisibili
    //    alla pulizia del prossimo seed, e si accumulerebbero a ogni giro.
    const marked = await markDerivedDocsAsDemo(team._id);

    console.log(`   PlayerSeasonStats:      ${seasonRows} righe (create dal seed)`);
    console.log(`   PlayerLeaderboardStats: ${marked} righe (generate dagli hook, marcate demo)`);
}

// ═══════════════════════════════════════════════════════════════════════════
// FASE 7 — AWARDS E GOLDEN TOT
// ═══════════════════════════════════════════════════════════════════════════

async function createAwards(ctx, matchData, seasons) {
    console.log('\n🏆 FASE 7 — Award e bonus Golden TOT');

    if (DRY_RUN) {
        console.log('   [dry-run] creerebbe recap partita, MVP mensili, Pallone d\'Oro, Scarpa d\'Oro e Golden TOT');
        return;
    }

    const { team, users } = ctx;
    const { matches } = matchData;

    const ballon = users.find(u => u.name === BALLON_DOR_WINNER);
    const boot = users.find(u => u.name === GOLDEN_BOOT_WINNER);

    let created = 0;

    // ── Recap delle ultime 3 partite concluse ─────────────────────────────
    const completed = matches.filter(m => !m.isLast).slice(-3);
    for (const m of completed) {
        const result = await VoteResult.findOne({ votingSessionId: m.session._id }).lean();
        if (!result?.matchRatingResults) continue;

        const entries = Object.entries(result.matchRatingResults)
            .map(([id, r]) => ({ id, ...r }))
            .sort((a, b) => b.averageRating - a.averageRating)
            .slice(0, 3);

        const podium = entries.map((e, i) => {
            const u = users.find(x => x.id.toString() === e.id);
            return {
                position: i + 1,
                playerId: e.playerId,
                name: u ? u.name : 'Giocatore',
                avatar: null,
                avg: e.averageRating,
                votersCount: e.voteCount,
                mvpStreakCount: 0,
            };
        });

        await Award.create({
            teamId: team._id,
            type: 'MATCH_RECAP',
            refId: m.match._id.toString(),
            seasonId: m.seasonId,
            status: 'READY',
            generatedAt: m.date,
            finalizedAt: m.date,
            payload: {
                seasonId: m.seasonId,
                period: {
                    label: new Date(m.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }),
                    dateFrom: m.date,
                    dateTo: m.date,
                },
                podium,
                highlights: [],
                totalVoters: result.sessionMetadata?.totalVoters || 0,
                eligibleVoters: result.sessionMetadata?.totalVoters || 0,
            },
            isDemo: true,
        });
        created++;
    }

    // ── MVP del mese, ultimi 2 mesi ───────────────────────────────────────
    for (let back = 1; back <= 2; back++) {
        const d = new Date();
        d.setMonth(d.getMonth() - back);
        const refId = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const winner = back === 1 ? ballon : users.find(u => u.name === 'Lore');

        await Award.create({
            teamId: team._id,
            type: 'MONTHLY_MVP',
            refId,
            seasonId: seasons.currentSeasonId,
            status: 'READY',
            generatedAt: d,
            finalizedAt: d,
            payload: {
                seasonId: seasons.currentSeasonId,
                period: {
                    label: d.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }),
                    dateFrom: new Date(d.getFullYear(), d.getMonth(), 1),
                    dateTo: new Date(d.getFullYear(), d.getMonth() + 1, 0),
                },
                hero: {
                    playerId: winner.id,
                    name: winner.name,
                    avatar: null,
                    mainValue: round2(between(7.4, 8.6)).toFixed(1),
                    mainLabel: `MEDIA VOTO · ${d.toLocaleDateString('it-IT', { month: 'long' }).toUpperCase()}`,
                    stats: [
                        { value: String(intBetween(3, 5)), label: 'PARTITE' },
                        { value: String(intBetween(2, 7)), label: 'GOL' },
                        { value: String(intBetween(1, 4)), label: 'ASSIST' },
                        { value: String(intBetween(1, 3)), label: 'MVP' },
                    ],
                },
                highlights: [],
            },
            isDemo: true,
        });
        created++;
    }

    // ── Pallone d'Oro e Scarpa d'Oro della stagione conclusa ──────────────
    const seasonEnd = new Date(seasons.previous.seasonEnd);

    await Award.create({
        teamId: team._id,
        type: 'BALLON_DOR',
        refId: `season-${seasons.prevSeasonId}`,
        seasonId: seasons.prevSeasonId,
        status: 'READY',
        generatedAt: seasonEnd,
        finalizedAt: seasonEnd,
        payload: {
            seasonId: seasons.prevSeasonId,
            period: {
                label: `Stagione ${seasons.prevSeasonId.replace('-', '/')}`,
                dateFrom: seasons.previous.seasonStart,
                dateTo: seasons.previous.seasonEnd,
            },
            hero: {
                playerId: ballon.id,
                name: ballon.name,
                avatar: null,
                mainValue: '8.2',
                mainLabel: 'MEDIA VOTO STAGIONALE',
                stats: [
                    { value: '15', label: 'PARTITE' },
                    { value: '24', label: 'GOL' },
                    { value: '11', label: 'ASSIST' },
                    { value: '6', label: 'MVP' },
                ],
            },
            highlights: [],
        },
        isDemo: true,
    });
    created++;

    await Award.create({
        teamId: team._id,
        type: 'GOLDEN_BOOT',
        refId: `season-${seasons.prevSeasonId}`,
        seasonId: seasons.prevSeasonId,
        status: 'READY',
        generatedAt: seasonEnd,
        finalizedAt: seasonEnd,
        payload: {
            seasonId: seasons.prevSeasonId,
            period: {
                label: `Stagione ${seasons.prevSeasonId.replace('-', '/')}`,
                dateFrom: seasons.previous.seasonStart,
                dateTo: seasons.previous.seasonEnd,
            },
            hero: {
                playerId: boot.id,
                name: boot.name,
                avatar: null,
                mainValue: '27',
                mainLabel: 'GOL IN STAGIONE',
                stats: [
                    { value: '14', label: 'PARTITE' },
                    { value: '27', label: 'GOL' },
                    { value: '1.9', label: 'GOL/PARTITA' },
                    { value: '4', label: 'MVP' },
                ],
            },
            highlights: [],
        },
        isDemo: true,
    });
    created++;

    // ── Golden TOT: i bonus valgono nella stagione CORRENTE ───────────────
    // Il Pallone d'Oro della stagione N dà +3 al TOT nella stagione N+1,
    // la Scarpa d'Oro +2 su `fin`. È la regola di GOLDEN_TOT_RULES.
    const ballonAward = await Award.findOne({ teamId: team._id, type: 'BALLON_DOR', isDemo: true });
    const bootAward = await Award.findOne({ teamId: team._id, type: 'GOLDEN_BOOT', isDemo: true });

    await GoldenTot.create({
        teamId: team._id,
        seasonId: seasons.currentSeasonId,
        playerId: ballon.id,
        source: 'BALLON_DOR',
        field: 'playerCardTOT',
        delta: 3,
        awardId: ballonAward._id,
        sourceSeasonId: seasons.prevSeasonId,
        isActive: true,
        isDemo: true,
    });

    await GoldenTot.create({
        teamId: team._id,
        seasonId: seasons.currentSeasonId,
        playerId: boot.id,
        source: 'GOLDEN_BOOT',
        field: 'fin',
        delta: 2,
        awardId: bootAward._id,
        sourceSeasonId: seasons.prevSeasonId,
        isActive: true,
        isDemo: true,
    });

    console.log(`   Award creati: ${created}`);
    console.log(`   🏆 Pallone d'Oro ${seasons.prevSeasonId}: ${ballon.name} → +3 TOT in ${seasons.currentSeasonId}`);
    console.log(`   👟 Scarpa d'Oro  ${seasons.prevSeasonId}: ${boot.name} → +2 fin in ${seasons.currentSeasonId}`);
    console.log(`   ℹ️  Le PNG condivisibili non sono generate: si producono con la`);
    console.log(`      pipeline Puppeteer esistente (scripts/trigger-award.js).`);
    console.log(`      In app le card si vedono comunque, renderizzate lato client.`);
}

// ═══════════════════════════════════════════════════════════════════════════
// FASE 8 — NEWS
// ═══════════════════════════════════════════════════════════════════════════

async function createNews(ctx, matchData) {
    console.log('\n📰 FASE 8 — News per la home');

    if (DRY_RUN) {
        console.log('   [dry-run] creerebbe alcune news recenti');
        return;
    }

    const { team, users } = ctx;
    const johnny = users.find(u => u.name === BALLON_DOR_WINNER);
    const ricky = users.find(u => u.name === GOLDEN_BOOT_WINNER);
    const lore = users.find(u => u.name === 'Lore');
    const simo = users.find(u => u.name === 'Simo');

    const items = [
        { text: `${johnny.name} è il nuovo leader della classifica con una media di 8.2. Nessuno lo prende.`, category: 'leaderboard', type: 'new_leader', priority: 'high', icon: '👑', style: 'success' },
        { text: `Votazioni aperte per l'ultima partita! Vota i tuoi compagni prima che chiuda la sessione.`, category: 'match_creation', type: 'voting_open', priority: 'urgent', icon: '🗳️', style: 'warning' },
        { text: `${ricky.name} ha chiuso la scorsa stagione con 27 gol: Scarpa d'Oro meritata.`, category: 'milestones', type: 'season_record', priority: 'medium', icon: '👟', style: 'success' },
        { text: `${lore.name} sale a 4 assist nelle ultime tre partite. Il regista c'è.`, category: 'streaks', type: 'assist_streak', priority: 'medium', icon: '🎯', style: 'info' },
        { text: `${simo.name} imbattuto per due partite di fila. Saracinesca.`, category: 'streaks', type: 'clean_sheet', priority: 'medium', icon: '🧤', style: 'info' },
        { text: `${johnny.name} parte avvantaggiato: il Pallone d'Oro gli vale +3 al TOT per tutta la stagione.`, category: 'fun_facts', type: 'golden_tot', priority: 'high', icon: '🏆', style: 'success' },
    ];

    let i = 0;
    for (const n of items) {
        const createdAt = new Date();
        createdAt.setDate(createdAt.getDate() - i * 2);
        await News.create({ teamId: team._id, ...n, createdAt, isDemo: true });
        i++;
    }

    console.log(`   News create: ${items.length}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// FASE 9 — VERIFICA DI COERENZA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Controlla che ogni documento creato porti davvero `isDemo: true`.
 *
 * Serve perché la sicurezza delle cancellazioni si regge su quel flag: basta
 * un create distratto per lasciare un documento orfano, invisibile alle
 * pulizie e destinato ad accumularsi a ogni ri-seed. Meglio scoprirlo adesso.
 */
async function verifyConsistency(ctx) {
    console.log('\n🔍 FASE 9 — Verifica coerenza del flag isDemo');

    if (DRY_RUN) {
        console.log('   [dry-run] salta la verifica');
        return true;
    }

    const { team } = ctx;
    const checks = [
        [Match, 'Match', { teamId: String(team._id) }],
        [VotingSession, 'VotingSession', { teamId: team._id }],
        [Award, 'Award', { teamId: team._id }],
        [News, 'News', { teamId: team._id }],
        [GoldenTot, 'GoldenTot', { teamId: team._id }],
        [PlayerSeasonStats, 'PlayerSeasonStats', { teamId: team._id }],
        [PlayerLeaderboardStats, 'PlayerLeaderboardStats', { teamId: team._id }],
    ];

    let problems = 0;
    for (const [Model, label, filter] of checks) {
        const total = await Model.countDocuments(filter);
        const flagged = await Model.countDocuments({ ...filter, isDemo: true });
        const ok = total === flagged;
        if (!ok) problems++;
        console.log(`   ${ok ? '✓' : '✗'} ${label.padEnd(24)} ${flagged}/${total} con isDemo`);
    }

    // VoteSubmission e PlayerCardSubmission non hanno teamId: si contano
    // rispetto alle sessioni demo a cui appartengono.
    const demoSessionIds = await VotingSession.find({ isDemo: true }).distinct('_id');
    for (const [Model, label] of [[VoteSubmission, 'VoteSubmission'], [PlayerCardSubmission, 'PlayerCardSubmission']]) {
        const total = await Model.countDocuments({ votingSessionId: { $in: demoSessionIds } });
        const flagged = await Model.countDocuments({ votingSessionId: { $in: demoSessionIds }, isDemo: true });
        const ok = total === flagged;
        if (!ok) problems++;
        console.log(`   ${ok ? '✓' : '✗'} ${label.padEnd(24)} ${flagged}/${total} con isDemo`);
    }

    if (problems > 0) {
        console.log(`\n   ⚠️  ${problems} collection con documenti privi del flag.`);
        console.log(`      Non verranno rimossi dal prossimo seed: vanno corretti.`);
        return false;
    }

    console.log('   Tutti i documenti demo sono correttamente marcati.');
    return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
    console.log('═'.repeat(70));
    console.log('🎬  SEED MODALITÀ DEMO — Pagelle FC');
    console.log('═'.repeat(70));

    if (DRY_RUN) {
        console.log('\n🔒 MODALITÀ DRY-RUN — nessuna scrittura verrà eseguita.');
        console.log('   Per eseguire davvero:  node src/utils/seedDemoData.js --confirm\n');
    } else {
        console.log('\n⚠️  MODALITÀ REALE — il database verrà modificato.\n');
    }

    const dbLabel = await connectDB();

    if (!DRY_RUN && dbLabel === 'PROD') {
        console.log('\n⚠️  Stai per scrivere sul database di PRODUZIONE.');
        console.log('   Assicurati di aver fatto un backup:  npm run db:backup\n');
    }

    const seasons = await verifySeasons();
    await cleanup();

    const ctx = await createTeamAndPlayers(seasons);
    if (DRY_RUN) {
        console.log('\n' + '═'.repeat(70));
        console.log('✅ Dry-run completato. Nessun dato modificato.');
        console.log('═'.repeat(70));
        return;
    }

    const matchData = await createMatchesAndVotes(ctx, seasons);
    const cards = await createPlayerCards(ctx);
    await createStats(ctx, matchData, cards, seasons);
    await createAwards(ctx, matchData, seasons);
    await createNews(ctx, matchData);
    const consistent = await verifyConsistency(ctx);

    console.log('\n' + '═'.repeat(70));
    console.log('✅ SEED COMPLETATO');
    console.log('═'.repeat(70));
    console.log(`   Team:     ${ctx.team.name}`);
    console.log(`   Team ID:  ${ctx.team._id}`);
    console.log(`   Capitano: ${ctx.captain.name} (${ctx.captain.id})`);
    console.log('');
    console.log('   Prova l\'accesso demo:');
    console.log('     curl -X POST http://localhost:5000/api/v1/auth/demo-login');
    console.log('');
    if (!consistent) {
        console.log('   ⚠️  Verifica di coerenza FALLITA — vedi sopra.');
    }
}

// Eseguito da riga di comando → parte.
// Importato da un test → si limita a esporre le funzioni, senza connettersi.
if (require.main === module) main()
    .then(() => mongoose.disconnect())
    .then(() => process.exit(0))
    .catch(async (err) => {
        console.error('\n❌ ERRORE:', err.message);
        if (process.env.NODE_ENV === 'development') console.error(err.stack);
        await mongoose.disconnect().catch(() => { });
        process.exit(1);
    });

// Esportate per i test: funzioni pure, verificabili senza database.
module.exports = {
    PLAYERS,
    TEAM_NAME,
    CAPTAIN_NAME,
    BALLON_DOR_WINNER,
    GOLDEN_BOOT_WINNER,
    makeRandom,
    generateRating,
    generateAttributes,
    gradeFor,
    buildMatchDates,
    safeDelete,
};
