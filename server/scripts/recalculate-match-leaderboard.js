#!/usr/bin/env node

/**
 * 🔄 SCRIPT RICALCOLO LEADERBOARD MATCH 
 * 
 * Ricalcola completamente tutte le statistiche leaderboard basandosi sui VoteResult esistenti.
 * Utile dopo eliminazione di partite o per correggere incongruenze nei dati.
 * 
 * COSA FA:
 * - Pulisce tutte le statistiche match esistenti
 * - Ricalcola da zero basandosi sui VoteResult
 * - Aggiorna: partite, gol, assist, media rating, form recente
 * - Mantiene le statistiche PlayerCard intatte
 * 
 * USO:
 * node recalculate-match-leaderboard.js [dev|test|prod]
 * 
 * ESEMPI:
 * node recalculate-match-leaderboard.js dev    # Database development
 * node recalculate-match-leaderboard.js test   # Database test  
 * node recalculate-match-leaderboard.js prod   # Database production
 * node recalculate-match-leaderboard.js        # Default: development
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Import modelli
const PlayerLeaderboardStats = require(path.join(__dirname, '..', 'src', 'models', 'PlayerLeaderboardStats'));
const VoteResult = require(path.join(__dirname, '..', 'src', 'models', 'VoteResult'));
const VotingSession = require(path.join(__dirname, '..', 'src', 'models', 'VotingSession'));
const User = require(path.join(__dirname, '..', 'src', 'models', 'User'));
const Team = require(path.join(__dirname, '..', 'src', 'models', 'Team'));

/**
 * Determina l'URI del database basato sull'environment
 */
function getDatabaseUri(environment) {
    switch (environment) {
        case 'prod':
        case 'production':
            return process.env.MONGODB_URI; // Produzione
        case 'test':
            return process.env.MONGODB_URI_TEST || process.env.MONGODB_URI?.replace(/pagelle-fc/, 'pagelle-fc-test');
        case 'dev':
        case 'development':
        default:
            return process.env.MONGODB_URI_DEV || process.env.MONGODB_URI?.replace(/pagelle-fc/, 'pagelle-fc-dev') || 'mongodb://localhost:27017/pagelle-fc-dev';
    }
}

/**
 * Ottieni nome database user-friendly
 */
function getDatabaseName(environment) {
    switch (environment) {
        case 'prod':
        case 'production':
            return 'PRODUCTION';
        case 'test':
            return 'TEST';
        case 'dev':
        case 'development':
        default:
            return 'DEVELOPMENT';
    }
}

async function recalculateMatchLeaderboard(environment = 'dev') {
    try {
        const dbName = getDatabaseName(environment);
        const mongoUri = getDatabaseUri(environment);

        console.log('\n🔄 === RICALCOLO COMPLETO LEADERBOARD MATCH ===');
        console.log(`🎯 ENVIRONMENT: ${dbName}`);
        console.log(`🗄️ DATABASE: ${mongoUri.replace(/\/\/.*@/, '//***@')}\n`);

        // Conferma sicurezza per PRODUCTION
        if (environment === 'prod' || environment === 'production') {
            console.log('⚠️  ATTENZIONE: Stai per modificare il database di PRODUZIONE!');
            console.log('⚠️  Questa operazione ricalcolerà tutte le statistiche leaderboard.');
            console.log('⚠️  Premi Ctrl+C entro 10 secondi per annullare...\n');

            // Countdown di sicurezza
            for (let i = 10; i > 0; i--) {
                process.stdout.write(`\r⏳ Inizio tra ${i} secondi...`);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            console.log('\n🚀 Procedendo con il ricalcolo...\n');
        }

        // Connetti al database
        await mongoose.connect(mongoUri);
        console.log(`✅ Connesso al database ${dbName}\n`);

        // 1. Trova tutti i VoteResult esistenti (sono la fonte di verità)
        console.log('📋 Raccogliendo dati dai VoteResult esistenti...');

        const voteResults = await VoteResult.find({
            'sessionMetadata.sessionType': 'match_rating'
        }).populate({
            path: 'votingSessionId',
            populate: {
                path: 'teamId',
                select: 'name _id'
            }
        });

        // Filtra solo VoteResult con team validi
        const validVoteResults = voteResults.filter(vr => {
            const hasValidTeam = vr.votingSessionId?.teamId?._id;
            if (!hasValidTeam) {
                console.log(`⚠️  Saltando VoteResult ${vr._id} - dati team/session mancanti`);
            }
            return hasValidTeam;
        });

        console.log(`📊 ${validVoteResults.length}/${voteResults.length} VoteResult validi da processare`);

        if (validVoteResults.length === 0) {
            console.log('❌ Nessun VoteResult valido trovato. Nulla da ricalcolare.');
            await mongoose.disconnect();
            return;
        }

        // 2. Raccoglie tutti gli ID giocatori coinvolti
        const allPlayerIds = new Set();
        const playerStatsMap = new Map(); // playerId -> { teamId, playerName, matches: [matchData] }

        for (const voteResult of validVoteResults) {

            const teamId = voteResult.votingSessionId.teamId._id;

            // Processa ogni giocatore nel risultato
            if (voteResult.matchRatingResults && voteResult.matchRatingResults.size > 0) {
                for (const [playerId, playerData] of voteResult.matchRatingResults.entries()) {
                    allPlayerIds.add(playerId);

                    if (!playerStatsMap.has(playerId)) {
                        playerStatsMap.set(playerId, {
                            teamId: teamId,
                            playerName: '', // Sarà riempito dopo
                            matches: []
                        });
                    }

                    // Aggiunge questo match alle statistiche del giocatore
                    playerStatsMap.get(playerId).matches.push({
                        rating: playerData.averageRating || 0,
                        goals: playerData.goals || 0,
                        assists: playerData.assists || 0,
                        badges: playerData.badges || [],
                        matchDate: voteResult.sessionMetadata.calculatedAt || new Date()
                    });
                }
            }
        }

        console.log(`👥 Trovati ${allPlayerIds.size} giocatori unici da aggiornare`);

        // 3. Recupera i nomi dei giocatori
        console.log('\n👤 Recuperando nomi giocatori...');
        const playerIdsArray = Array.from(allPlayerIds);
        const players = await User.find({ _id: { $in: playerIdsArray } }).select('_id name');
        const playerNamesMap = new Map(players.map(p => [p._id.toString(), p.name]));

        // Aggiorna i nomi nella mappa
        for (const [playerId, stats] of playerStatsMap) {
            stats.playerName = playerNamesMap.get(playerId) || 'Nome Sconosciuto';
        }

        // 4. Pulisci le statistiche match esistenti (ma mantieni PlayerCard)
        console.log('\n🧹 Pulizia statistiche match esistenti...');

        const updateResult = await PlayerLeaderboardStats.updateMany(
            { playerId: { $in: playerIdsArray } },
            {
                $set: {
                    // Reset statistiche MATCH
                    totalMatches: 0,
                    totalGoals: 0,
                    totalAssists: 0,
                    totalRatingPoints: 0,
                    averageRating: 0,
                    recentForm: [],

                    // Reset achievements legati ai match
                    'achievements.totalBadges': 0,

                    // Aggiorna timestamp
                    lastUpdatedAt: new Date()
                },
                $inc: {
                    dataVersion: 1
                }
                // NON toccare: playerCardTOT, totalPlayerCardEvaluations (mantieni PlayerCard stats)
            }
        );

        console.log(`✅ Pulite statistiche match per ${updateResult.modifiedCount} giocatori`);

        // 5. Ricalcola le statistiche per ogni giocatore
        console.log('\n📊 Ricalcolando statistiche per ogni giocatore...');

        let processedCount = 0;
        for (const [playerId, playerStats] of playerStatsMap) {
            const { teamId, playerName, matches } = playerStats;

            // Calcola statistiche aggregate
            const totalMatches = matches.length;
            const totalGoals = matches.reduce((sum, match) => sum + match.goals, 0);
            const totalAssists = matches.reduce((sum, match) => sum + match.assists, 0);
            const totalRatingPoints = matches.reduce((sum, match) => sum + match.rating, 0);
            const averageRating = totalMatches > 0 ? Number((totalRatingPoints / totalMatches).toFixed(2)) : 0;

            // Recent form (ultimi 5 match, ordinati per data)
            const recentMatches = matches
                .sort((a, b) => new Date(b.matchDate) - new Date(a.matchDate))
                .slice(0, 5)
                .map(match => match.rating);

            // Total badges
            const totalBadges = matches.reduce((sum, match) => sum + (match.badges?.length || 0), 0);

            // Trova o crea il documento PlayerLeaderboardStats
            const stats = await PlayerLeaderboardStats.findOneAndUpdate(
                { playerId: playerId, teamId: teamId },
                {
                    $set: {
                        playerName: playerName,
                        totalMatches: totalMatches,
                        totalGoals: totalGoals,
                        totalAssists: totalAssists,
                        totalRatingPoints: totalRatingPoints,
                        averageRating: averageRating,
                        recentForm: recentMatches,
                        'achievements.totalBadges': totalBadges,
                        lastUpdatedAt: new Date()
                    },
                    $inc: { dataVersion: 1 }
                },
                {
                    new: true,
                    upsert: true,
                    runValidators: true
                }
            );

            processedCount++;
            console.log(`✅ ${processedCount}/${playerStatsMap.size} - ${playerName}: ${totalMatches} partite, ${totalGoals} gol, ${totalAssists} assist, media ${averageRating}`);
        }

        // 6. Statistiche finali
        console.log('\n📈 === RIEPILOGO FINALE ===');
        console.log(`✅ Processati: ${processedCount} giocatori`);
        console.log(`📊 VoteResult analizzati: ${validVoteResults.length}/${voteResults.length}`);

        // Mostra top 5 per verifica
        console.log('\n🏆 TOP 5 GIOCATORI (per verifica):');
        const topPlayers = await PlayerLeaderboardStats.find({ totalMatches: { $gt: 0 } })
            .sort({ averageRating: -1 })
            .limit(5)
            .select('playerName totalMatches totalGoals totalAssists averageRating');

        topPlayers.forEach((player, index) => {
            console.log(`${index + 1}. ${player.playerName}: ${player.totalMatches} partite, ${player.totalGoals} gol, ${player.totalAssists} assist, media ${player.averageRating}`);
        });

        console.log('\n✅ === RICALCOLO COMPLETATO ===');

        await mongoose.disconnect();
        console.log(`\n👋 Disconnesso dal database ${dbName}`);

    } catch (error) {
        console.error('\n❌ ERRORE durante il ricalcolo:', error.message);
        console.error(error.stack);

        try {
            await mongoose.disconnect();
        } catch (disconnectError) {
            console.error('❌ Errore disconnessione database:', disconnectError.message);
        }

        process.exit(1);
    }
}

// Parsing argomenti linea di comando
function parseArguments() {
    const args = process.argv.slice(2);
    const environment = args[0] || 'dev';

    // Valida environment
    const validEnvironments = ['dev', 'development', 'test', 'prod', 'production'];
    if (!validEnvironments.includes(environment.toLowerCase())) {
        console.error('❌ Environment non valido. Usa: dev, test, o prod');
        console.log('\nEsempi:');
        console.log('  node recalculate-match-leaderboard.js dev    # Database development');
        console.log('  node recalculate-match-leaderboard.js test   # Database test');
        console.log('  node recalculate-match-leaderboard.js prod   # Database production');
        process.exit(1);
    }

    return environment.toLowerCase();
}

// Esegui se lo script viene chiamato direttamente
if (require.main === module) {
    const environment = parseArguments();

    recalculateMatchLeaderboard(environment).catch(error => {
        console.error('❌ Errore fatale:', error.message);
        process.exit(1);
    });
}

module.exports = { recalculateMatchLeaderboard };