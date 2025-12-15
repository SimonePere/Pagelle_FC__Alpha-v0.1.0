# Documentazione Controllers - Pagelle FC Backend

## Panoramica Architettura

I controller gestiscono la logica di business dell'applicazione, processando richieste HTTP e coordinando interazioni tra modelli, middleware e servizi esterni. Ogni controller è specializzato per una specifica area funzionale del sistema.

### Principi Architetturali

1. **Separation of Concerns**: Ogni controller gestisce una singola entità business
2. **Error Handling Centralizzato**: Gestione uniforme di errori con logging
3. **Validation Layer**: Validazione input prima della business logic
4. **Auto-completion Logic**: Sistema automatico per completamento votazioni
5. **Audit Trail**: Logging dettagliato per debugging e monitoraggio

---

## 🔐 AuthController

**File**: `src/controllers/authController.js`  
**Responsabilità**: Gestione autenticazione, registrazione utenti e session management

### Metodi Disponibili

#### `register(req, res)`
- **Scopo**: Registrazione nuovo utente con validazione e hashing password
- **Validazioni**: Email unica, campi obbligatori, format validation
- **Output**: JWT token + profilo utente
- **Security**: Password hashing con bcrypt (salt=10)

```javascript
// Input richiesto
{
  name: String,        // Required, trimmed
  email: String,       // Required, unique, lowercase
  password: String,    // Required, min 6 char
  birthdate: String    // Required, formato YYYY-MM-DD
}

// Output successo
{
  success: true,
  token: "JWT_TOKEN",
  user: {
    id: ObjectId,
    name: String,
    email: String,
    birthdate: String,
    teamIds: [],
    role: "player",
    profile: { position: "UTIL", preferredFoot: "right" }
  }
}
```

#### `login(req, res)`
- **Scopo**: Autenticazione utente esistente
- **Validazioni**: Email esistente, password corretta
- **Security**: Confronto password bcrypt, JWT generation
- **Logging**: Tentativi di login con outcome

```javascript
// Input richiesto
{
  email: String,    // Required, accetta email o username
  password: String  // Required
}

// Output successo - identico a register
```

#### `getMe(req, res)`
- **Scopo**: Recupero profilo utente corrente da JWT
- **Auth Required**: Sì (middleware auth)
- **Output**: Profilo completo senza password

---

## ⚽ MatchController

**File**: `src/controllers/matchController.js`  
**Responsabilità**: Gestione partite con auto-creazione VotingSession integrata

### Metodi Disponibili

#### `createMatch(req, res)`
- **Scopo**: Crea partita + auto-genera VotingSession per match rating
- **Validazioni**: Field, date obbligatori; playersCount enum [5,8,11]
- **Auto-Integration**: Collega automaticamente Match e VotingSession
- **Status**: Match creato in stato 'active'

```javascript
// Input richiesto
{
  teamId: String,              // Required
  field: String,               // Required, max 100 char
  date: String,                // Required, convertito a Date
  playersCount: Number,        // Required, enum [5,8,11], default 8
  notes: String,               // Optional, max 500 char
  teamMemberIds: [ObjectId]    // Optional, default [createdBy]
}

// Output successo
{
  success: true,
  message: "Match e sessione di votazione creati con successo!",
  match: {
    id: ObjectId,
    field: String,
    playersCount: Number,
    date: Date,
    status: "active",
    createdAt: Date
  },
  votingSession: {
    id: ObjectId,
    title: String,
    status: "active",
    type: "match_rating"
  }
}
```

#### `getTeamMatches(req, res)`
- **Scopo**: Recupera partite di un team con paginazione
- **Auth**: Verifica membership nel team
- **Populate**: User data per createdBy e teamMemberIds
- **Sorting**: Ordinamento per data descending
- **Debug**: Logging estensivo per troubleshooting frontend

```javascript
// Query parameters
{
  page: Number,     // Default 1
  limit: Number     // Default 10
}

// Output successo
{
  success: true,
  matches: [{
    id: ObjectId,
    field: String,
    date: Date,
    status: String,
    createdBy: { name: String },
    teamMemberIds: [{ name: String, profile: { position: String } }]
  }],
  pagination: {
    currentPage: Number,
    totalPages: Number,
    totalMatches: Number
  }
}
```

#### Altri Metodi Implementati
- `getMatch(req, res)` - Dettagli partita singola
- `activateMatch(req, res)` - Attivazione partita per votazione
- `completeMatch(req, res)` - Completamento partita

---

## 👥 TeamController

**File**: `src/controllers/teamController.js`  
**Responsabilità**: Gestione squadre, membership e invite system

### Metodi Disponibili

#### `createTeam(req, res)`
- **Scopo**: Crea nuova squadra con creatore come admin e membro
- **Validazioni**: Nome unico, lunghezza min 2 caratteri
- **Invite Code**: Generazione automatica codice univoco
- **Auto-Setup**: Creatore diventa admin e membro automaticamente

```javascript
// Input richiesto
{
  name: String,             // Required, min 2 char, max 50 char
  description: String,      // Optional, max 500 char
  settings: {
    isPrivate: Boolean,     // Default false
    maxMembers: Number,     // Default 25, min 5, max 50
    autoApprove: Boolean,   // Default true
    allowGuestVoting: Boolean // Default false
  }
}

// Output successo
{
  success: true,
  team: {
    id: ObjectId,
    name: String,
    description: String,
    inviteCode: String,     // 6-8 char uppercase
    createdBy: ObjectId,
    totalMembers: Number,
    settings: Object,
    stats: Object
  }
}
```

#### `getAllTeams(req, res)`
- **Scopo**: Lista squadre pubbliche con search e paginazione
- **Access**: Pubblico (no auth required)
- **Filtering**: Solo squadre non private e attive
- **Features**: Search by name, paginazione

```javascript
// Query parameters
{
  page: Number,        // Default 1
  limit: Number,       // Default 20
  search: String       // Optional search term
}
```

#### `joinTeam(req, res)`
- **Scopo**: Unione a squadra tramite invite code
- **Validazioni**: Codice esistente, limiti membri, non già membro
- **Auto-Approval**: Basato su settings.autoApprove

#### Altri Metodi Implementati
- `getMyTeams(req, res)` - Squadre dell'utente corrente
- `getTeam(req, res)` - Dettagli squadra specifica
- `leaveTeam(req, res)` - Abbandono squadra con cleanup

---

## 🗳️ VotingSessionController

**File**: `src/controllers/votingSessionController.js`  
**Responsabilità**: Gestione votazioni match rating con auto-completion logic

### Utility Functions

#### `checkAndAutoCompleteMatchVoting(sessionId)`
- **Scopo**: Auto-completa votazione quando tutti gli eligible voters hanno votato
- **Trigger**: Chiamata dopo ogni nuovo voto
- **Logic**: Conta submissions attive vs eligible voters
- **Outcome**: Chiamata automatica a completeVotingSession

### Metodi Principali

#### `createVotingSession(req, res)`
- **Scopo**: Crea nuova sessione di votazione per match rating
- **Type**: Fisso su 'match_rating'
- **Validazioni**: Match esistente, team esistente, membri eligibili

```javascript
// Input richiesto
{
  targetId: ObjectId,      // Required, riferimento a Match
  title: String,           // Optional, generato automaticamente se mancante
  description: String,     // Optional
  deadline: Date          // Optional
}

// Output successo
{
  success: true,
  votingSession: {
    id: ObjectId,
    type: "match_rating",
    targetId: ObjectId,
    title: String,
    status: "active",
    eligibleVoters: [ObjectId],
    createdAt: Date
  }
}
```

#### `submitVote(req, res)`
- **Scopo**: Invio voto per match rating con trasformazione dati
- **Data Transform**: Frontend object → Database array format
- **Badge Mapping**: Mappatura tipi badge frontend/database
- **Auto-Complete**: Trigger automatico controllo completamento

```javascript
// Input formato frontend
{
  vote: {
    playerRatings: {
      [playerId]: {
        rating: Number,        // 1-10, required
        goals: Number,         // ≥0, default 0
        assists: Number,       // ≥0, default 0
        comments: String,      // Optional
        badges: [String]       // Array badge types
      }
    },
    matchComments: String     // Optional overall comment
  },
  deviceInfo: Object,         // Optional tracking
  timeSpent: Number          // Optional, seconds
}

// Trasformazione interna per database
{
  voteData: {
    playerRatings: [{
      playerId: ObjectId,
      rating: Number,
      goals: Number,
      assists: Number,
      comment: String
    }],
    badges: [{
      playerId: ObjectId,
      badgeType: String
    }],
    overallComment: String
  }
}
```

#### Badge Mapping System
```javascript
const badgeMapping = {
  'gol_piu_bello': 'gol_bello',
  'muro_difensivo': 'difensore', 
  'uomo_partita': 'mvp',
  'goleador': 'goleador',
  'assist_man': 'assist_man',
  'maratoneta': 'maratoneta'
};
```

#### Altri Metodi Implementati
- `getUserVotingSessions(req, res)` - Sessioni utente con adaptation per frontend
- `getVotingSession(req, res)` - Dettagli sessione specifica
- `activateVotingSession(req, res)` - Attivazione sessione draft
- `getVotingCalculation(req, res)` - Calcolo risultati live
- `completeVotingSession(req, res)` - Completamento con salvataggio risultati
- `getSessionSubmissions(req, res)` - Lista voti individuali per audit

---

## 🎯 PlayerCardController

**File**: `src/controllers/PlayerCardController.js`  
**Responsabilità**: Gestione valutazioni FIFA-style player cards (abilità generali giocatori)

### Utility Functions

#### `checkAndAutoCompletePlayerCard(sessionId)`
- **Scopo**: Auto-completa player card quando tutti hanno valutato
- **Logic**: Simile a match voting ma per player card submissions
- **Trigger**: Dopo ogni nuova submission player card

### Metodi Principali

#### `createPlayerCardSession(req, res)`
- **Scopo**: Crea sessione per valutare abilità generali di un giocatore
- **Target**: Singolo giocatore (targetPlayerId)
- **Type**: 'player_card_rating'

```javascript
// Input richiesto
{
  targetPlayerId: ObjectId,   // Required, giocatore da valutare
  title: String,              // Optional
  description: String,        // Optional  
  deadline: Date,             // Optional
  teamId: ObjectId           // Optional, derivato da target player se mancante
}

// Output successo
{
  success: true,
  session: {
    id: ObjectId,
    type: "player_card_rating",
    targetPlayerId: ObjectId,
    title: String,
    status: "active",
    eligibleVoters: [ObjectId]
  }
}
```

#### `submitPlayerCardVote(req, res)`
- **Scopo**: Invio valutazione player card con attributi FIFA-style
- **Scale**: 10-100 per attributi principali, 1-5 per stars
- **Attributes**: 7 attributi core (tir, pas, dri, fin, vis, res, for)
- **Overall Calculation**: Media automatica dei 7 attributi core

```javascript
// Input richiesto
{
  vote: {
    attributes: {
      tir: Number,             // Required, 10-100 - Tiro
      pas: Number,             // Required, 10-100 - Passaggio  
      dri: Number,             // Required, 10-100 - Dribbling
      fin: Number,             // Required, 10-100 - Finalizzazione
      vis: Number,             // Required, 10-100 - Visione di gioco
      res: Number,             // Required, 10-100 - Resistenza
      for: Number              // Required, 10-100 - Forza
    },
    additionalAttributes: {
      piedeDebole: Number,     // Optional, 1-5 stelle
      skill: Number            // Optional, 1-5 stelle
    },
    playerProfile: {
      position: String         // Optional, enum posizioni
    },
    comment: String            // Optional, max 1000 char
  },
  timeSpent: Number,          // Optional
  deviceInfo: Object          // Optional
}

// Overall Rating Calculation
overallRating = Math.round((tir + pas + dri + fin + vis + res + for) / 7)
```

#### Altri Metodi Implementati
- `getUserPlayerCardSessions(req, res)` - Sessioni player card utente
- `getPlayerCardSession(req, res)` - Dettagli sessione player card
- `getPlayerCardCalculation(req, res)` - Calcolo risultati live aggregati
- `completePlayerCardSession(req, res)` - Completamento con PlayerCardResult
- `getPlayerCardResults(req, res)` - Storico valutazioni giocatore

---

## 🔧 Pattern Comuni e Best Practices

### Error Handling Pattern
```javascript
try {
  console.log('\n🔵 === OPERAZIONE ===');
  console.log('📥 Input:', input);
  
  // Business logic here
  
  console.log('✅ Successo');
  console.log('🔵 === FINE OPERAZIONE ===\n');
  
  res.status(200).json({ success: true, data });
  
} catch (error) {
  console.log('❌ ERRORE:', error.message);
  console.log('📋 Stack:', error.stack);
  console.log('🔵 === FINE OPERAZIONE (ERRORE) ===\n');
  
  res.status(500).json({ error: 'Server error message' });
}
```

### Validation Pattern
```javascript
// Input validation
if (!requiredField || !anotherRequired) {
  return res.status(400).json({
    error: 'Required fields missing'
  });
}

// Database validation  
const entity = await Model.findById(id);
if (!entity) {
  return res.status(404).json({ error: 'Entity not found' });
}

// Authorization validation
if (!entity.isMember(req.user.id)) {
  return res.status(403).json({ error: 'Access denied' });
}
```

### Logging Convention
- **🔵 Operazioni generiche**
- **🟢 Login/Auth** 
- **🟡 User operations**
- **⚽ Match operations**
- **🗳️ Voting operations**
- **🎯 Player card operations**
- **❌ Errori**
- **✅ Successi**
- **⚠️ Warning**

### Auto-Completion System
Entrambi i sistemi di votazione implementano logic di auto-completamento:

1. **Trigger**: Dopo ogni nuovo voto/submission
2. **Check**: Conta submissions attive vs eligible voters
3. **Auto-Complete**: Se 100% completion, chiama complete automatico
4. **Mock Request**: Riutilizza logica esistente tramite mock req/res

### Response Format Standard
```javascript
// Successo
{
  success: true,
  data: Object,          // Dati principali
  message: String,       // Messaggio opzionale
  pagination: Object     // Se applicabile
}

// Errore  
{
  error: String,         // Messaggio errore user-friendly
  details: Object        // Dettagli tecnici opzionali (dev only)
}
```

---

*Documentazione Controllers aggiornata al 14 dicembre 2025*  
*Versione API: v1.0*  
*Node.js Version: ^18.0*