# 📊 Guida Completa - Importazione Dati in Massa

*Sistema di importazione dati storici per Pagelle FC Backend*  
*Data creazione: 15 dicembre 2025*

---

## 🎯 Panoramica

Questa guida documenta il processo completo per importare dati storici di partite saltando il sistema di votazione e inserendo direttamente i risultati finali nel database.

### Quando utilizzare questo metodo:
- ✅ Dati storici già aggregati (voti definitivi)
- ✅ Import iniziale del sistema 
- ✅ Migrazione da altri sistemi
- ✅ Backup/Restore di dati

---

## 📁 Struttura File Necessari

### 1. **bulk-data.json** - Dati di input
```json
{
  "teamId": "ID_TEAM_MONGODB",
  "teamName": "Nome Team",
  "players": {
    "NOME_GIOCATORE_1": "MONGODB_USER_ID_1",
    "NOME_GIOCATORE_2": "MONGODB_USER_ID_2"
  },
  "matches": [
    {
      "date": "YYYY-MM-DD",
      "matchNumber": 1,
      "playerData": {
        "NOME_GIOCATORE": {
          "gol": 0,
          "assist": 0, 
          "voto": 6.5,
          "note": "Infortunato" // Opzionale, se voto = 0
        }
      }
    }
  ]
}
```

### 2. **bulk-insert.js** - Script di inserimento
**Funzionalità:**
- Connessione database (test/prod)
- Validazione giocatori esistenti
- Creazione Match + VotingSession + VoteResult
- Gestione infortuni automatica
- Aggiornamento classifiche via hook

**Modelli richiesti:**
```javascript
const Match = require('./src/models/Match');
const VotingSession = require('./src/models/VotingSession'); 
const VoteResult = require('./src/models/VoteResult');
const User = require('./src/models/User');
const Team = require('./src/models/Team'); // IMPORTANTE per hook
const PlayerLeaderboardStats = require('./src/models/PlayerLeaderboardStats');
```

### 3. **cleanup-bulk.js** - Script di pulizia
**Funzionalità:**
- Rimozione completa dati inseriti
- Pulizia sicura (solo ambiente test/dev)
- Reset classifiche

### 4. **check-db.js** - Script di verifica
**Funzionalità:**
- Controllo stato database
- Conteggio documenti
- Visualizzazione classifiche

---

## 🔧 Processo di Importazione Completo

### **FASE 1: Preparazione Dati**

1. **Raccogli informazioni database:**
   ```javascript
   // Query MongoDB Compass
   db.users.find({name: {$in: ["GIOCATORE1", "GIOCATORE2"]}}, {_id: 1, name: 1})
   db.teams.find({}, {_id: 1, name: 1})
   ```

2. **Crea bulk-data.json** con struttura corretta

3. **Verifica ambiente database:**
   ```bash
   # Test: NODE_ENV=test usa MONGODB_URI_TEST  
   # Prod: NODE_ENV=production usa MONGODB_URI
   ```

### **FASE 2: Esecuzione Import**

1. **Ferma il backend** (evita conflitti MongoDB)

2. **Esegui importazione:**
   ```bash
   # Per database di test
   $env:NODE_ENV="test"; node bulk-insert.js
   
   # Per database di produzione (ATTENZIONE!)
   $env:NODE_ENV="production"; node bulk-insert.js
   ```

3. **Verifica risultati:**
   ```bash
   $env:NODE_ENV="test"; node check-db.js
   ```

### **FASE 3: Correzioni Post-Import**

Se necessarie correzioni (es. gestione infortuni):

1. **Correggi partecipanti Match:**
   ```bash
   $env:NODE_ENV="test"; node fix-participants.js
   ```

2. **Correggi VoteResults:**
   ```bash
   $env:NODE_ENV="test"; node fix-voteresults.js
   ```

### **FASE 4: Verifica e Avvio**

1. **Riavvia backend:**
   ```bash
   npm run test:env  # o npm start per prod
   ```

2. **Testa API classifiche**

3. **Verifica frontend** - coerenza dati

---

## ⚠️ Gestione Casi Speciali

### **Giocatori Infortunati/Assenti**
```json
{
  "playerData": {
    "GIOCATORE_INFORTUNATO": {
      "gol": 0,
      "assist": 0,
      "voto": 0,           // IMPORTANTE: voto = 0 
      "note": "Infortunato" // Viene saltato automaticamente
    }
  }
}
```

### **Correzione Errori Post-Import**
- **Match.teamMemberIds** ≠ **VoteResult.matchRatingResults**
- Usare script di correzione separati per allineare

### **Ambiente Database**
```javascript
// Nel connectDB di tutti gli script
const nodeEnv = process.env.NODE_ENV?.trim();
const mongoUri = nodeEnv === 'test' 
    ? process.env.MONGODB_URI_TEST 
    : process.env.MONGODB_URI;
```

---

## 📊 Struttura Dati Risultante

### **Match Document:**
```javascript
{
  _id: ObjectId,
  createdBy: ObjectId,
  teamId: String,
  field: "Campo Partita N",
  playersCount: 8,
  date: Date,
  teamMemberIds: [ObjectId], // Solo giocatori che hanno giocato
  status: "completed"
}
```

### **VoteResult Document:**
```javascript
{
  _id: ObjectId,
  votingSessionId: ObjectId,
  matchRatingResults: Map {
    "playerId": {
      averageRating: Number,
      goals: Number,
      assists: Number,
      voteCount: Number,
      badges: [String]
    }
  },
  statistics: {
    overallAverageRating: Number,
    totalGoalsReported: Number,
    totalAssistsReported: Number
  }
}
```

### **PlayerLeaderboardStats (auto-aggiornato):**
```javascript
{
  _id: ObjectId,
  playerId: ObjectId,
  teamId: ObjectId, 
  playerName: String,
  totalMatches: Number,
  totalGoals: Number,
  totalAssists: Number,
  averageRating: Number,
  recentForm: [Number]
}
```

---

## 🔄 Comandi di Riferimento

```bash
# === IMPORT COMPLETO ===
$env:NODE_ENV="test"; node bulk-insert.js

# === VERIFICA STATO ===
$env:NODE_ENV="test"; node check-db.js

# === CORREZIONI ===
$env:NODE_ENV="test"; node fix-participants.js
$env:NODE_ENV="test"; node fix-voteresults.js

# === PULIZIA COMPLETA ===
$env:NODE_ENV="test"; node cleanup-bulk.js

# === RIAVVIO BACKEND ===
npm run test:env        # Test environment
npm start              # Production environment
```

---

## 💡 Best Practices

1. **Sempre testare prima in ambiente test**
2. **Backup database prima di import produzione**
3. **Validare coerenza dati post-import**
4. **Fermare backend durante import**
5. **Importare tutti i modelli necessari negli script**
6. **Gestire correttamente le variabili NODE_ENV**
7. **Verificare hook post-save funzionino correttamente**

---

## 🛠️ Troubleshooting

### Errore "Schema not registered"
```javascript
// Assicurarsi di importare TUTTI i modelli
const Team = require('./src/models/Team'); 
```

### Ambiente database sbagliato
```javascript
// Verificare NODE_ENV
console.log(`🔍 NODE_ENV: "${process.env.NODE_ENV}"`);
```

### Classifiche non aggiornate
- Controllare hook post-save in VoteResult.js
- Verificare PlayerLeaderboardStats model importato

### Rate limiting problemi
- Aumentare limite in src/app.js
- Disabilitare per development/test

---

*Fine documentazione - Sistema testato e funzionante dicembre 2025*