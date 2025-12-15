# 🚀 GUIDA COMPLETA AL DEPLOYMENT CON MIGRAZIONE DATI

## 📋 PANORAMICA

Questa guida ti accompagna nel processo di deployment dell'applicazione **Pagelle FC**, includendo la migrazione completa dei dati dal database di test a quello di produzione.

## 🎯 FASI DEL DEPLOYMENT

### FASE 1: PREPARAZIONE PRE-DEPLOYMENT

#### 1.1 Verifica Environment Variables
Assicurati di avere configurato:

**Database di Test (.env):**
```bash
NODE_ENV=test
MONGODB_URI_TEST=mongodb+srv://username:password@cluster.mongodb.net/pagelle-fc-test
```

**Database di Produzione (.env):**
```bash
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/pagelle-fc-prod
JWT_SECRET=your-super-secret-production-key
CLIENT_URL_PROD=https://your-app.vercel.app
```

#### 1.2 Verifica Stato Database di Test
```bash
cd server
npm run test:env
```

Controlla che il server si connetta correttamente al database di test e che ci siano dati da migrare.

### FASE 2: MIGRAZIONE DATABASE

#### 2.1 Backup Completo dei Dati di Test
```bash
cd server
npm run db:backup
```

Questo comando:
- 🔗 Si connette al database di **test**
- 📦 Esporta **tutti** i dati delle seguenti collection:
  - Users (utenti registrati)
  - Teams (squadre)
  - Matches (partite create)
  - VotingSessions (sessioni di voto)
  - VoteSubmissions (voti inviati)
  - VoteResults (risultati delle votazioni)
  - PlayerCardSubmissions (pagelle inviate)
  - PlayerCardResults (risultati delle pagelle)
  - PlayerLeaderboardStats (statistiche giocatori)
  - MatchNotifications (notifiche)

- 💾 Salva tutto in un file `./db-backups/backup-[timestamp].json`

#### 2.2 Verifica Backup Creato
```bash
npm run db:list
```

Vedrai qualcosa come:
```
📋 Available backups:
  📁 backup-2025-12-15T10-30-45-123Z.json (1.2 MB) - 15/12/2025, 11:30:45
```

#### 2.3 Ripristino nel Database di Produzione

**Opzione A - Migrazione Automatica (Consigliata)**
```bash
npm run db:migrate
```

**Opzione B - Ripristino Manuale**
```bash
npm run db:restore db-backups/backup-[timestamp].json
```

⚠️ **ATTENZIONE**: Questo comando **sovrascrive** completamente il database di produzione!

### FASE 3: DEPLOYMENT APPLICAZIONE

#### 3.1 Deploy Backend (Render)

1. **Push del codice su GitHub** (incluso il nuovo script di migrazione)
2. **Configura Render**:
   - Build Command: `npm install`
   - Start Command: `npm start` 
   - Environment Variables:
     ```bash
     NODE_ENV=production
     MONGODB_URI=mongodb+srv://...pagelle-fc-prod
     JWT_SECRET=your-production-secret
     CLIENT_URL_PROD=https://your-app.vercel.app
     PORT=10000
     ```

3. **Deploy e Test**:
   ```bash
   curl https://your-api.onrender.com/api/health
   ```

#### 3.2 Deploy Frontend (Vercel)

1. **Configura Vercel**:
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Root Directory: `client`
   - Environment Variables:
     ```bash
     VITE_API_URL=https://your-api.onrender.com
     VITE_APP_ENV=prod
     ```

2. **Deploy e Test**: Verifica che l'app si connetta correttamente al backend

### FASE 4: VERIFICA POST-DEPLOYMENT

#### 4.1 Test Connessioni
- ✅ Health check: `https://your-api.onrender.com/api/health`
- ✅ Database connesso: Logs di Render mostrano "Connected to PROD database"
- ✅ Frontend raggiunge backend: Login/registrazione funzionanti

#### 4.2 Test Funzionalità con Dati Migrati
- ✅ **Login** con utenti esistenti dal test
- ✅ **Visualizzazione partite** migrate
- ✅ **Votazioni** funzionanti 
- ✅ **Player cards** con storico
- ✅ **Statistiche** preservate

## 🛠️ COMANDI UTILI

### Gestione Database
```bash
# Lista tutti i backup disponibili
npm run db:list

# Backup solo dati test (senza ripristino)
npm run db:backup

# Ripristina backup specifico in produzione
npm run db:restore db-backups/backup-2025-12-15T10-30-45-123Z.json

# Migrazione completa automatica
npm run db:migrate
```

### Test Ambiente
```bash
# Avvia server in modalità test
npm run test:env

# Avvia server in modalità produzione (locale)
npm run prod
```

## 🚨 PIANO DI EMERGENZA

### Se il deployment fallisce:

1. **Controlla logs Render/Vercel**
2. **Verifica environment variables**
3. **Testa health endpoint**
4. **Rollback temporaneo**:
   ```bash
   # Nel deployment di emergenza, puoi temporaneamente switchare al DB test
   NODE_ENV=test  # Usa il database di test come fallback
   ```

### Se la migrazione dati fallisce:

1. **I tuoi dati di test sono sempre al sicuro** nel database originale
2. **I backup sono salvati localmente** in `./db-backups/`
3. **Puoi ripetere la migrazione** quante volte necessario
4. **Zero downtime** sui dati di test

## 📊 RISULTATO FINALE

Dopo il deployment avrai:

- ✅ **Database di Produzione** con tutti i dati di test migrati
- ✅ **Utenti esistenti** possono fare login immediatamente  
- ✅ **Storico partite** preservato
- ✅ **Votazioni e statistiche** mantenute
- ✅ **Ambiente di test** ancora funzionante per sviluppi futuri

## 🔄 SVILUPPI FUTURI

**Database di Test**: Continua a usarlo per sviluppo
**Database di Produzione**: Solo per utenti reali
**Sincronizzazione**: Non necessaria, i due ambienti rimarranno separati

---

## 🚀 PRONTO PER IL DEPLOYMENT?

Segui i passi in ordine:

1. 📦 `npm run db:backup` 
2. 🚀 `npm run db:migrate`
3. 🌐 Deploy su Render + Vercel
4. ✅ Test completo

**Good luck! 🍀**