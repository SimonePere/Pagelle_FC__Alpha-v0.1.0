#!/usr/bin/env node

/**
 * 📦 DATABASE MIGRATION TOOL
 * 
 * Script per migrare dati dal database di TEST al database di PRODUZIONE
 * 
 * USAGE:
 * npm run db:backup    -> Crea backup del DB di test
 * npm run db:restore   -> Ripristina backup nel DB di produzione
 * npm run db:migrate   -> Migrazione completa test -> prod
 */

// Carica le variabili d'ambiente
require('dotenv').config();

const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');

// Import dei modelli
const User = require('./src/models/User');
const Match = require('./src/models/Match');
const Team = require('./src/models/Team');
const VoteSubmission = require('./src/models/VoteSubmission');
const VoteResult = require('./src/models/VoteResult');
const VotingSession = require('./src/models/VotingSession');
const PlayerCardSubmission = require('./src/models/PlayerCardSubmission');
const PlayerCardResult = require('./src/models/PlayerCardResult');
const PlayerLeaderboardStats = require('./src/models/PlayerLeaderboardStats');
const MatchNotification = require('./src/models/MatchNotification');

// Configurazione
const BACKUP_DIR = './db-backups';
const BACKUP_TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-');

// Modelli da migrare (ordinati per dipendenze)
const MODELS_TO_MIGRATE = [
    { name: 'User', model: User },
    { name: 'Team', model: Team },
    { name: 'Match', model: Match },
    { name: 'VotingSession', model: VotingSession },
    { name: 'VoteSubmission', model: VoteSubmission },
    { name: 'VoteResult', model: VoteResult },
    { name: 'PlayerCardSubmission', model: PlayerCardSubmission },
    { name: 'PlayerCardResult', model: PlayerCardResult },
    { name: 'PlayerLeaderboardStats', model: PlayerLeaderboardStats },
    { name: 'MatchNotification', model: MatchNotification }
];

/**
 * Connessione al database
 */
async function connectToDatabase(isTest = true) {
    const mongoUri = isTest
        ? process.env.MONGODB_URI_TEST
        : process.env.MONGODB_URI;

    if (!mongoUri) {
        throw new Error(`❌ Missing MongoDB URI for ${isTest ? 'TEST' : 'PROD'} environment`);
    }

    await mongoose.connect(mongoUri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
    });

    console.log(`✅ Connected to ${isTest ? 'TEST' : 'PROD'} database: ${mongoose.connection.name}`);
}

/**
 * Crea directory di backup se non esiste
 */
async function ensureBackupDir() {
    try {
        await fs.mkdir(BACKUP_DIR, { recursive: true });
    } catch (error) {
        // Directory già esistente
    }
}

/**
 * Backup di tutti i dati dal database di test
 */
async function backupTestData() {
    console.log('🔄 Starting backup from TEST database...');

    await connectToDatabase(true); // Test DB
    await ensureBackupDir();

    const backupData = {
        timestamp: new Date().toISOString(),
        database: mongoose.connection.name,
        collections: {}
    };

    let totalRecords = 0;

    for (const { name, model } of MODELS_TO_MIGRATE) {
        try {
            // Per gli User, includiamo anche il campo password che normalmente è escluso
            const query = name === 'User' ? model.find({}).select('+password') : model.find({});
            const data = await query.lean();
            backupData.collections[name] = data;

            console.log(`📦 ${name}: ${data.length} records`);
            totalRecords += data.length;
        } catch (error) {
            console.error(`❌ Error backing up ${name}:`, error.message);
            backupData.collections[name] = [];
        }
    }

    const backupFile = path.join(BACKUP_DIR, `backup-${BACKUP_TIMESTAMP}.json`);
    await fs.writeFile(backupFile, JSON.stringify(backupData, null, 2));

    console.log(`✅ Backup completed!`);
    console.log(`📁 File: ${backupFile}`);
    console.log(`📊 Total records: ${totalRecords}`);

    await mongoose.disconnect();
    return backupFile;
}

/**
 * Ripristina dati nel database di produzione
 */
async function restoreToProduction(backupFile) {
    console.log('🔄 Starting restore to PRODUCTION database...');

    // Leggi file di backup
    const backupContent = await fs.readFile(backupFile, 'utf8');
    const backupData = JSON.parse(backupContent);

    console.log(`📁 Restoring from: ${backupFile}`);
    console.log(`📅 Backup created: ${backupData.timestamp}`);

    // Connetti al DB di produzione
    await connectToDatabase(false); // Prod DB

    console.log('⚠️  WARNING: About to restore data to PRODUCTION database!');
    console.log(`🎯 Target database: ${mongoose.connection.name}`);

    // Conferma prima di procedere
    if (process.env.NODE_ENV === 'production' && !process.env.FORCE_RESTORE) {
        console.log('🛑 For safety, set FORCE_RESTORE=true to proceed in production');
        await mongoose.disconnect();
        return;
    }

    let totalRestored = 0;

    for (const { name, model } of MODELS_TO_MIGRATE) {
        const collectionData = backupData.collections[name];

        if (!collectionData || collectionData.length === 0) {
            console.log(`⏭️  ${name}: No data to restore`);
            continue;
        }

        try {
            // Pulisci collezione esistente (opzionale - commentare se vuoi preservare dati esistenti)
            await model.deleteMany({});

            // Inserisci nuovi dati
            await model.insertMany(collectionData);

            console.log(`✅ ${name}: ${collectionData.length} records restored`);
            totalRestored += collectionData.length;
        } catch (error) {
            console.error(`❌ Error restoring ${name}:`, error.message);
        }
    }

    console.log(`✅ Restore completed!`);
    console.log(`📊 Total records restored: ${totalRestored}`);

    await mongoose.disconnect();
}

/**
 * Migrazione completa: backup + restore
 */
async function fullMigration() {
    console.log('🚀 Starting FULL MIGRATION: Test → Production');
    console.log('='.repeat(50));

    // Step 1: Backup
    const backupFile = await backupTestData();

    console.log('\n' + '='.repeat(50));

    // Step 2: Restore  
    await restoreToProduction(backupFile);

    console.log('\n' + '='.repeat(50));
    console.log('🎉 MIGRATION COMPLETED SUCCESSFULLY!');
}

/**
 * Lista backup disponibili
 */
async function listBackups() {
    try {
        const files = await fs.readdir(BACKUP_DIR);
        const backupFiles = files.filter(f => f.startsWith('backup-') && f.endsWith('.json'));

        console.log('📋 Available backups:');

        for (const file of backupFiles.sort().reverse()) {
            const filePath = path.join(BACKUP_DIR, file);
            const stats = await fs.stat(filePath);
            const size = (stats.size / 1024).toFixed(2);

            console.log(`  📁 ${file} (${size} KB) - ${stats.mtime.toLocaleString()}`);
        }

        return backupFiles;
    } catch (error) {
        console.log('📋 No backups found');
        return [];
    }
}

/**
 * Main function
 */
async function main() {
    const command = process.argv[2];

    try {
        switch (command) {
            case 'backup':
                await backupTestData();
                break;

            case 'restore':
                const backupFile = process.argv[3];
                if (!backupFile) {
                    console.log('❌ Please specify backup file');
                    console.log('Usage: npm run db:restore <backup-file>');
                    await listBackups();
                    process.exit(1);
                }
                await restoreToProduction(backupFile);
                break;

            case 'migrate':
                await fullMigration();
                break;

            case 'list':
                await listBackups();
                break;

            default:
                console.log('📖 USAGE:');
                console.log('  npm run db:backup     - Backup test database');
                console.log('  npm run db:restore <file> - Restore backup to production');
                console.log('  npm run db:migrate    - Full migration test→prod');
                console.log('  npm run db:list       - List available backups');
                break;
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// Esegui solo se chiamato direttamente
if (require.main === module) {
    main();
}

module.exports = {
    backupTestData,
    restoreToProduction,
    fullMigration,
    listBackups
};