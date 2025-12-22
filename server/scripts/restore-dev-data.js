/**
 * 🔄 RESTORE DEV DATA
 * 
 * Script per ripristinare un backup del database DEV.
 * Ti permette di tornare a uno stato precedente del database di sviluppo.
 * 
 * Uso:
 * cd server
 * node scripts/restore-dev-data.js
 * 
 * Il script ti mostrerà tutti i backup disponibili e ti farà scegliere
 * quale ripristinare.
 * 
 * Cosa fa:
 * - Mostra i backup DEV disponibili
 * - Ti fa scegliere quale ripristinare
 * - Pulisce il database DEV attuale
 * - Ripristina i dati dal backup selezionato
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
// Carica il .env dalla cartella parent (server)
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (prompt) => {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
};

const restoreDevData = async () => {
    let devConnection;

    try {
        console.log('\n🔄 === RESTORE DEV DATABASE ===');

        // 1. CONTROLLO CARTELLA BACKUP
        const backupDir = path.join(__dirname, '..', 'dev-backups');
        if (!fs.existsSync(backupDir)) {
            console.log('❌ Cartella dev-backups non trovata!');
            console.log('💡 Esegui prima: node scripts/backup-dev-data.js');
            return;
        }

        // 2. LISTA DEI BACKUP DISPONIBILI
        const backupFiles = fs.readdirSync(backupDir)
            .filter(f => f.endsWith('.json') && f.startsWith('dev-backup-'))
            .sort()
            .reverse(); // Più recenti prima

        if (backupFiles.length === 0) {
            console.log('❌ Nessun backup DEV trovato!');
            console.log('💡 Esegui prima: node scripts/backup-dev-data.js');
            return;
        }

        console.log('\n📁 Backup DEV disponibili:');
        backupFiles.forEach((file, index) => {
            const filePath = path.join(backupDir, file);
            const stats = fs.statSync(filePath);
            const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
            const date = new Date(stats.mtime).toLocaleString('it-IT');
            console.log(`   ${index + 1}. ${file} (${sizeMB} MB - ${date})`);
        });

        // 3. SCELTA DEL BACKUP
        const choice = await question(`\n🔍 Scegli il backup da ripristinare (1-${backupFiles.length}): `);
        const choiceIndex = parseInt(choice) - 1;

        if (isNaN(choiceIndex) || choiceIndex < 0 || choiceIndex >= backupFiles.length) {
            console.log('❌ Scelta non valida!');
            return;
        }

        const selectedFile = backupFiles[choiceIndex];
        const backupPath = path.join(backupDir, selectedFile);

        console.log(`\n📋 Backup selezionato: ${selectedFile}`);

        // 4. CONFERMA
        const confirm = await question('\n⚠️ Questo cancellerà tutti i dati attuali nel database DEV. Continuare? (y/N): ');
        if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
            console.log('❌ Operazione annullata.');
            return;
        }

        // 5. CARICAMENTO BACKUP
        console.log('\n📖 Caricamento backup...');
        const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

        console.log(`✅ Backup del ${new Date(backupData.timestamp).toLocaleString('it-IT')}`);
        console.log(`📊 Database: ${backupData.database}`);

        // 6. CONNESSIONE AL DATABASE DEV
        console.log('\n🔌 Connessione al database DEV...');
        const devUri = process.env.MONGODB_URI_DEV;

        if (!devUri) {
            throw new Error('❌ MONGODB_URI_DEV deve essere configurato nel .env');
        }

        devConnection = await mongoose.createConnection(devUri);

        await new Promise(resolve => {
            if (devConnection.readyState === 1) resolve();
            else devConnection.once('connected', resolve);
        });

        console.log(`✅ DEV Database: ${devConnection.db.databaseName}`);

        // 7. PULIZIA DATABASE ATTUALE
        console.log('\n🗑️ Pulizia database DEV...');
        const collections = Object.keys(backupData.collections);

        for (const collName of collections) {
            try {
                const deleteResult = await devConnection.db.collection(collName).deleteMany({});
                if (deleteResult.deletedCount > 0) {
                    console.log(`   🗑️ ${collName}: eliminati ${deleteResult.deletedCount} documents`);
                }
            } catch (error) {
                // Collection non esiste, ok
            }
        }

        // 8. RIPRISTINO DATI
        console.log('\n📥 Ripristino dati...');
        let totalRestored = 0;

        for (const collName of collections) {
            const data = backupData.collections[collName];
            if (data && data.length > 0) {
                try {
                    await devConnection.db.collection(collName).insertMany(data);
                    totalRestored += data.length;
                    console.log(`   ✅ ${collName}: ${data.length} documents`);
                } catch (error) {
                    console.log(`   ❌ ${collName}: ${error.message}`);
                }
            }
        }

        // 9. VERIFICA FINALE
        console.log('\n🔍 Verifica...');
        let allOk = true;
        for (const collName of collections) {
            const expected = backupData.collections[collName].length;
            const actual = await devConnection.db.collection(collName).countDocuments();
            if (expected !== actual) {
                console.log(`   ❌ ${collName}: expected ${expected}, got ${actual}`);
                allOk = false;
            }
        }

        if (allOk) {
            console.log('\n🎉 === RIPRISTINO COMPLETATO! ===');
            console.log(`📊 ${totalRestored} documenti ripristinati`);
            console.log('🚀 Il database DEV è stato ripristinato con successo!');
        } else {
            console.log('\n⚠️ Ripristino completato con warning - controlla i logs sopra');
        }

    } catch (error) {
        console.error('\n❌ Errore:', error.message);
    } finally {
        if (devConnection) await devConnection.close();
        rl.close();
        console.log('\n🔌 Connessione chiusa');
    }
};

// Run the script
if (require.main === module) {
    restoreDevData().catch(console.error);
}

module.exports = { restoreDevData };