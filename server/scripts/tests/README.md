# 🧪 SERVICE TESTS

Test automatizzati per tutti i servizi del backend dopo il refactoring service layer.

## 📁 Struttura Test

```
scripts/tests/
├── test-auth-service.js        ✅ AuthService (DISPONIBILE)
├── test-voting-service.js      ⏳ VotingService (DA CREARE)
├── test-match-service.js       ⏳ MatchService (DA CREARE) 
├── test-playercard-service.js  ⏳ PlayerCardService (DA CREARE)
├── test-team-service.js        ⏳ TeamService (DA CREARE)
├── test-leaderboard-service.js ⏳ LeaderboardService (DA CREARE)
└── run-all-tests.js           🚀 Master test runner
```

## 🚀 Come Eseguire i Test

### Test Singolo Servizio

```bash
# Test AuthService (già disponibile)
node scripts/tests/test-auth-service.js

# Test altri servizi (dopo il refactoring)
node scripts/tests/test-voting-service.js
node scripts/tests/test-match-service.js
node scripts/tests/test-playercard-service.js
node scripts/tests/test-team-service.js
node scripts/tests/test-leaderboard-service.js
```

### Tutti i Test

```bash
# Esegue tutti i test disponibili
node scripts/tests/run-all-tests.js
```

## 📋 Test Coverage per Servizio

### ✅ AuthService
- Input validation (registration/login)
- Password hashing e verification
- JWT token generation
- User exists check
- User registration flow
- User login flow  
- User profile retrieval con stats

### ⏳ VotingService (Future)
- Vote input validation
- Voting session creation
- Vote submission
- Auto-completion logic
- Results calculation
- Session completion

### ⏳ MatchService (Future)
- Match input validation
- Match creation
- Auto voting session creation
- Match status updates
- Match results update
- Team matches retrieval

### ⏳ PlayerCardService (Future)
- Player card input validation
- Player card session creation
- Player card submission
- Auto-completion check
- Results calculation
- Session completion
- Player card history

### ⏳ TeamService (Future)
- Team input validation
- Team creation
- Invite code generation
- Join by invite code
- Member management
- Team stats calculation
- User teams retrieval

### ⏳ LeaderboardService (Future)
- Rating leaderboard
- Goals leaderboard
- Assists leaderboard
- Player card leaderboard
- Form leaderboard
- All leaderboards aggregated
- Player stats update
- Team rankings calculation

## 🛠️ Requisiti

- Node.js
- MongoDB connection (usa MONGODB_URI dal .env)
- Tutti i model importati correttamente
- Service layer implementato per ogni test

## 📊 Output Test

Ogni test mostra:
- ✅ PASS: Test passato con successo
- ❌ FAIL: Test fallito con messaggio errore
- ⚠️ SKIPPED: Test saltato (service non ancora creato)

## 🧹 Cleanup Automatico

Tutti i test:
- Creano dati temporanei per il test
- Puliscono automaticamente i dati alla fine
- Non lasciano tracce nel database

## 📝 Note

1. **Database**: I test usano il database di produzione ma creano/cancellano dati temporanei
2. **Isolation**: Ogni test è isolato e non dipende da altri test
3. **Modularity**: Ogni test può essere eseguito singolarmente
4. **Future-proof**: I test per i servizi futuri sono già preparati

## 🎯 Uso durante Refactoring

1. **Prima del refactoring**: Alcuni test falliranno (service non esiste)
2. **Durante il refactoring**: Implementa il service, poi esegui il test
3. **Dopo il refactoring**: Tutti i test dovrebbero passare
4. **Continuous**: Esegui i test dopo ogni modifica significativa

## 💡 Tips

- Esegui sempre il test dopo aver creato un nuovo service
- Se un test fallisce, controlla l'implementazione del service  
- Usa `run-all-tests.js` per verificare che tutto funzioni insieme
- I test sono anche documentazione dei metodi del service