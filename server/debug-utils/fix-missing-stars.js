/**
 * ===============================================
 * SCRIPT DI MIGRAZIONE STELLE PLAYER CARDS
 * ===============================================
 * 
 * SCOPO:
 * Aggiunge le stelle mancanti (finalAdditionalAttributes) ai PlayerCardResult
 * esistenti senza perdere i voti già raccolti dalle submissions.
 * 
 * QUANDO USARE:
 * - Quando PlayerCardResult esistono ma non hanno finalAdditionalAttributes
 * - Dopo aver aggiornato il backend per salvare le stelle
 * - Per riparare dati esistenti senza rifare le votazioni
 * 
 * COSA FA:
 * 1. Trova tutti i PlayerCardResult senza finalAdditionalAttributes
 * 2. Per ogni record, recupera le PlayerCardSubmission corrispondenti
 * 3. Calcola la media delle stelle (piedeDebole e skill)
 * 4. Aggiorna PlayerCardResult con le stelle calcolate
 * 5. Verifica che tutti i record siano stati aggiornati
 * 
 * USO:
 * cd server
 * node debug-utils/fix-missing-stars.js
 * 
 * OUTPUT ATTESO:
 * - Trovati X PlayerCardResult senza stelle
 * - X/X PlayerCardResult aggiornati
 * - Verifica finale con conteggio record aggiornati
 * 
 * SICUREZZA:
 * - Non modifica le submissions esistenti
 * - Aggiunge solo campi mancanti
 * - Mostra dettagli di ogni operazione per verifica
 * 
 * PREREQUISITI:
 * - MongoDB connesso con variabili d'ambiente configurate
 * - PlayerCardSubmission e PlayerCardResult models disponibili
 * - Almeno un PlayerCardResult esistente senza finalAdditionalAttributes
 */

// Carica le variabili d'ambiente (stesso percorso del server)
require('dotenv').config();

const mongoose = require('mongoose');
const PlayerCardSubmission = require('../src/models/PlayerCardSubmission');
const PlayerCardResult = require('../src/models/PlayerCardResult');

// Connessione MongoDB (usa stessa configurazione del server)
const connectDB = async () => {
    try {
        // Usa stessa logica del server per selezionare il database
        const nodeEnv = process.env.NODE_ENV?.trim();
        console.log(`🔍 NODE_ENV: "${nodeEnv}"`);

        const mongoUri = nodeEnv === 'test'
            ? process.env.MONGODB_URI_TEST
            : (process.env.MONGODB_URI || process.env.MONGODB_URI_PROD || 'mongodb://localhost:27017/Pagelle-FC-local');

        console.log(`🔗 Selected URI contains: ${mongoUri?.includes('test') ? 'TEST' : (mongoUri?.includes('prod') ? 'PROD' : 'LOCAL')} database`);

        const conn = await mongoose.connect(mongoUri, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });

        console.log(`✅ MongoDB Connected per migrazione stelle`);
        console.log(`📦 Host: ${conn.connection.host}`);
        console.log(`🎯 Database: ${conn.connection.name}`);
    } catch (err) {
        console.error('❌ Errore connessione MongoDB:', err);
        process.exit(1);
    }
};

// Funzione per calcolare le stelle da submissions esistenti
const calculateStarsFromSubmissions = async (targetPlayerId, votingSessionId) => {
    try {
        // Trova tutte le submissions per questo player e questa session
        const submissions = await PlayerCardSubmission.find({
            targetPlayerId: targetPlayerId,
            votingSessionId: votingSessionId,
            isActive: true,
            additionalAttributes: { $exists: true }
        });

        if (submissions.length === 0) {
            console.log(`   ⚠️ Nessuna submission trovata per player ${targetPlayerId}`);
            return null;
        }

        console.log(`   Submissions trovate: ${submissions.length}`);

        // Estrai e calcola media stelle
        const piedeDeboleVotes = submissions
            .map(s => s.additionalAttributes.piedeDebole)
            .filter(val => val !== undefined && val !== null);

        const skillVotes = submissions
            .map(s => s.additionalAttributes.skill)
            .filter(val => val !== undefined && val !== null);

        if (piedeDeboleVotes.length === 0 || skillVotes.length === 0) {
            console.log(`   ⚠️ Voti stelle insufficienti`);
            return null;
        }

        // Calcola medie e arrotonda
        const piedeDeboleMean = piedeDeboleVotes.reduce((a, b) => a + b, 0) / piedeDeboleVotes.length;
        const skillMean = skillVotes.reduce((a, b) => a + b, 0) / skillVotes.length;

        const finalStars = {
            skill: Math.round(skillMean),
            piedeDebole: Math.round(piedeDeboleMean)
        };

        console.log(`   Stelle calcolate: ${JSON.stringify(finalStars)}`);
        return finalStars;

    } catch (error) {
        console.error(`   ❌ Errore calcolo stelle per ${targetPlayerId}:`, error);
        return null;
    }
};

// Script principale
const fixMissingStars = async () => {
    console.log('🔧 === INIZIO MIGRAZIONE STELLE ===\n');

    try {
        // DEBUG: Verifica database e collezione
        const dbName = mongoose.connection.db.databaseName;
        console.log(`🔍 Database connesso: ${dbName}`);

        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log(`📂 Collezioni trovate:`, collections.map(c => c.name));

        // DEBUG: Conta tutti i PlayerCardResult
        const totalResults = await PlayerCardResult.countDocuments();
        console.log(`📊 Totale PlayerCardResult: ${totalResults}`);

        // DEBUG: Conta tutti i PlayerCardSubmission
        const totalSubmissions = await PlayerCardSubmission.countDocuments();
        console.log(`📊 Totale PlayerCardSubmission: ${totalSubmissions}`);

        // DEBUG: Verifica alcuni record
        const sampleResults = await PlayerCardResult.find().limit(2);
        console.log(`📋 Esempio PlayerCardResult:`, sampleResults.map(r => ({
            id: r._id,
            hasStars: !!r.finalAdditionalAttributes,
            starsField: r.finalAdditionalAttributes
        })));

        const sampleSubmissions = await PlayerCardSubmission.find().limit(2);
        console.log(`📋 Esempio PlayerCardSubmission:`, sampleSubmissions.map(s => ({
            id: s._id,
            hasStars: !!s.additionalAttributes,
            starsField: s.additionalAttributes
        })));

        // 1. Trova tutti i PlayerCardResult che non hanno finalAdditionalAttributes
        const resultsWithoutStars = await PlayerCardResult.find({
            finalAdditionalAttributes: { $exists: false }  // ⭐ CERCA SOLO DOVE IL CAMPO NON ESISTE
        });

        console.log(`📊 Trovati ${resultsWithoutStars.length} PlayerCardResult senza stelle\n`);

        if (resultsWithoutStars.length === 0) {
            console.log('✅ Tutti i PlayerCardResult hanno già le stelle!');
            return;
        }

        let updatedCount = 0;

        // 2. Per ogni PlayerCardResult senza stelle
        for (const result of resultsWithoutStars) {
            console.log(`🔍 Processando PlayerCardResult: ${result._id}`);
            console.log(`   Target Player: ${result.targetPlayerId}`);
            console.log(`   Session: ${result.votingSessionId}`);

            // 3. Calcola stelle dalle submissions
            const calculatedStars = await calculateStarsFromSubmissions(
                result.targetPlayerId,
                result.votingSessionId
            );

            if (!calculatedStars) {
                console.log(`   ⚠️ Impossibile calcolare stelle per ${result._id}`);
                continue;
            }

            // 4. Aggiorna PlayerCardResult con le stelle
            result.finalAdditionalAttributes = calculatedStars;

            try {
                await result.save();
                console.log(`   ✅ PlayerCardResult aggiornato con successo!\n`);
                updatedCount++;
            } catch (error) {
                console.error(`   ❌ Errore salvataggio ${result._id}:`, error.message);
            }
        }

        console.log('🎉 === MIGRAZIONE COMPLETATA ===');
        console.log(`📊 PlayerCardResult aggiornati: ${updatedCount}/${resultsWithoutStars.length}\n`);

        // 5. Verifica finale
        console.log('🔍 === VERIFICA RISULTATI ===');
        const resultsWithStars = await PlayerCardResult.find({
            finalAdditionalAttributes: { $exists: true }
        });

        console.log(`✅ PlayerCardResult con stelle: ${resultsWithStars.length}`);

        // Mostra dettaglio stelle per verifica
        resultsWithStars.forEach(result => {
            const stars = result.finalAdditionalAttributes;
            console.log(`   ${result._id}: piede=${stars.piedeDebole}, skill=${stars.skill}`);
        });

    } catch (error) {
        console.error('❌ Errore durante migrazione:', error);
        process.exit(1);
    }
};

// Funzione principale di esecuzione
const runMigration = async () => {
    try {
        await connectDB();
        await fixMissingStars();

        console.log('\n🏁 Script completato. Chiusura connessione...');
        await mongoose.disconnect();
        process.exit(0);

    } catch (error) {
        console.error('❌ Errore fatale:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
};

// Esegui solo se chiamato direttamente
if (require.main === module) {
    runMigration();
}

module.exports = { runMigration, calculateStarsFromSubmissions };