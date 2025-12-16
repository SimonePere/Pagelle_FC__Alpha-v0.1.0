/**
 * ===============================================
 * SCRIPT DI ANALISI SUBMISSIONS PLAYER CARDS
 * ===============================================
 * 
 * SCOPO:
 * Analizza in dettaglio le submissions di voto per un giocatore specifico,
 * mostra calcoli delle medie e verifica la correttezza dei risultati.
 * 
 * QUANDO USARE:
 * - Per debuggare calcoli di stelle che sembrano incorretti
 * - Per verificare i voti ricevuti da un giocatore specifico
 * - Per controllare che le medie siano calcolate correttamente
 * - Per investigare problemi con i risultati di PlayerCard
 * 
 * COSA FA:
 * 1. Mostra tutti i PlayerCardResult esistenti con i loro ID
 * 2. Mostra esempi di submissions per avere il context generale
 * 3. Filtra le submissions per il giocatore target specificato
 * 4. Calcola manualmente la media delle stelle ricevute
 * 5. Mostra il calcolo step-by-step per verifica
 * 
 * USO:
 * cd server
 * 
 * # Per analizzare un giocatore specifico (modifica l'ID nel codice):
 * node debug-utils/check-player-submissions.js
 * 
 * # Per vedere tutti i giocatori disponibili:
 * node debug-utils/check-player-submissions.js --list
 * 
 * OUTPUT ATTESO:
 * - Lista di tutti i PlayerCardResult con ID e stelle
 * - Esempi di submissions nel database  
 * - Dettaglio voti ricevuti dal giocatore target
 * - Calcolo manuale della media step-by-step
 * - Risultato finale arrotondato
 * 
 * PERSONALIZZAZIONE:
 * Modifica la variabile TARGET_PLAYER_ID per analizzare un giocatore diverso.
 * 
 * TROUBLESHOOTING:
 * - Se non trova submissions, verifica che l'ID sia corretto
 * - Se i calcoli non tornano, controlla che additionalAttributes esista
 * - Se l'output è vuoto, verifica la connessione al database corretto
 */

// Carica le variabili d'ambiente (stesso percorso del server)
require('dotenv').config();

const mongoose = require('mongoose');
const PlayerCardSubmission = require('../src/models/PlayerCardSubmission');
const PlayerCardResult = require('../src/models/PlayerCardResult');

// ⚠️ MODIFICA QUI L'ID DEL GIOCATORE DA ANALIZZARE
const TARGET_PLAYER_ID = '693550234608b6bba35e9bc9'; // Default: Six

// Connessione MongoDB
const connectDB = async () => {
    try {
        // Usa la stessa URI del server principale
        const mongoUri = process.env.MONGODB_URI || process.env.MONGODB_URI_PROD;
        await mongoose.connect(mongoUri);
        console.log('✅ Connesso a MongoDB PROD\n');
    } catch (err) {
        console.error('❌ Errore connessione MongoDB:', err);
        process.exit(1);
    }
};

// Funzione per mostrare tutti i giocatori disponibili
const listAllPlayers = async () => {
    console.log('🎯 TUTTI I PLAYERCARDRESULT DISPONIBILI:');
    console.log('=========================================');

    const results = await PlayerCardResult.find({});

    if (results.length === 0) {
        console.log('❌ Nessun PlayerCardResult trovato nel database');
        return;
    }

    results.forEach((result, i) => {
        console.log(`${i + 1}. Player ID: ${result.targetPlayerId}`);
        console.log(`   Session: ${result.votingSessionId || 'undefined'}`);

        if (result.finalAdditionalAttributes) {
            const stars = result.finalAdditionalAttributes;
            console.log(`   Stelle attuali: piede=${stars.piedeDebole || '?'}, skill=${stars.skill || '?'}`);
        } else {
            console.log(`   Stelle attuali: ❌ NON PRESENTI`);
        }
        console.log('');
    });
};

// Funzione per mostrare esempi di submissions
const showSampleSubmissions = async () => {
    console.log('📝 ESEMPI DI SUBMISSIONS NEL DATABASE:');
    console.log('======================================');

    const allSubmissions = await PlayerCardSubmission.find({}).limit(8);

    allSubmissions.forEach((sub, i) => {
        console.log(`${i + 1}. Target ID: ${sub.targetPlayerId}`);
        console.log(`   Voter ID: ${sub.voterId}`);

        if (sub.additionalAttributes) {
            console.log(`   Stelle: piede=${sub.additionalAttributes.piedeDebole}, skill=${sub.additionalAttributes.skill}`);
        } else {
            console.log(`   Stelle: ❌ NON PRESENTI`);
        }

        console.log(`   Data: ${sub.createdAt.toLocaleDateString('it-IT')}`);
        console.log('');
    });
};

// Funzione principale di analisi
const analyzePlayerSubmissions = async (targetPlayerId = TARGET_PLAYER_ID) => {
    console.log(`🔍 ANALISI SUBMISSIONS PER PLAYER: ${targetPlayerId}`);
    console.log('================================================');

    // Trova tutte le submissions per questo player
    const submissions = await PlayerCardSubmission.find({
        targetPlayerId: targetPlayerId
    });

    if (submissions.length === 0) {
        console.log(`❌ Nessuna submission trovata per il player ${targetPlayerId}`);
        console.log(`💡 Suggerimento: Verifica che l'ID sia corretto nella lista sopra`);
        return;
    }

    console.log(`📊 Trovate ${submissions.length} submissions\n`);

    // Mostra dettaglio di ogni voto
    submissions.forEach((sub, i) => {
        console.log(`${i + 1}. Voter ID: ${sub.voterId}`);

        if (sub.additionalAttributes) {
            console.log(`   Piede Debole: ${sub.additionalAttributes.piedeDebole} stelle`);
            console.log(`   Skill: ${sub.additionalAttributes.skill} stelle`);
        } else {
            console.log(`   ❌ Nessuna stella registrata`);
        }

        console.log(`   Data: ${sub.createdAt.toLocaleString('it-IT')}`);
        console.log('');
    });

    // Calcola media manuale
    const validSubmissions = submissions.filter(s => s.additionalAttributes);

    if (validSubmissions.length === 0) {
        console.log('❌ Nessuna submission con stelle valide trovata');
        return;
    }

    const piedeDeboleVotes = validSubmissions.map(s => s.additionalAttributes.piedeDebole);
    const skillVotes = validSubmissions.map(s => s.additionalAttributes.skill);

    console.log('🧮 CALCOLO MANUALE DELLE MEDIE:');
    console.log('===============================');
    console.log(`Piede Debole votes: [${piedeDeboleVotes.join(', ')}]`);
    console.log(`Skill votes: [${skillVotes.join(', ')}]`);
    console.log(`\nPiede Debole somma: ${piedeDeboleVotes.reduce((a, b) => a + b, 0)}`);
    console.log(`Skill somma: ${skillVotes.reduce((a, b) => a + b, 0)}`);
    console.log(`\nPiede Debole media: ${piedeDeboleVotes.reduce((a, b) => a + b, 0)} ÷ ${piedeDeboleVotes.length} = ${(piedeDeboleVotes.reduce((a, b) => a + b, 0) / piedeDeboleVotes.length).toFixed(2)}`);
    console.log(`Skill media: ${skillVotes.reduce((a, b) => a + b, 0)} ÷ ${skillVotes.length} = ${(skillVotes.reduce((a, b) => a + b, 0) / skillVotes.length).toFixed(2)}`);
    console.log(`\n🎯 RISULTATO FINALE:`);
    console.log(`Piede Debole arrotondato: ${Math.round(piedeDeboleVotes.reduce((a, b) => a + b, 0) / piedeDeboleVotes.length)} stelle`);
    console.log(`Skill arrotondato: ${Math.round(skillVotes.reduce((a, b) => a + b, 0) / skillVotes.length)} stelle`);

    // Confronta con risultato nel database
    const result = await PlayerCardResult.findOne({ targetPlayerId: targetPlayerId });

    if (result && result.finalAdditionalAttributes) {
        console.log(`\n📊 CONFRONTO CON DATABASE:`);
        console.log(`Database: piede=${result.finalAdditionalAttributes.piedeDebole}, skill=${result.finalAdditionalAttributes.skill}`);
        console.log(`Calcolato: piede=${Math.round(piedeDeboleVotes.reduce((a, b) => a + b, 0) / piedeDeboleVotes.length)}, skill=${Math.round(skillVotes.reduce((a, b) => a + b, 0) / skillVotes.length)}`);

        const dbPiede = result.finalAdditionalAttributes.piedeDebole;
        const dbSkill = result.finalAdditionalAttributes.skill;
        const calcPiede = Math.round(piedeDeboleVotes.reduce((a, b) => a + b, 0) / piedeDeboleVotes.length);
        const calcSkill = Math.round(skillVotes.reduce((a, b) => a + b, 0) / skillVotes.length);

        if (dbPiede === calcPiede && dbSkill === calcSkill) {
            console.log(`✅ I calcoli corrispondono!`);
        } else {
            console.log(`❌ DISCREPANZA TROVATA!`);
        }
    } else {
        console.log(`\n⚠️ Nessun PlayerCardResult trovato o stelle mancanti nel database`);
    }
};

// Funzione principale
const checkPlayerSubmissions = async () => {
    try {
        await connectDB();

        // Controlla se l'utente vuole vedere la lista
        const showList = process.argv.includes('--list');

        if (showList) {
            await listAllPlayers();
        } else {
            await listAllPlayers();
            console.log('\n' + '='.repeat(60) + '\n');
            await showSampleSubmissions();
            console.log('\n' + '='.repeat(60) + '\n');
            await analyzePlayerSubmissions();
        }

        mongoose.disconnect();
        console.log('\n🏁 Analisi completata. Disconnesso da MongoDB');

    } catch (error) {
        console.error('❌ Errore durante analisi:', error);
        mongoose.disconnect();
        process.exit(1);
    }
};

// Esegui solo se chiamato direttamente
if (require.main === module) {
    console.log('🔧 SCRIPT DI ANALISI PLAYER CARD SUBMISSIONS');
    console.log('============================================');
    console.log(`📌 Target Player ID: ${TARGET_PLAYER_ID}`);
    console.log(`💡 Per cambiare player, modifica TARGET_PLAYER_ID nel file`);
    console.log(`📋 Per vedere tutti i player: node debug-utils/check-player-submissions.js --list\n`);

    checkPlayerSubmissions();
}

module.exports = {
    analyzePlayerSubmissions,
    listAllPlayers,
    showSampleSubmissions
};