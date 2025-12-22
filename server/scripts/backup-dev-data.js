/**
 * 💾 BACKUP DEV DATA 
 * 
 * Script per creare un backup completo del database DEV.
 * Utile per salvare il lavoro di sviluppo prima di test importanti.
 * 
 * Uso:
 * cd server
 * node scripts/backup-dev-data.js
 * 
 * Cosa fa:
 * - Si connette al database DEV
 * - Esporta tutti i dati in un file JSON
 * - Salva il backup nella cartella dev-backups
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
// Carica il .env dalla cartella parent (server)
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const COLLECTIONS_TO_BACKUP = [
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

const backupDevData = async () => {
    let devConnection;

    try {
        console.log('\n💾 === BACKUP DEV DATABASE ===');

        // 1. CONNESSIONE AL DATABASE DEV
        console.log('🔌 Connessione al database DEV...');

        const devUri = process.env.MONGODB_URI_DEV;

        if (!devUri) {
            throw new Error('❌ MONGODB_URI_DEV deve essere configurato nel .env');
        }

        devConnection = await mongoose.createConnection(devUri);

        // Aspetta che la connessione sia attiva
        await new Promise(resolve => {
            if (devConnection.readyState === 1) resolve();
            else devConnection.once('connected', resolve);
        });

        console.log(`✅ DEV Database: ${devConnection.db.databaseName}`);

        // 2. CREAZIONE CARTELLA BACKUP
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(__dirname, '..', 'dev-backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        const backupFile = path.join(backupDir, `dev-backup-${timestamp}.json`);

        // 3. LETTURA DATI DAL DATABASE DEV
        console.log('\n📖 Lettura dati da DEV...');
        const devBackup = {
            timestamp: new Date().toISOString(),
            database: devConnection.db.databaseName,
            collections: {}
        };

        let totalDocs = 0;

        for (const collName of COLLECTIONS_TO_BACKUP) {
            try {
                const data = await devConnection.db.collection(collName).find({}).toArray();
                devBackup.collections[collName] = data;
                totalDocs += data.length;
                if (data.length > 0) {
                    console.log(`   📋 ${collName}: ${data.length} documents`);
                }
            } catch (error) {
                devBackup.collections[collName] = [];
                console.log(`   ⚠️ ${collName}: collezione non trovata (ok)`);
            }
        }

        console.log(`📊 Totale da salvare: ${totalDocs} documents`);

        // 4. SALVATAGGIO BACKUP
        console.log('\n💾 Salvataggio backup...');
        fs.writeFileSync(backupFile, JSON.stringify(devBackup, null, 2));

        const fileSizeMB = (fs.statSync(backupFile).size / (1024 * 1024)).toFixed(2);
        console.log(`✅ Backup salvato: ${path.basename(backupFile)} (${fileSizeMB} MB)`);

        // 5. RIEPILOGO
        console.log('\n🎉 === BACKUP COMPLETATO! ===');
        console.log(`📁 File: ${path.basename(backupFile)}`);
        console.log(`📊 ${totalDocs} documenti salvati`);
        console.log(`💾 Dimensione: ${fileSizeMB} MB`);
        console.log('\n💡 Usa restore-dev-data.js per ripristinare questo backup.');

    } catch (error) {
        console.error('\n❌ Errore:', error.message);
        process.exit(1);
    } finally {
        if (devConnection) await devConnection.close();
        console.log('\n🔌 Connessione chiusa');
        process.exit(0);
    }
};

// Run the script
if (require.main === module) {
    backupDevData().catch(console.error);
}

module.exports = { backupDevData };