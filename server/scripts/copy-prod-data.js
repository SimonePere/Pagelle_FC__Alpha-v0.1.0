/**
 * 📋 COPY PRODUCTION DATA TO TEST
 * 
 * Script semplice per copiare i dati di produzione nel database test.
 * Usa questo quando vuoi testare con dati reali ma in sicurezza.
 * 
 * Uso:
 * cd server
 * node scripts/copy-prod-data.js
 * 
 * Cosa fa:
 * - Si connette al database di produzione
 * - Si connette al database test  
 * - Cancella tutto dal test
 * - Copia tutto dalla produzione
 * - Fine!
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
// Carica il .env dalla cartella parent (server)
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const COLLECTIONS_TO_COPY = [
    'users',
    'teams',
    'matches',
    'votingsessions',
    'votesubmissions',
    'voteresults',
    'playercardsubmissions',
    'playercardresults',
    'playerleaderboardstats',
    'playercarddemands'
];

const copyProdData = async () => {
    let prodConnection, testConnection;

    try {
        console.log('\n📋 === COPY PROD DATA TO TEST ===');

        // 1. CONNESSIONI AI DUE DATABASE
        console.log('🔌 Connessioni ai database...');

        const prodUri = process.env.MONGODB_URI;
        const testUri = process.env.MONGODB_URI_TEST;

        if (!prodUri || !testUri) {
            throw new Error('❌ MONGODB_URI e MONGODB_URI_TEST devono essere configurati nel .env');
        }

        prodConnection = await mongoose.createConnection(prodUri);
        testConnection = await mongoose.createConnection(testUri);

        // Aspetta che le connessioni siano attive
        await new Promise(resolve => {
            if (prodConnection.readyState === 1) resolve();
            else prodConnection.once('connected', resolve);
        });
        await new Promise(resolve => {
            if (testConnection.readyState === 1) resolve();
            else testConnection.once('connected', resolve);
        });

        console.log(`✅ Produzione: ${prodConnection.db.databaseName}`);
        console.log(`✅ Test: ${testConnection.db.databaseName}`);

        // 2. BACKUP DEL TEST (per sicurezza)
        console.log('\n💾 Backup database test...');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(__dirname, '..', 'db-backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        const backupFile = path.join(backupDir, `test-backup-${timestamp}.json`);
        const testBackup = {};

        for (const collName of COLLECTIONS_TO_COPY) {
            try {
                const data = await testConnection.db.collection(collName).find({}).toArray();
                testBackup[collName] = data;
            } catch (error) {
                testBackup[collName] = [];
            }
        }

        fs.writeFileSync(backupFile, JSON.stringify(testBackup, null, 2));
        console.log(`✅ Backup salvato: ${path.basename(backupFile)}`);

        // 3. LETTURA DATI DA PRODUZIONE
        console.log('\n📖 Lettura dati da produzione...');
        const prodData = {};
        let totalDocs = 0;

        for (const collName of COLLECTIONS_TO_COPY) {
            try {
                const data = await prodConnection.db.collection(collName).find({}).toArray();
                prodData[collName] = data;
                totalDocs += data.length;
                if (data.length > 0) {
                    console.log(`   📋 ${collName}: ${data.length} documents`);
                }
            } catch (error) {
                prodData[collName] = [];
            }
        }

        console.log(`📊 Totale da copiare: ${totalDocs} documents`);

        // 4. PULIZIA DATABASE TEST
        console.log('\n🗑️ Pulizia database test...');
        for (const collName of COLLECTIONS_TO_COPY) {
            try {
                const deleteResult = await testConnection.db.collection(collName).deleteMany({});
                if (deleteResult.deletedCount > 0) {
                    console.log(`   🗑️ ${collName}: eliminati ${deleteResult.deletedCount} documents`);
                }
            } catch (error) {
                // Collection non esiste, ok
            }
        }

        // 5. COPIA DATI
        console.log('\n📥 Copia dati...');
        let totalCopied = 0;

        for (const collName of COLLECTIONS_TO_COPY) {
            const data = prodData[collName];
            if (data.length > 0) {
                try {
                    await testConnection.db.collection(collName).insertMany(data);
                    totalCopied += data.length;
                    console.log(`   ✅ ${collName}: ${data.length} documents`);
                } catch (error) {
                    console.log(`   ❌ ${collName}: ${error.message}`);
                }
            }
        }

        // 6. VERIFICA FINALE
        console.log('\n🔍 Verifica...');
        let allOk = true;
        for (const collName of COLLECTIONS_TO_COPY) {
            const expected = prodData[collName].length;
            const actual = await testConnection.db.collection(collName).countDocuments();
            if (expected !== actual) {
                console.log(`   ❌ ${collName}: expected ${expected}, got ${actual}`);
                allOk = false;
            }
        }

        if (allOk) {
            console.log('\n🎉 === COPIA COMPLETATA! ===');
            console.log(`📊 ${totalCopied} documenti copiati`);
            console.log('🚀 Il database test è pronto con i dati di produzione!');
            console.log('\n💡 Ora puoi testare quello che vuoi senza rischi.');
        } else {
            console.log('\n⚠️ Copia completata con warning - controlla i logs sopra');
        }

    } catch (error) {
        console.error('\n❌ Errore:', error.message);
    } finally {
        if (prodConnection) await prodConnection.close();
        if (testConnection) await testConnection.close();
        console.log('\n🔌 Connessioni chiuse');
    }
};

// Run the script
if (require.main === module) {
    copyProdData().catch(console.error);
}

module.exports = { copyProdData };