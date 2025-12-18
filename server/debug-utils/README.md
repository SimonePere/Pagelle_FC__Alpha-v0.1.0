# 🧰 DEBUG UTILITIES

Scripts di debug e utility per lo sviluppo.

## 📋 COPY PROD DATA (⭐ SEMPLICE)

**Il metodo più semplice per testare con dati reali:**

```bash
cd server
node debug-utils/copy-prod-data.js
```

**Cosa fa:**
- Copia TUTTO dalla produzione al test
- Backup automatico del test
- Verifica che tutto sia ok
- Zero configurazioni, zero casino

**Quando usarlo:**
- Vuoi testare qualcosa con dati reali
- Ogni tanto per allineare il test
- Prima di sviluppi importanti

---

## 🔧 ALTRI SCRIPT

### Player Stats & Data
- `player-stats-summary.js` - Riassunto statistiche giocatori
- `check-player-submissions.js` - Controllo submissions
- `add-missing-davide.js` - Fix per dati mancanti Davide

### Fix & Repair
- `correct-six-data.js` - Correzione dati SIX
- `fix-davide-swap.js` - Fix swap Davide
- `fix-missing-stars.js` - Fix stelle mancanti

### Testing & Verification  
- `check-six-raw-data.js` - Verifica dati SIX
- `test-api-response.js` - Test API response
- `check-davide-data-fixed.js` - Verifica fix Davide

### Leaderboard
- `regenerate-leaderboard-cache.js` - Rigenera cache

---

## 💡 QUICK START

**Per sviluppare con dati reali:**

1. **Copia i dati:** `node debug-utils/copy-prod-data.js`
2. **Sviluppa:** Il tuo server locale userà il database test
3. **Test:** Tutti i tuoi test non toccano la produzione
4. **Repeat:** Quando vuoi dati aggiornati, ricopia

**Zero stress, zero rischi!** 🎯

## 📁 Files Disponibili

### � `clone-prod-to-test.js`
**Script per clonare completamente il database di produzione in quello di test**

```bash
# Utilizzo
cd server
node debug-utils/clone-prod-to-test.js
```

**Cosa fa:**
- Backup automatico del database test attuale
- Elimina completamente il database test
- Copia TUTTE le collection dal database di produzione
- Verifica integrità dei dati copiati
- Backup automatico per rollback

**Quando usare:**
- Prima di testare modifiche con dati reali
- Per avere un ambiente test identico alla produzione
- Per testare script di migrazione in sicurezza

---

### 🔙 `restore-backup.js`
**Script per ripristinare backup del database**

```bash
# Mostra backup disponibili
cd server
node debug-utils/restore-backup.js

# Ripristina backup specifico
node debug-utils/restore-backup.js test-db-backup-2025-12-18T10-30-00-000Z.json
```

**Cosa fa:**
- Lista tutti i backup disponibili
- Ripristina backup completi multi-collection
- Verifica integrità dopo il ripristino
- Supporta sia backup completi che parziali

**Quando usare:**
- Dopo aver fatto un errore nel database test
- Per tornare a uno stato precedente noto
- Come rollback di emergenza

---

### 🔄 `switch-db.js`
**Script per switchare rapidamente tra database produzione e test**

```bash
# Mostra database attuale
cd server
node debug-utils/switch-db.js

# Switch to production
node debug-utils/switch-db.js prod

# Switch to test  
node debug-utils/switch-db.js test
```

**Cosa fa:**
- Mostra quale database è attualmente configurato
- Modifica automaticamente il file .env
- Backup del .env precedente
- Istruzioni per riavviare il server

**Quando usare:**
- Per testare in locale con dati reali (test DB)
- Per tornare rapidamente alla produzione
- Durante sviluppo per alternare ambienti

---

### �🔧 `fix-missing-stars.js`
**Script di migrazione per aggiungere stelle mancanti ai PlayerCardResult**

```bash
# Utilizzo
cd server
node debug-utils/fix-missing-stars.js
```

**Cosa fa:**
- Trova tutti i PlayerCardResult senza `finalAdditionalAttributes`
- Calcola le stelle mancanti dalle submissions esistenti
- Aggiorna i record con le medie calcolate
- Non modifica le submissions originali

**Quando usare:**
- Dopo aver aggiornato il backend per salvare le stelle
- Per riparare dati esistenti senza rifare le votazioni
- Quando PlayerCardResult esistono ma sono incompleti

---

### 🔍 `check-player-submissions.js`
**Script di analisi dettagliata delle submissions per debug**

```bash
# Utilizzo base
cd server
node debug-utils/check-player-submissions.js

# Per vedere solo la lista di tutti i giocatori
node debug-utils/check-player-submissions.js --list
```

**Cosa fa:**
- Mostra tutti i PlayerCardResult con i loro ID
- Analizza le submissions di un giocatore specifico
- Calcola manualmente le medie step-by-step
- Confronta i risultati con il database

**Personalizzazione:**
Modifica la variabile `TARGET_PLAYER_ID` nel file per analizzare un giocatore diverso.

**Quando usare:**
- Per verificare calcoli che sembrano incorretti
- Per debuggare problemi con le stelle
- Per controllare i voti ricevuti da un giocatore

---

## 🚀 Setup Rapido

### **Workflow Tipico per Testing:**

```bash
cd server

# 1. Controlla database attuale
node debug-utils/switch-db.js

# 2. Se sei in prod, switch a test
node debug-utils/switch-db.js test

# 3. Clona produzione nel test  
node debug-utils/clone-prod-to-test.js

# 4. Riavvia server per usare DB test
npm restart  # o riavvia manualmente

# 5. Testa modifiche con dati reali in sicurezza
# ... fai i tuoi test ...

# 6. Torna alla produzione quando finito
node debug-utils/switch-db.js prod
npm restart
```

### **Setup Iniziale:**

1. **Assicurati di essere nella cartella server:**
   ```bash
   cd server
   ```

2. **Verifica che le variabili d'ambiente siano configurate:**
   - File `.env` presente nella cartella `server/`
   - `MONGODB_URI` configurato correttamente

3. **Esegui gli script:**
   ```bash
   # Per migrare stelle mancanti
   node debug-utils/fix-missing-stars.js
   
   # Per analizzare un giocatore specifico
   node debug-utils/check-player-submissions.js
   ```

## 📊 Output di Esempio

### fix-missing-stars.js
```
🔧 === INIZIO MIGRAZIONE STELLE ===
🔍 Database connesso: Pagelle-FC-prod
📊 Trovati 4 PlayerCardResult senza stelle
🔍 Processando PlayerCardResult: 69406c04...
   Stelle calcolate: { skill: 4, piedeDebole: 5 }
   ✅ PlayerCardResult aggiornato con successo!
🎉 === MIGRAZIONE COMPLETATA ===
📊 PlayerCardResult aggiornati: 4/4
```

### check-player-submissions.js
```
🔍 ANALISI SUBMISSIONS PER PLAYER: 693550234608b6bba35e9bc9
1. Voter ID: 6932f50d...
   Piede Debole: 1 stelle
   Skill: 4 stelle
🧮 CALCOLO MANUALE DELLE MEDIE:
Piede Debole votes: [1, 2, 1, 1]
Piede Debole media: 5 ÷ 4 = 1.25
🎯 RISULTATO FINALE:
Piede Debole arrotondato: 1 stelle
✅ I calcoli corrispondono!
```

## ⚠️ Note di Sicurezza

- **NON eseguire su database di produzione** senza backup
- Gli script sono **idempotenti**: è sicuro eseguirli più volte
- Verificare sempre l'output prima di procedere con operazioni massive
- In caso di dubbi, testare prima su database di sviluppo

## 🐛 Troubleshooting

### Errore di connessione MongoDB
```bash
❌ Errore connessione MongoDB: The `uri` parameter to `openUri()` must be a string
```
**Soluzione:** Verifica che `.env` contenga `MONGODB_URI` valido

### Schema non registrato
```bash
❌ Errore: MissingSchemaError: Schema hasn't been registered for model "User"
```
**Soluzione:** Script corretto, errore ignorabile se non usa populate

### Nessun record trovato
```bash
📊 Trovati 0 PlayerCardResult senza stelle
```
**Soluzioni:**
- Verifica di essere connesso al database corretto
- Controlla che esistano PlayerCardResult nel database
- Usa `--list` per vedere cosa c'è nel database

---

🎯 **Tip:** Esegui sempre `check-player-submissions.js` prima di `fix-missing-stars.js` per capire lo stato attuale dei dati!