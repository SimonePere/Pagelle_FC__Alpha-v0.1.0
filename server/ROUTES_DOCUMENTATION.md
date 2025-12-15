# Documentazione Routes - Pagelle FC Backend

## Panoramica Sistema di Routing

L'architettura delle route segue il pattern RESTful con separazione chiara tra endpoint pubblici e privati. Ogni gruppo di route è specializzato per una specifica area funzionale del sistema, con middleware di autenticazione applicato strategicamente.

### Convenzioni Adottate

1. **Versioning**: Tutte le route utilizzano il prefisso `/api/v1/`
2. **RESTful Design**: Verbi HTTP appropriati per ogni operazione
3. **Auth Strategy**: Middleware `auth` applicato selettivamente
4. **Error Handling**: Gestione uniforme tramite controller
5. **Documentation**: Commenti JSDoc per ogni endpoint

---

## 🔐 Auth Routes

**File**: `src/routes/auth.js`  
**Base URL**: `/api/v1/auth`  
**Middleware**: Nessuno (endpoint pubblici di autenticazione)

### Endpoints Disponibili

| Metodo | Endpoint | Access | Descrizione |
|---------|----------|---------|-------------|
| `POST` | `/register` | 🌍 Pubblico | Registrazione nuovo utente |
| `POST` | `/login` | 🌍 Pubblico | Login utente esistente |
| `GET` | `/me` | 🔒 Privato | Profilo utente corrente |

#### POST `/register`
```javascript
// Input Body
{
  name: String,        // Required, max 50 char
  email: String,       // Required, unique, format email
  password: String,    // Required, min 6 char
  birthdate: String    // Required, format YYYY-MM-DD
}

// Response Success (201)
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

#### POST `/login`
```javascript
// Input Body
{
  email: String,       // Required, può essere email o username
  password: String     // Required
}

// Response Success (200) - Identica a register
```

#### GET `/me`
- **Auth Required**: ✅ Sì
- **Middleware**: `auth`
- **Scopo**: Recupera profilo utente dal JWT token

---

## ⚽ Match Routes

**File**: `src/routes/matches.js`  
**Base URL**: `/api/v1/matches`  
**Middleware**: `auth` applicato a TUTTI gli endpoint

### Endpoints Disponibili

| Metodo | Endpoint | Access | Descrizione |
|---------|----------|---------|-------------|
| `POST` | `/` | 🔒 Privato | Crea nuova partita + auto-voting |
| `GET` | `/team/:teamId` | 🔒 Privato | Lista partite team con paginazione |
| `GET` | `/:id` | 🔒 Privato | Dettagli partita specifica |
| `PATCH` | `/:id/activate` | 🔒 Privato | Attiva partita per votazione |
| `PATCH` | `/:id/complete` | 🔒 Privato | Completa partita |

#### POST `/`
- **Auto-Integration**: Crea simultaneamente Match + VotingSession
- **Validation**: Campo e data obbligatori
- **Default Status**: 'active' per permettere votazione immediata

```javascript
// Input Body
{
  teamId: String,              // Required
  field: String,               // Required, nome campo/location
  date: String,                // Required, ISO date string
  playersCount: Number,        // Required, enum [5,8,11]
  notes: String,               // Optional, max 500 char
  teamMemberIds: [ObjectId]    // Optional, default [req.user.id]
}

// Response Success (201)
{
  success: true,
  message: "Match e sessione di votazione creati con successo!",
  match: { /* dati match */ },
  votingSession: { /* dati voting session */ }
}
```

#### GET `/team/:teamId`
- **Pagination**: Query params `page`, `limit`
- **Sorting**: Data decrescente (più recenti primi)
- **Population**: User data per created by e team members
- **Access Control**: Verifica membership nel team

```javascript
// Query Parameters
?page=1&limit=10

// Response Success (200)
{
  success: true,
  matches: [{
    id: ObjectId,
    field: String,
    date: Date,
    status: String,
    createdBy: { name: String },
    teamMemberIds: [{ name: String, profile: { position: String } }],
    finalResults: Object
  }],
  pagination: {
    currentPage: Number,
    totalPages: Number,
    totalMatches: Number
  }
}
```

---

## 👥 Team Routes

**File**: `src/routes/teams.js`  
**Base URL**: `/api/v1/teams`  
**Middleware**: Mix pubblico/privato

### Endpoints Disponibili

| Metodo | Endpoint | Access | Descrizione |
|---------|----------|---------|-------------|
| `GET` | `/` | 🌍 Pubblico | Lista squadre pubbliche |
| `POST` | `/` | 🔒 Privato | Crea nuova squadra |
| `GET` | `/my-teams` | 🔒 Privato | Squadre dell'utente |
| `POST` | `/join` | 🔒 Privato | Unisciti con invite code |
| `GET` | `/:id` | 🔒 Privato | Dettagli squadra |
| `DELETE` | `/:id/leave` | 🔒 Privato | Abbandona squadra |

#### GET `/` (Pubblico)
- **Access**: Nessuna autenticazione richiesta
- **Filtering**: Solo squadre pubbliche (isPrivate ≠ true)
- **Features**: Search e paginazione
- **Use Case**: Scoperta squadre per nuovi utenti

```javascript
// Query Parameters
?page=1&limit=20&search=nome_squadra

// Response Success (200)
{
  success: true,
  teams: [{
    id: ObjectId,
    name: String,
    description: String,
    totalMembers: Number,
    isPrivate: Boolean,
    stats: {
      totalMatches: Number,
      wins: Number,
      // ...
    }
  }],
  pagination: { /* ... */ }
}
```

#### POST `/`
- **Auto-Setup**: Creatore diventa admin e primo membro
- **Invite Code**: Generazione automatica codice univoco 6-8 caratteri
- **Team Update**: Aggiunge teamId al profilo utente

```javascript
// Input Body  
{
  name: String,           // Required, min 2 char, unique
  description: String,    // Optional, max 500 char
  settings: {
    isPrivate: Boolean,         // Default false
    maxMembers: Number,         // Default 25, range 5-50
    autoApprove: Boolean,       // Default true
    allowGuestVoting: Boolean   // Default false
  }
}

// Response Success (201)
{
  success: true,
  team: {
    id: ObjectId,
    name: String,
    inviteCode: String,    // Generated unique code
    totalMembers: 1,       // Creator as first member
    settings: Object
  }
}
```

#### POST `/join`
- **Invite System**: Join tramite invite code
- **Validations**: Codice esistente, limite membri, no duplicati
- **Auto-Approval**: Basato su team settings

```javascript
// Input Body
{
  inviteCode: String     // Required, 6-8 char uppercase
}

// Response Success (200)
{
  success: true,
  message: "Successfully joined team",
  team: { /* team data */ }
}
```

---

## 🗳️ Voting Session Routes

**File**: `src/routes/votingSessions.js`  
**Base URL**: `/api/v1/voting-sessions`  
**Middleware**: `auth` applicato a TUTTI gli endpoint

### Endpoints Disponibili

| Metodo | Endpoint | Access | Descrizione |
|---------|----------|---------|-------------|
| `POST` | `/` | 🔒 Privato | Crea sessione match rating |
| `GET` | `/` | 🔒 Privato | Lista sessioni utente |
| `GET` | `/:id` | 🔒 Privato | Dettagli sessione specifica |
| `POST` | `/:id/vote` | 🔒 Privato | Invia voto match rating |
| `PATCH` | `/:id/activate` | 🔒 Privato | Attiva sessione draft |
| `GET` | `/:id/calculation` | 🔒 Privato | Risultati live votazione |
| `POST` | `/:id/complete` | 🔒 Privato | Completa sessione |
| `GET` | `/:id/submissions` | 🔒 Privato | Lista voti individuali |

#### POST `/`
- **Type**: Fisso su 'match_rating'
- **Integration**: Collegamento con Match esistente
- **Auto-Setup**: Eligible voters da team members

```javascript
// Input Body
{
  targetId: ObjectId,      // Required, riferimento Match
  title: String,           // Optional, generato se mancante
  description: String,     // Optional
  deadline: Date          // Optional
}

// Response Success (201)
{
  success: true,
  votingSession: {
    id: ObjectId,
    type: "match_rating",
    targetId: ObjectId,
    status: "active",
    eligibleVoters: [ObjectId]
  }
}
```

#### POST `/:id/vote`
- **Data Transform**: Frontend format → Database format
- **Validation**: Ratings 1-10, no duplicates
- **Auto-Complete**: Trigger controllo completamento automatico

```javascript
// Input Body - Formato Frontend
{
  vote: {
    playerRatings: {
      [playerId]: {
        rating: Number,        // 1-10, required  
        goals: Number,         // ≥0, default 0
        assists: Number,       // ≥0, default 0
        comments: String,      // Optional
        badges: [String]       // Badge types array
      }
    },
    matchComments: String     // Optional overall comment
  },
  timeSpent: Number,          // Optional, seconds
  deviceInfo: Object          // Optional metadata
}

// Response Success (201)  
{
  success: true,
  message: "Vote submitted successfully",
  autoCompleted: Boolean,     // True se tutti hanno votato
  votingSession: { /* updated session data */ }
}
```

#### GET `/:id/calculation`
- **Live Results**: Calcolo risultati real-time senza salvare
- **Aggregation**: Media ratings, somma goals/assists, badge count
- **Access Control**: Solo eligible voters possono vedere

```javascript
// Response Success (200)
{
  success: true,
  calculation: {
    playerResults: {
      [playerId]: {
        averageRating: Number,
        goals: Number,
        assists: Number,
        voteCount: Number,
        badges: [String]
      }
    },
    summary: {
      totalVotes: Number,
      overallAverage: Number,
      participationRate: Number
    }
  }
}
```

---

## 🎯 Player Card Routes

**File**: `src/routes/playerCards.js`  
**Base URL**: `/api/v1/player-cards`  
**Middleware**: `auth` applicato a TUTTI gli endpoint

### Endpoints Disponibili

| Metodo | Endpoint | Access | Descrizione |
|---------|----------|---------|-------------|
| `POST` | `/sessions` | 🔒 Privato | Crea sessione player card |
| `GET` | `/sessions` | 🔒 Privato | Lista sessioni player card |
| `GET` | `/sessions/:id` | 🔒 Privato | Dettagli sessione player card |
| `POST` | `/sessions/:id/vote` | 🔒 Privato | Invia valutazione player |
| `GET` | `/sessions/:id/calculation` | 🔒 Privato | Risultati live aggregati |
| `POST` | `/sessions/:id/complete` | 🔒 Privato | Completa sessione |
| `GET` | `/results/user/:userId` | 🔒 Privato | Storico valutazioni utente |

#### POST `/sessions`
- **Target**: Singolo giocatore (targetPlayerId)
- **Type**: 'player_card_rating'
- **Team Detection**: Auto-derivato da target player se non specificato

```javascript
// Input Body
{
  targetPlayerId: ObjectId,   // Required, giocatore da valutare
  title: String,              // Optional
  description: String,        // Optional
  deadline: Date,             // Optional
  teamId: ObjectId           // Optional, auto-derivato se mancante
}

// Response Success (201)
{
  success: true,
  session: {
    id: ObjectId,
    type: "player_card_rating",
    targetPlayerId: ObjectId,
    status: "active",
    eligibleVoters: [ObjectId]
  }
}
```

#### POST `/sessions/:id/vote`
- **Scale**: 10-100 per attributi core, 1-5 per stars
- **Attributes**: 7 core + additional (piedeDebole, skill)
- **Overall Auto-Calc**: Media automatica attributi core

```javascript
// Input Body
{
  vote: {
    attributes: {
      tir: Number,             // 10-100, Tiro
      pas: Number,             // 10-100, Passaggio
      dri: Number,             // 10-100, Dribbling  
      fin: Number,             // 10-100, Finalizzazione
      vis: Number,             // 10-100, Visione
      res: Number,             // 10-100, Resistenza
      for: Number              // 10-100, Forza
    },
    additionalAttributes: {
      piedeDebole: Number,     // 1-5 stelle, optional
      skill: Number            // 1-5 stelle, optional
    },
    playerProfile: {
      position: String         // Enum posizioni, optional
    },
    comment: String            // Max 1000 char, optional
  },
  timeSpent: Number,          // Optional
  deviceInfo: Object          // Optional
}

// Response Success (201)
{
  success: true,
  message: "Player card vote submitted",
  overallRating: Number,      // Calculated average
  autoCompleted: Boolean      // True se tutti hanno votato
}
```

#### GET `/results/user/:userId`
- **Access Control**: Solo team members possono vedere
- **Aggregation**: Storico tutte le valutazioni player card
- **Sorting**: Per data decrescente

```javascript
// Query Parameters
?limit=10

// Response Success (200)
{
  success: true,
  results: [{
    id: ObjectId,
    targetPlayerId: ObjectId,
    finalOverallRating: Number,
    finalAttributes: {
      tir: Number,
      pas: Number,
      // ... tutti gli attributi
    },
    sessionMetadata: {
      totalVoters: Number,
      calculatedAt: Date
    }
  }]
}
```

---

## 👤 User Routes

**File**: `src/routes/users.js`  
**Base URL**: `/api/v1/users`  
**Middleware**: `auth` applicato a TUTTI gli endpoint  
**Status**: 🚧 In Sviluppo (placeholder endpoints)

### Endpoints Pianificati

| Metodo | Endpoint | Access | Descrizione | Status |
|---------|----------|---------|-------------|---------|
| `GET` | `/team/:teamId` | 🔒 Privato | Lista membri team | 🚧 TODO |
| `GET` | `/:id/stats` | 🔒 Privato | Statistiche utente | 🚧 TODO |

Attualmente implementati come placeholder con response `{ message: "TODO" }`.

---

## 🛡️ Middleware e Security

### Auth Middleware
- **File**: `src/middleware/auth.js`
- **Functionality**: JWT token validation
- **Header**: `Authorization: Bearer <token>`
- **Context**: Aggiunge `req.user` con dati utente decodificati

### Error Handling
- **Pattern**: Gestione uniforme nei controller
- **Status Codes**: Standard HTTP (400, 401, 403, 404, 500)
- **Response Format**: `{ error: "User-friendly message" }`

### Access Control Patterns

#### Membership Verification
```javascript
const team = await Team.findById(teamId);
if (!team.isMember(req.user.id)) {
  return res.status(403).json({ error: 'Access denied' });
}
```

#### Eligible Voter Verification
```javascript
if (!votingSession.eligibleVoters.includes(req.user.id)) {
  return res.status(403).json({ error: 'Not authorized to vote' });
}
```

---

## 📊 Route Usage Patterns

### Paginazione Standard
```javascript
const page = parseInt(req.query.page) || 1;
const limit = parseInt(req.query.limit) || 10;
const skip = (page - 1) * limit;

// Response con metadata pagination
{
  data: [...],
  pagination: {
    currentPage: page,
    totalPages: Math.ceil(total / limit),
    total: total,
    hasNext: page < totalPages,
    hasPrev: page > 1
  }
}
```

### Search Pattern
```javascript
const search = req.query.search || '';
const query = search ? {
  name: { $regex: search, $options: 'i' }
} : {};
```

### Population Standard
```javascript
.populate('createdBy', 'name email')
.populate('memberIds', 'name profile.position')
.populate('targetId', 'field date venue')
```

---

## 🔄 Integration Patterns

### Match + VotingSession Integration
1. **POST** `/api/v1/matches` → Crea Match + auto-VotingSession
2. **GET** `/api/v1/voting-sessions` → Lista sessioni incluse auto-generate
3. **POST** `/api/v1/voting-sessions/:id/vote` → Voto con auto-complete logic

### Team Membership Flow
1. **GET** `/api/v1/teams` (pubblico) → Scopri squadre
2. **POST** `/api/v1/teams/join` → Unisciti con invite code
3. **GET** `/api/v1/teams/my-teams` → Verifica membership
4. **POST** `/api/v1/matches` → Crea partite per il team

### Voting Lifecycle
1. **POST** `/api/v1/voting-sessions` → Crea sessione
2. **GET** `/api/v1/voting-sessions/:id` → Dettagli per frontend
3. **POST** `/api/v1/voting-sessions/:id/vote` → Invio voti
4. **GET** `/api/v1/voting-sessions/:id/calculation` → Risultati live
5. **POST** `/api/v1/voting-sessions/:id/complete` → Salva risultati finali

---

*Documentazione Routes aggiornata al 14 dicembre 2025*  
*Versione API: v1.0*  
*Express.js Version: ^4.18*