#!/usr/bin/env node

/**
 * 🔍 SCRIPT DI VERIFICA CONSISTENZA PLAYERCARD
 * 
 * Controlla e ripara eventuali inconsistenze tra:
 * - PlayerCardResult.finalOverallRating
 * - PlayerLeaderboardStats.playerCardTOT
 * 
 * UTILIZZO:
 * - Solo verifica: node scripts/check-playercard-consistency.js
 * - Verifica e ripara: node scripts/check-playercard-consistency.js --fix
 * - Con dettaglio: node scripts/check-playercard-consistency.js --verbose
 */

const path = require('path');

// Configura dotenv per leggere il .env della cartella server
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');

// Assicurati che i path siano corretti indipendentemente da dove viene eseguito lo script
const PlayerCardResult = require(path.join(__dirname, '../src/models/PlayerCardResult'));
const PlayerLeaderboardStats = require(path.join(__dirname, '../src/models/PlayerLeaderboardStats'));

// Parametri da linea di comando
const args = process.argv.slice(2);
const shouldFix = args.includes('--fix');
const verbose = args.includes('--verbose');

// Colori console
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

// Helper per log colorato
const log = {
    info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
    success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
    warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
    title: (msg) => console.log(`\n${colors.bold}${colors.cyan}🔍 ${msg}${colors.reset}\n`)
};

async function connectDatabase() {
    try {
        const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
        if (!mongoUri) {
            throw new Error('MONGODB_URI not found in environment variables');
        }

        await mongoose.connect(mongoUri);
        log.success('Connesso al database');
    } catch (error) {
        log.error(`Errore connessione database: ${error.message}`);
        process.exit(1);
    }
}

async function checkPlayerCardConsistency() {
    log.title('VERIFICA CONSISTENZA PLAYERCARD');

    const stats = {
        totalPlayersWithCards: 0,
        consistent: 0,
        inconsistent: 0,
        missingInLeaderboard: 0,
        fixed: 0,
        errors: 0
    };

    const inconsistencies = [];

    try {
        // 1. Ottieni tutti i PlayerCardResult con l'ultima valutazione per giocatore
        log.info('📊 Analisi PlayerCardResults...');

        const latestPlayerCards = await PlayerCardResult.aggregate([
            {
                $sort: { targetPlayerId: 1, createdAt: -1 }
            },
            {
                $group: {
                    _id: '$targetPlayerId',
                    latestCard: { $first: '$$ROOT' }
                }
            }
        ]);

        log.info(`🎯 Trovati ${latestPlayerCards.length} giocatori con PlayerCard`);
        stats.totalPlayersWithCards = latestPlayerCards.length;

        // 2. Verifica consistenza per ogni giocatore
        for (const { _id: playerId, latestCard } of latestPlayerCards) {
            try {
                const leaderboardStats = await PlayerLeaderboardStats.findOne({ playerId });

                if (!leaderboardStats) {
                    // Caso: PlayerCard esiste ma non ha record in leaderboard
                    inconsistencies.push({
                        playerId,
                        type: 'missing_leaderboard',
                        expected: latestCard.finalOverallRating,
                        actual: null,
                        cardId: latestCard._id
                    });
                    stats.missingInLeaderboard++;

                    if (verbose) {
                        log.warning(`🔍 Giocatore ${playerId}: PlayerCard=${latestCard.finalOverallRating}, Leaderboard=MISSING`);
                    }

                } else if (leaderboardStats.playerCardTOT !== latestCard.finalOverallRating) {
                    // Caso: Valori diversi
                    inconsistencies.push({
                        playerId,
                        playerName: leaderboardStats.playerName,
                        type: 'value_mismatch',
                        expected: latestCard.finalOverallRating,
                        actual: leaderboardStats.playerCardTOT,
                        cardId: latestCard._id,
                        leaderboardId: leaderboardStats._id
                    });
                    stats.inconsistent++;

                    if (verbose) {
                        log.warning(`🔍 ${leaderboardStats.playerName}: PlayerCard=${latestCard.finalOverallRating}, Leaderboard=${leaderboardStats.playerCardTOT}`);
                    }

                } else {
                    // Caso: Tutto ok
                    stats.consistent++;

                    if (verbose) {
                        log.success(`🔍 ${leaderboardStats.playerName}: Consistente (${latestCard.finalOverallRating})`);
                    }
                }

            } catch (error) {
                log.error(`Errore controllando giocatore ${playerId}: ${error.message}`);
                stats.errors++;
            }
        }

        // 3. Mostra risultati
        log.title('RISULTATI VERIFICA');

        console.log(`📊 ${colors.bold}Statistiche:${colors.reset}`);
        console.log(`  • Giocatori totali con PlayerCard: ${stats.totalPlayersWithCards}`);
        console.log(`  • ${colors.green}Consistenti: ${stats.consistent}${colors.reset}`);
        console.log(`  • ${colors.yellow}Inconsistenti: ${stats.inconsistent}${colors.reset}`);
        console.log(`  • ${colors.red}Mancanti in Leaderboard: ${stats.missingInLeaderboard}${colors.reset}`);

        if (stats.errors > 0) {
            console.log(`  • ${colors.red}Errori: ${stats.errors}${colors.reset}`);
        }

        // 4. Dettaglio inconsistenze
        if (inconsistencies.length > 0) {
            log.warning(`\n🔧 Trovate ${inconsistencies.length} inconsistenze:`);

            inconsistencies.forEach((inc, index) => {
                const playerInfo = inc.playerName ? `${inc.playerName} (${inc.playerId})` : inc.playerId;
                if (inc.type === 'missing_leaderboard') {
                    console.log(`  ${index + 1}. ${playerInfo}: Mancante in leaderboard (dovrebbe essere ${inc.expected})`);
                } else {
                    console.log(`  ${index + 1}. ${playerInfo}: ${inc.actual} → ${inc.expected}`);
                }
            });

            // 5. Riparazione se richiesta
            if (shouldFix) {
                log.title('RIPARAZIONE AUTOMATICA');

                for (const inc of inconsistencies) {
                    try {
                        await PlayerLeaderboardStats.updateOne(
                            { playerId: inc.playerId },
                            {
                                $set: {
                                    playerCardTOT: inc.expected,
                                    lastUpdatedAt: new Date()
                                }
                            },
                            { upsert: true }
                        );

                        stats.fixed++;
                        const playerInfo = inc.playerName ? inc.playerName : inc.playerId;
                        log.success(`Riparato ${playerInfo}: ${inc.actual || 'MISSING'} → ${inc.expected}`);

                    } catch (error) {
                        log.error(`Errore riparando ${inc.playerId}: ${error.message}`);
                        stats.errors++;
                    }
                }

                log.success(`\n🎉 Riparazione completata: ${stats.fixed} record aggiornati`);
            } else {
                log.info('\n💡 Per riparare automaticamente, riesegui con: --fix');
            }

        } else {
            log.success('\n🎉 Tutti i dati sono consistenti!');
        }

        return { stats, inconsistencies };

    } catch (error) {
        log.error(`Errore durante la verifica: ${error.message}`);
        throw error;
    }
}

async function main() {
    console.log(`${colors.bold}${colors.cyan}🔍 PLAYERCARD CONSISTENCY CHECKER${colors.reset}\n`);

    if (shouldFix) {
        log.info('🔧 Modalità: Verifica e riparazione');
    } else {
        log.info('👁️ Modalità: Solo verifica');
    }

    if (verbose) {
        log.info('📝 Modalità verbose attiva');
    }

    try {
        await connectDatabase();
        const result = await checkPlayerCardConsistency();

        // Exit code basato sui risultati
        if (result.stats.errors > 0) {
            process.exit(1); // Errori durante l'esecuzione
        } else if (result.inconsistencies.length > 0 && !shouldFix) {
            process.exit(2); // Inconsistenze trovate ma non riparate
        } else {
            process.exit(0); // Tutto ok o riparato
        }

    } catch (error) {
        log.error(`Script fallito: ${error.message}`);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
}

// Gestione segnali
process.on('SIGINT', async () => {
    log.warning('\nScript interrotto dall\'utente');
    await mongoose.disconnect();
    process.exit(130);
});

process.on('unhandledRejection', async (error) => {
    log.error(`Errore non gestito: ${error.message}`);
    await mongoose.disconnect();
    process.exit(1);
});

// Avvia lo script
main();