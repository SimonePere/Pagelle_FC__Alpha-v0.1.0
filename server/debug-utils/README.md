# 🛠️ DEBUG UTILITIES per PAGELLE FC

Questa cartella contiene script di utility per il debugging e la manutenzione del sistema PlayerCard.

## 📁 Files Disponibili

### 🔧 `fix-missing-stars.js`
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