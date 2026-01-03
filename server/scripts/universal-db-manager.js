/**
 * 🎯 UNIVERSAL DATABASE MANAGER
 * 
 * Script universale per gestire tutti i database del progetto.
 * Combina le funzionalità di copy-prod-data.js, backup-dev-data.js e restore-dev-data.js
 * in un unico script flessibile e interattivo.
 * 
 * Uso:
 * cd server
 * node scripts/universal-db-manager.js
 * 
 * Funzionalità:
 * - Copia da qualsiasi DB a qualsiasi DB
 * - Backup di qualsiasi DB
 * - Ripristino da backup esistenti
 * - Backup automatico della destinazione prima della copia
 * - Interfaccia interattiva per tutte le operazioni
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

// Database disponibili dal .env
const DATABASES = {
    'PROD': {
        name: 'Produzione',
        uri: process.env.MONGODB_URI,
        envVar: 'MONGODB_URI'
    },
    'TEST': {
        name: 'Test',
        uri: process.env.MONGODB_URI_TEST,
        envVar: 'MONGODB_URI_TEST'
    },
    'DEV': {
        name: 'Sviluppo',
        uri: process.env.MONGODB_URI_DEV,
        envVar: 'MONGODB_URI_DEV'
    }
};

// Collezioni da gestire
const COLLECTIONS = [
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

class UniversalDBManager {
    constructor() {
        this.connections = {};
    }

    async showMenu() {
        console.log('\n🎯 === UNIVERSAL DATABASE MANAGER ===');
        console.log('\nScegli un\'operazione:');
        console.log('1. 📋 Copia dati tra database');
        console.log('2. 💾 Backup database');
        console.log('3. 🔄 Ripristina da backup');
        console.log('4. 📊 Mostra info database');
        console.log('0. ❌ Esci');
        console.log('');

        const choice = await question('👉 Inserisci il numero dell\'operazione: ');
        return choice.trim();
    }

    async showDatabases(title = 'Database disponibili') {
        console.log(`\n${title}:`);
        let index = 1;
        const validDatabases = [];

        for (const [key, db] of Object.entries(DATABASES)) {
            if (db.uri) {
                console.log(`${index}. ${db.name} (${key})`);
                validDatabases.push({ key, ...db, index });
                index++;
            } else {
                console.log(`❌ ${db.name} (${key}) - Non configurato nel .env`);
            }
        }

        return validDatabases;
    }

    async selectDatabase(title, excludeKey = null) {
        const databases = await this.showDatabases(title);
        const validDatabases = databases.filter(db => db.key !== excludeKey);

        if (validDatabases.length === 0) {
            console.log('❌ Nessun database disponibile!');
            return null;
        }

        const choice = await question('\n👉 Seleziona database (numero): ');
        const selectedIndex = parseInt(choice.trim());

        const selected = validDatabases.find(db => db.index === selectedIndex);
        if (!selected) {
            console.log('❌ Selezione non valida!');
            return null;
        }

        return selected;
    }

    async createConnection(dbKey) {
        if (this.connections[dbKey]) {
            return this.connections[dbKey];
        }

        const db = DATABASES[dbKey];
        if (!db || !db.uri) {
            throw new Error(`❌ Database ${dbKey} non configurato!`);
        }

        console.log(`🔌 Connessione a ${db.name}...`);
        const connection = await mongoose.createConnection(db.uri);

        // Aspetta che la connessione sia attiva
        await new Promise(resolve => {
            if (connection.readyState === 1) resolve();
            else connection.once('connected', resolve);
        });

        console.log(`✅ Connesso a: ${connection.db.databaseName}`);
        this.connections[dbKey] = connection;
        return connection;
    }

    async copyDatabases() {
        console.log('\n📋 === COPIA DATI TRA DATABASE ===');

        // Selezione database sorgente
        const sourceDB = await this.selectDatabase('📖 Seleziona database SORGENTE (da cui copiare)');
        if (!sourceDB) return;

        // Selezione database destinazione
        const destDB = await this.selectDatabase('📝 Seleziona database DESTINAZIONE (dove copiare)', sourceDB.key);
        if (!destDB) return;

        // Conferma operazione
        console.log(`\n⚠️ ATTENZIONE: Stai per copiare tutti i dati da:`);
        console.log(`   📖 SORGENTE: ${sourceDB.name} (${sourceDB.key})`);
        console.log(`   📝 DESTINAZIONE: ${destDB.name} (${destDB.key})`);
        console.log(`\n❗ Tutti i dati esistenti in ${destDB.name} saranno SOVRASCRITTI!`);

        const confirm = await question('\n❓ Vuoi continuare? (digita "SI" per confermare): ');
        if (confirm.toUpperCase() !== 'SI') {
            console.log('❌ Operazione annullata.');
            return;
        }

        try {
            // Connessioni
            const sourceConn = await this.createConnection(sourceDB.key);
            const destConn = await this.createConnection(destDB.key);

            // Backup automatico della destinazione
            console.log(`\n💾 Backup automatico di ${destDB.name}...`);
            const backupPath = await this.createBackup(destConn, `${destDB.key.toLowerCase()}-auto-backup`);
            console.log(`✅ Backup salvato: ${path.basename(backupPath)}`);

            // Copia dei dati
            console.log('\n📖 Lettura dati da sorgente...');
            const sourceData = {};
            let totalDocs = 0;

            for (const collName of COLLECTIONS) {
                try {
                    const data = await sourceConn.db.collection(collName).find({}).toArray();
                    sourceData[collName] = data;
                    totalDocs += data.length;
                    console.log(`  ✅ ${collName}: ${data.length} documenti`);
                } catch (error) {
                    console.log(`  ⚠️ ${collName}: Collezione non trovata, saltata`);
                    sourceData[collName] = [];
                }
            }

            console.log(`📊 Totale documenti da copiare: ${totalDocs}`);

            if (totalDocs === 0) {
                console.log('❌ Nessun dato trovato nel database sorgente!');
                return;
            }

            // Pulizia destinazione
            console.log(`\n🧹 Pulizia ${destDB.name}...`);
            for (const collName of COLLECTIONS) {
                try {
                    await destConn.db.collection(collName).deleteMany({});
                    console.log(`  ✅ ${collName}: pulita`);
                } catch (error) {
                    console.log(`  ⚠️ ${collName}: ${error.message}`);
                }
            }

            // Inserimento dati
            console.log(`\n📝 Scrittura dati in ${destDB.name}...`);
            let copiedDocs = 0;

            for (const collName of COLLECTIONS) {
                const data = sourceData[collName];
                if (data && data.length > 0) {
                    try {
                        await destConn.db.collection(collName).insertMany(data);
                        copiedDocs += data.length;
                        console.log(`  ✅ ${collName}: ${data.length} documenti inseriti`);
                    } catch (error) {
                        console.log(`  ❌ ${collName}: ${error.message}`);
                    }
                }
            }

            console.log(`\n🎉 === COPIA COMPLETATA ===`);
            console.log(`📊 Documenti copiati: ${copiedDocs}/${totalDocs}`);
            console.log(`📖 Da: ${sourceDB.name} (${sourceDB.key})`);
            console.log(`📝 A: ${destDB.name} (${destDB.key})`);
            console.log(`💾 Backup destinazione: ${path.basename(backupPath)}`);

        } catch (error) {
            console.error('❌ Errore durante la copia:', error.message);
        }
    }

    async createBackup(connection, prefix = 'manual-backup') {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(__dirname, '..', 'db-backups');

        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        const backupFile = path.join(backupDir, `${prefix}-${timestamp}.json`);
        const backupData = {};
        let totalDocs = 0;

        for (const collName of COLLECTIONS) {
            try {
                const data = await connection.db.collection(collName).find({}).toArray();
                backupData[collName] = data;
                totalDocs += data.length;
                console.log(`  ✅ ${collName}: ${data.length} documenti`);
            } catch (error) {
                console.log(`  ⚠️ ${collName}: Collezione non trovata`);
                backupData[collName] = [];
            }
        }

        fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
        console.log(`📊 Totale documenti nel backup: ${totalDocs}`);

        return backupFile;
    }

    async backupDatabase() {
        console.log('\n💾 === BACKUP DATABASE ===');

        const selectedDB = await this.selectDatabase('💾 Seleziona database da cui fare backup');
        if (!selectedDB) return;

        try {
            const connection = await this.createConnection(selectedDB.key);

            console.log(`\n💾 Creazione backup di ${selectedDB.name}...`);
            const backupPath = await this.createBackup(connection, selectedDB.key.toLowerCase());

            console.log(`\n🎉 === BACKUP COMPLETATO ===`);
            console.log(`📁 File: ${path.basename(backupPath)}`);
            console.log(`📊 Database: ${selectedDB.name} (${selectedDB.key})`);

        } catch (error) {
            console.error('❌ Errore durante il backup:', error.message);
        }
    }

    async restoreFromBackup() {
        console.log('\n🔄 === RIPRISTINA DA BACKUP ===');

        // Selezione database destinazione
        const destDB = await this.selectDatabase('🔄 Seleziona database da ripristinare');
        if (!destDB) return;

        // Lista backup disponibili
        const backupDir = path.join(__dirname, '..', 'db-backups');
        if (!fs.existsSync(backupDir)) {
            console.log('❌ Cartella db-backups non trovata!');
            return;
        }

        const backupFiles = fs.readdirSync(backupDir)
            .filter(file => file.endsWith('.json'))
            .sort()
            .reverse();

        if (backupFiles.length === 0) {
            console.log('❌ Nessun backup trovato!');
            return;
        }

        console.log('\n📁 Backup disponibili:');
        backupFiles.forEach((file, index) => {
            const stats = fs.statSync(path.join(backupDir, file));
            const date = stats.mtime.toLocaleDateString('it-IT', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
            console.log(`${index + 1}. ${file} (${date})`);
        });

        const choice = await question('\n👉 Seleziona backup (numero): ');
        const selectedIndex = parseInt(choice.trim()) - 1;

        if (selectedIndex < 0 || selectedIndex >= backupFiles.length) {
            console.log('❌ Selezione non valida!');
            return;
        }

        const selectedBackup = backupFiles[selectedIndex];
        const backupPath = path.join(backupDir, selectedBackup);

        // Conferma operazione
        console.log(`\n⚠️ ATTENZIONE: Stai per ripristinare:`);
        console.log(`   📁 BACKUP: ${selectedBackup}`);
        console.log(`   🔄 IN: ${destDB.name} (${destDB.key})`);
        console.log(`\n❗ Tutti i dati esistenti in ${destDB.name} saranno SOVRASCRITTI!`);

        const confirm = await question('\n❓ Vuoi continuare? (digita "SI" per confermare): ');
        if (confirm.toUpperCase() !== 'SI') {
            console.log('❌ Operazione annullata.');
            return;
        }

        try {
            // Connessione
            const connection = await this.createConnection(destDB.key);

            // Backup automatico prima del ripristino
            console.log(`\n💾 Backup automatico di ${destDB.name}...`);
            const autoBackupPath = await this.createBackup(connection, `${destDB.key.toLowerCase()}-pre-restore`);
            console.log(`✅ Backup salvato: ${path.basename(autoBackupPath)}`);

            // Caricamento dati dal backup
            console.log('\n📖 Caricamento backup...');
            const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

            // Pulizia database
            console.log(`\n🧹 Pulizia ${destDB.name}...`);
            for (const collName of COLLECTIONS) {
                try {
                    await connection.db.collection(collName).deleteMany({});
                    console.log(`  ✅ ${collName}: pulita`);
                } catch (error) {
                    console.log(`  ⚠️ ${collName}: ${error.message}`);
                }
            }

            // Ripristino dati
            console.log(`\n🔄 Ripristino dati in ${destDB.name}...`);
            let restoredDocs = 0;

            for (const collName of COLLECTIONS) {
                const data = backupData[collName];
                if (data && data.length > 0) {
                    try {
                        await connection.db.collection(collName).insertMany(data);
                        restoredDocs += data.length;
                        console.log(`  ✅ ${collName}: ${data.length} documenti ripristinati`);
                    } catch (error) {
                        console.log(`  ❌ ${collName}: ${error.message}`);
                    }
                }
            }

            console.log(`\n🎉 === RIPRISTINO COMPLETATO ===`);
            console.log(`📊 Documenti ripristinati: ${restoredDocs}`);
            console.log(`📁 Da backup: ${selectedBackup}`);
            console.log(`🔄 In: ${destDB.name} (${destDB.key})`);
            console.log(`💾 Backup pre-ripristino: ${path.basename(autoBackupPath)}`);

        } catch (error) {
            console.error('❌ Errore durante il ripristino:', error.message);
        }
    }

    async showDatabaseInfo() {
        console.log('\n📊 === INFORMAZIONI DATABASE ===');

        const selectedDB = await this.selectDatabase('📊 Seleziona database da analizzare');
        if (!selectedDB) return;

        try {
            const connection = await this.createConnection(selectedDB.key);

            console.log(`\n📊 Database: ${selectedDB.name} (${selectedDB.key})`);
            console.log(`🔗 Nome: ${connection.db.databaseName}`);
            console.log(`\n📋 Collezioni e documenti:`);

            let totalDocs = 0;
            for (const collName of COLLECTIONS) {
                try {
                    const count = await connection.db.collection(collName).countDocuments();
                    totalDocs += count;
                    console.log(`  📄 ${collName}: ${count} documenti`);
                } catch (error) {
                    console.log(`  ❌ ${collName}: Collezione non trovata`);
                }
            }

            console.log(`\n📊 Totale documenti: ${totalDocs}`);

        } catch (error) {
            console.error('❌ Errore nell\'analisi:', error.message);
        }
    }

    async closeConnections() {
        for (const [key, connection] of Object.entries(this.connections)) {
            try {
                await connection.close();
                console.log(`✅ Connessione ${key} chiusa`);
            } catch (error) {
                console.log(`⚠️ Errore chiusura ${key}: ${error.message}`);
            }
        }
    }

    async run() {
        try {
            // Verifica configurazione .env
            const missingEnvs = [];
            for (const [key, db] of Object.entries(DATABASES)) {
                if (!db.uri) {
                    missingEnvs.push(db.envVar);
                }
            }

            if (missingEnvs.length > 0) {
                console.log('\n⚠️ Variabili d\'ambiente mancanti nel .env:');
                missingEnvs.forEach(env => console.log(`  - ${env}`));
                console.log('\nConfigura queste variabili prima di continuare.');
                process.exit(1);
            }

            while (true) {
                const choice = await this.showMenu();

                switch (choice) {
                    case '1':
                        await this.copyDatabases();
                        break;
                    case '2':
                        await this.backupDatabase();
                        break;
                    case '3':
                        await this.restoreFromBackup();
                        break;
                    case '4':
                        await this.showDatabaseInfo();
                        break;
                    case '0':
                        console.log('\n👋 Arrivederci!');
                        return;
                    default:
                        console.log('❌ Opzione non valida!');
                }

                console.log('\n' + '='.repeat(50));
            }

        } catch (error) {
            console.error('\n❌ Errore generale:', error.message);
        } finally {
            await this.closeConnections();
            rl.close();
        }
    }
}

// Avvio dello script
if (require.main === module) {
    const manager = new UniversalDBManager();
    manager.run();
}

module.exports = UniversalDBManager;