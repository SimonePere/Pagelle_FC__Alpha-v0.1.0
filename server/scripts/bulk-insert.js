require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Import dei modelli
const Match = require('../src/models/Match');
const VotingSession = require('../src/models/VotingSession');
const VoteResult = require('../src/models/VoteResult');
const User = require('../src/models/User');
const Team = require('../src/models/Team'); // AGGIUNTO: Fix per hook post-save
const PlayerLeaderboardStats = require('../src/models/PlayerLeaderboardStats');

const BULK_DATA_FILE = './bulk-data.json';

async function connectDB() {
    try {
        // Usa la stessa logica del backend per selezione database
        const nodeEnv = process.env.NODE_ENV?.trim();
        const mongoUri = nodeEnv === 'test'
            ? process.env.MONGODB_URI_TEST
            : process.env.MONGODB_URI;

        console.log(`🔍 NODE_ENV: "${nodeEnv}"`);
        console.log(`🔗 Selected URI contains: ${mongoUri?.includes('test') ? 'TEST' : 'PROD'} database`);

        await mongoose.connect(mongoUri);
        console.log('✅ MongoDB Connesso');
    } catch (error) {
        console.error('❌ Errore connessione MongoDB:', error);
        process.exit(1);
    }
}

async function loadBulkData() {
    try {
        const rawData = fs.readFileSync(BULK_DATA_FILE, 'utf8');
        return JSON.parse(rawData);
    } catch (error) {
        console.error('❌ Errore lettura bulk-data.json:', error);
        process.exit(1);
    }
}

async function createMatchesAndResults() {
    console.log('🚀 === INIZIO INSERIMENTO BULK DATA ===\n');

    const bulkData = await loadBulkData();
    const { teamId, players, matches } = bulkData;

    console.log(`📊 Team ID: ${teamId}`);
    console.log(`👥 Giocatori: ${Object.keys(players).length}`);
    console.log(`⚽ Partite da inserire: ${matches.length}\n`);

    // Verifica che tutti gli utenti esistano
    const playerIds = Object.values(players);
    console.log('🔍 PlayerIds da cercare:', playerIds);

    // Test: controlla se ci sono utenti nel database
    const totalUsers = await User.countDocuments({});
    console.log(`📊 Totale utenti nel database: ${totalUsers}`);

    if (totalUsers === 0) {
        console.error('❌ Il database non contiene nessun utente!');
        console.log('💡 Verifica la connessione al database corretto');
        return;
    }

    // Mostra tutti gli utenti nel database per debug
    const allUsers = await User.find({}).select('_id name email');
    console.log('👥 Tutti gli utenti nel database:');
    allUsers.forEach(user => {
        console.log(`   - ${user.name} (${user._id})`);
    });

    const existingUsers = await User.find({ _id: { $in: playerIds } });
    console.log('✅ Giocatori trovati:', existingUsers.map(u => ({ id: u._id, name: u.name })));

    if (existingUsers.length !== playerIds.length) {
        console.error('❌ Non tutti i giocatori sono stati trovati nel database!');
        console.log(`📊 Richiesti: ${playerIds.length}, Trovati: ${existingUsers.length}`);

        // Mostra quali ID non sono stati trovati
        const foundIds = existingUsers.map(u => u._id.toString());
        const missingIds = playerIds.filter(id => !foundIds.includes(id));
        console.log('❌ ID mancanti:', missingIds);

        return;
    }

    console.log('✅ Tutti i giocatori trovati nel database\n');

    let createdMatches = 0;
    let createdVoteResults = 0;

    for (const matchData of matches) {
        const { date, matchNumber, playerData } = matchData;

        console.log(`\n⚽ === ELABORANDO PARTITA ${matchNumber} (${date}) ===`);

        try {
            // 1. CREA IL MATCH
            const match = await Match.create({
                createdBy: players.SIMONE, // Six è l'admin
                teamId: teamId,
                field: `Campo Partita ${matchNumber}`,
                playersCount: 8,
                date: new Date(date),
                notes: `Partita inserita da bulk import - ${date}`,
                teamMemberIds: playerIds,
                status: 'completed'
            });

            console.log(`✅ Match creato: ${match._id}`);
            createdMatches++;

            // 2. CREA VOTING SESSION (completata)
            const votingSession = await VotingSession.create({
                type: 'match_rating',
                targetId: match._id,
                teamId: teamId,
                createdBy: players.SIMONE,
                title: `Partita ${matchNumber} - ${date}`,
                description: `Partita importata da bulk data`,
                status: 'completed',
                completedAt: new Date(),
                eligibleVoters: playerIds
            });

            console.log(`✅ VotingSession creata: ${votingSession._id}`);

            // 3. PREPARA RISULTATI PER VOTERESULT
            const matchRatingResults = new Map();
            let totalVoters = 0;
            let totalGoals = 0;
            let totalAssists = 0;

            Object.entries(playerData).forEach(([playerName, data]) => {
                const playerId = players[playerName];

                // Salta giocatori infortunati (voto = 0)
                if (data.voto === 0) {
                    console.log(`⚠️ ${playerName} infortunato - saltato`);
                    return;
                }

                matchRatingResults.set(playerId, {
                    playerId: playerId,
                    averageRating: data.voto,
                    medianRating: data.voto,
                    goals: data.gol,
                    assists: data.assist,
                    voteCount: 4, // Supponiamo che tutti e 4 abbiano votato
                    badges: data.gol >= 3 ? ['goleador'] : [],
                    grade: calculateGrade(data.voto),
                    standardDeviation: 0,
                    confidence: 1
                });

                totalVoters = 4;
                totalGoals += data.gol;
                totalAssists += data.assist;
            });

            // 4. CREA VOTE RESULT
            const voteResult = new VoteResult({
                votingSessionId: votingSession._id,
                matchRatingResults: matchRatingResults,

                sessionMetadata: {
                    totalVoters: totalVoters,
                    sessionType: 'match_rating',
                    calculatedAt: new Date(),
                    playersCount: matchRatingResults.size,
                    completionRate: 100
                },

                statistics: {
                    voteCount: totalVoters,
                    overallAverageRating: calculateOverallAverage(matchRatingResults),
                    totalGoalsReported: totalGoals,
                    totalAssistsReported: totalAssists,

                    ratingDistribution: calculateRatingDistribution(matchRatingResults),
                    badgesSummary: calculateBadgesSummary(matchRatingResults)
                },

                calculationMethod: 'average'
            });

            await voteResult.save();
            console.log(`✅ VoteResult creato - LeaderboardStats si aggiornano automaticamente`);
            createdVoteResults++;

        } catch (error) {
            console.error(`❌ Errore elaborando partita ${matchNumber}:`, error.message);
        }
    }

    console.log(`\n🎉 === INSERIMENTO COMPLETATO ===`);
    console.log(`⚽ Matches creati: ${createdMatches}`);
    console.log(`📊 VoteResults creati: ${createdVoteResults}`);
    console.log(`📈 Le classifiche sono state aggiornate automaticamente!\n`);
}

function calculateGrade(rating) {
    if (rating >= 9) return 'A+';
    if (rating >= 8) return 'A';
    if (rating >= 7) return 'B+';
    if (rating >= 6.5) return 'B';
    if (rating >= 6) return 'C+';
    if (rating >= 5.5) return 'C';
    if (rating >= 5) return 'D';
    return 'F';
}

function calculateOverallAverage(matchRatingResults) {
    let totalRating = 0;
    let count = 0;

    for (const [playerId, data] of matchRatingResults.entries()) {
        totalRating += data.averageRating;
        count++;
    }

    return count > 0 ? Math.round((totalRating / count) * 10) / 10 : 0;
}

function calculateRatingDistribution(matchRatingResults) {
    const distribution = {
        '9-10': 0, '8-9': 0, '7-8': 0,
        '6-7': 0, '5-6': 0, 'below-5': 0
    };

    for (const [playerId, data] of matchRatingResults.entries()) {
        const rating = data.averageRating;
        if (rating >= 9) distribution['9-10']++;
        else if (rating >= 8) distribution['8-9']++;
        else if (rating >= 7) distribution['7-8']++;
        else if (rating >= 6) distribution['6-7']++;
        else if (rating >= 5) distribution['5-6']++;
        else distribution['below-5']++;
    }

    return distribution;
}

function calculateBadgesSummary(matchRatingResults) {
    const summary = {
        mvp: 0, goleador: 0, assist_man: 0,
        difensore: 0, maratoneta: 0, gol_bello: 0
    };

    for (const [playerId, data] of matchRatingResults.entries()) {
        (data.badges || []).forEach(badge => {
            if (summary[badge] !== undefined) {
                summary[badge]++;
            }
        });
    }

    return summary;
}

async function verifyResults() {
    console.log('\n🔍 === VERIFICA RISULTATI ===');

    try {
        const matchCount = await Match.countDocuments({});
        const voteResultCount = await VoteResult.countDocuments({});
        const leaderboardCount = await PlayerLeaderboardStats.countDocuments({});

        console.log(`⚽ Matches totali nel DB: ${matchCount}`);
        console.log(`📊 VoteResults totali nel DB: ${voteResultCount}`);
        console.log(`📈 PlayerLeaderboardStats nel DB: ${leaderboardCount}`);

        // Mostra le prime 3 posizioni in classifica
        const topPlayers = await PlayerLeaderboardStats
            .find({})
            .sort({ averageRating: -1 })
            .limit(3)
            .select('playerName averageRating totalMatches totalGoals totalAssists');

        console.log('\n🏆 TOP 3 CLASSIFICA RATING:');
        topPlayers.forEach((player, idx) => {
            console.log(`${idx + 1}. ${player.playerName} - Rating: ${player.averageRating} (${player.totalMatches} partite, ${player.totalGoals} gol, ${player.totalAssists} assist)`);
        });

    } catch (error) {
        console.error('❌ Errore verifica risultati:', error);
    }
}

async function main() {
    try {
        await connectDB();
        await createMatchesAndResults();
        await verifyResults();

        console.log('\n✅ Script completato con successo!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Errore generale:', error);
        process.exit(1);
    }
}

// Esegui solo se chiamato direttamente
if (require.main === module) {
    main();
}