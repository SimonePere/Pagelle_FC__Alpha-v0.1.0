# Documentazione Schemi Database - Pagelle FC Backend

## Panoramica Sistema

Il database di Pagelle FC è progettato per gestire un sistema completo di votazioni calcistiche con due tipologie principali:

1. **Match Rating**: Valutazione delle prestazioni dei giocatori in partite specifiche (scale 1-10)
2. **Player Card Rating**: Valutazione delle abilità generali del giocatore (scale 10-100, FIFA-style)

### Architettura del Sistema

Il sistema utilizza un'architettura a microservizi con separazione delle responsabilità tra:
- **Entità Master**: User, Team, Match
- **Sistema di Votazione**: VotingSession (master), VoteSubmission/PlayerCardSubmission (input), VoteResult/PlayerCardResult (output aggregato)
- **Notifiche**: MatchNotification

---

## 🔧 Modelli del Database

### 1. User Schema

**File**: `src/models/User.js`  
**Collezione MongoDB**: `users`

Gestisce gli utenti del sistema con profili calcistici completi.

```javascript
{
  // === INFORMAZIONI BASE ===
  name: String,                    // Required, max 50 char
  email: String,                   // Required, unique, sparse per null
  birthdate: String,               // Required, formato YYYY-MM-DD
  password: String,                // Required, min 6 char, select: false
  
  // === AFFILIAZIONI TEAM ===
  teamIds: [ObjectId],             // Array di riferimenti a Team
  teamName: String,                // DEPRECATO - mantenuto per compatibilità
  
  // === RUOLO E AUTORIZZAZIONI ===
  role: String,                    // Enum: ['player', 'admin', 'moderator']
  
  // === PROFILO CALCISTICO ===
  profile: {
    position: String,              // Enum: ['POR', 'DIF', 'CEN', 'ATT', 'UTIL']
    preferredFoot: String,         // Enum: ['left', 'right', 'both']
    avatar: String,                // URL validato
    bio: String                    // Max 200 char
  },
  
  // === STATISTICHE AGGREGATED ===
  stats: {
    totalMatches: Number,          // Min 0
    totalGoals: Number,            // Min 0
    totalAssists: Number,          // Min 0
    averageRating: Number          // Min 0, Max 10
  },
  
  // === STATO ACCOUNT ===
  isActive: Boolean,               // Default true
  lastLoginAt: Date,
  deviceTokens: [String],          // Per notifiche push
  preferences: {
    notifications: Boolean,
    privacy: String,               // Enum: ['public', 'friends', 'private']
    language: String               // Default 'it'
  }
}
```

#### Indices
- `{ email: 1 }` - unique, sparse
- `{ teamIds: 1 }`
- `{ isActive: 1, role: 1 }`

#### Metodi
- `comparePassword(candidatePassword)` - Validazione password con bcrypt
- `generateJWT()` - Genera token JWT
- `updateStats()` - Aggiorna statistiche da Match/VotingSession
- `canVoteIn(votingSession)` - Verifica permessi di voto

---

### 2. Team Schema

**File**: `src/models/Team.js`  
**Collezione MongoDB**: `teams`

Gestisce le squadre di calcio con membri, impostazioni e statistiche.

```javascript
{
  // === INFORMAZIONI BASE ===
  name: String,                    // Required, unique, max 50 char
  description: String,             // Max 500 char
  avatar: String,                  // URL validato
  
  // === GESTIONE MEMBRI ===
  createdBy: ObjectId,             // Required, ref User
  adminIds: [ObjectId],            // Array ref User
  memberIds: [ObjectId],           // Array ref User
  inviteCode: String,              // Required, unique, uppercase 6-8 char
  
  // === CONFIGURAZIONI TEAM ===
  settings: {
    isPrivate: Boolean,            // Default false
    maxMembers: Number,            // Min 5, Max 50, Default 25
    autoApprove: Boolean,          // Default true
    allowGuestVoting: Boolean      // Default false
  },
  
  // === STATISTICHE AGGREGATE ===
  stats: {
    totalMatches: Number,          // Min 0
    totalGoals: Number,            // Min 0
    wins: Number,                  // Min 0
    losses: Number,                // Min 0
    draws: Number                  // Min 0
  },
  
  // === METADATI ===
  isActive: Boolean,               // Default true
  tags: [String],                  // Max 10 tags
  createdAt: Date,
  lastActivityAt: Date
}
```

#### Indices
- `{ name: 1 }` - unique
- `{ inviteCode: 1 }` - unique
- `{ memberIds: 1 }`
- `{ createdBy: 1 }`

#### Metodi
- `addMember(userId)` - Aggiunge membro con validazioni
- `removeMember(userId)` - Rimuove membro con cleanup
- `generateNewInviteCode()` - Genera nuovo codice invito
- `isAdmin(userId)` - Verifica se utente è admin
- `updateStats()` - Aggiorna statistiche da Match

---

### 3. Match Schema

**File**: `src/models/Match.js`  
**Collezione MongoDB**: `matches`

Schema semplificato per gestire le partite. Il sistema di votazione è gestito separatamente tramite VotingSession.

```javascript
{
  // === INFORMAZIONI BASE ===
  createdBy: ObjectId,             // Required, ref User
  teamId: String,                  // Required, string per compatibilità frontend
  date: String,                    // Required, string per compatibilità frontend
  field: String,                   // Required, max 100 char
  playersCount: Number,            // Required, enum [5, 8, 11], default 8
  notes: String,                   // Max 500 char
  
  // === PARTECIPANTI ===
  teamMemberIds: [ObjectId],       // Array ref User
  
  // === STATO MATCH ===
  status: String,                  // Enum: ['draft', 'active', 'completed', 'cancelled']
  
  // === RISULTATI FINALI ===
  finalResults: {
    averageRatings: Map,           // userId -> average rating
    mvpPlayer: ObjectId,           // ref User
    teamGoals: Number,             // Default 0
    opponentGoals: Number          // Default 0
  }
}
```

#### Indices
- `{ teamId: 1, date: -1 }`
- `{ status: 1 }`
- `{ createdBy: 1 }`

#### Metodi
- `canBeVoted()` - Verifica se match può essere votato
- `complete()` - Completa il match
- `getVotingSessions()` - Ottiene VotingSession associate

---

### 4. VotingSession Schema

**File**: `src/models/VotingSession.js`  
**Collezione MongoDB**: `votingsessions`

**Master document** che coordina tutto il processo di votazione. Gestisce sia match rating che player card rating.

```javascript
{
  // === IDENTIFICAZIONE ===
  type: String,                    // Enum: ['match_rating', 'player_card_rating']
  targetId: ObjectId,              // Match per match_rating, User per player_card
  teamId: ObjectId,                // Required, ref Team
  
  // === METADATI DESCRITTIVI ===
  title: String,                   // Required, max 200 char
  description: String,             // Max 1000 char
  
  // === CONFIGURAZIONE PARTECIPANTI ===
  eligibleVoters: [ObjectId],      // Required, array ref User
  requiredVotes: Number,           // Default: eligibleVoters.length
  allowSelfVoting: Boolean,        // Default false
  
  // === GESTIONE TEMPORALE ===
  startedAt: Date,                 // Default Date.now
  deadline: Date,
  completedAt: Date,
  
  // === STATO SESSIONE ===
  status: String,                  // Enum: ['draft', 'active', 'completed', 'cancelled', 'expired']
  completionType: String,          // Enum: ['auto', 'manual', 'deadline', 'quorum']
  
  // === CONFIGURAZIONI AVANZATE ===
  config: {
    allowAnonymousVoting: Boolean, // Default false
    allowComments: Boolean,        // Default true
    allowBadges: Boolean,          // Default true
    showRealTimeResults: Boolean,  // Default false
    enableQuorum: Boolean,         // Default false
    quorumPercentage: Number       // Min 1, Max 100, Default 75
  },
  
  // === SUMMARY REAL-TIME ===
  summary: {
    totalSubmissions: Number,      // Conteggio submissions
    participationRate: Number,     // Percentuale partecipazione
    averageRating: Number,         // Rating medio (solo match_rating)
    averageTimeSpent: Number,      // Tempo medio in secondi
    lastSubmissionAt: Date
  }
}
```

#### Indices
- `{ type: 1, targetId: 1 }`
- `{ teamId: 1, status: 1 }`
- `{ status: 1, deadline: 1 }`
- `{ eligibleVoters: 1 }`

#### Metodi
- `canVote(userId)` - Verifica se utente può votare
- `addVote(submission)` - Aggiunge voto e aggiorna summary
- `checkCompletion()` - Verifica condizioni completamento
- `complete()` - Completa sessione e genera risultati

---

### 5. VoteSubmission Schema

**File**: `src/models/VoteSubmission.js`  
**Collezione MongoDB**: `votesubmissions`

Memorizza i voti individuali per **match rating** (prestazioni in partita specifica).

```javascript
{
  // === RIFERIMENTI ===
  votingSessionId: ObjectId,       // Required, ref VotingSession
  voterId: ObjectId,               // Required, ref User
  
  // === DATI DEL VOTO MATCH ===
  voteData: {
    playerRatings: [{
      playerId: ObjectId,          // Required, ref User
      rating: Number,              // Required, min 1, max 10
      goals: Number,               // Default 0, min 0
      assists: Number,             // Default 0, min 0
      comment: String              // Max 500 char
    }],
    badges: [{
      playerId: ObjectId,          // Required, ref User
      badgeType: String            // Enum: ['mvp', 'goleador', 'assist_man', 'difensore', 'maratoneta', 'gol_bello']
    }],
    overallComment: String         // Max 1000 char
  },
  
  // === TRACKING E METADATA ===
  timeSpent: Number,               // Secondi, default 0
  ipAddress: String,
  userAgent: String,
  deviceInfo: {
    isMobile: Boolean,
    platform: String,
    screenResolution: String,
    browserLanguage: String        // Default 'it'
  },
  
  // === VERSIONING ===
  version: Number,                 // Default 1
  isActive: Boolean,               // Default true
  supersededBy: ObjectId,          // ref VoteSubmission
  modificationReason: String,      // Max 500 char
  
  // === VALIDAZIONE ===
  submissionHash: String,
  validated: Boolean,              // Default false
  validationErrors: [{
    field: String,
    message: String
  }]
}
```

#### Indices
- `{ votingSessionId: 1, voterId: 1 }` - unique compound
- `{ voterId: 1, isActive: 1 }`
- `{ isActive: 1, version: 1 }`

#### Metodi
- `supersede(reason)` - Sostituisce con nuovo voto
- `validate()` - Validazione dati submission
- `calculateHash()` - Calcola hash per integrità

---

### 6. PlayerCardSubmission Schema

**File**: `src/models/PlayerCardSubmission.js`  
**Collezione MongoDB**: `playercardsubmissions`

Memorizza le valutazioni individuali per **player card rating** (abilità generali del giocatore, FIFA-style).

```javascript
{
  // === RIFERIMENTI ===
  votingSessionId: ObjectId,       // Required, ref VotingSession
  voterId: ObjectId,               // Required, ref User
  targetPlayerId: ObjectId,        // Required, ref User (chi viene valutato)
  
  // === ATTRIBUTI PLAYER CARD (FIFA-style) ===
  attributes: {
    tir: Number,                   // Required, min 10, max 100 - Tiro
    pas: Number,                   // Required, min 10, max 100 - Passaggio
    dri: Number,                   // Required, min 10, max 100 - Dribbling
    fin: Number,                   // Required, min 10, max 100 - Finalizzazione
    vis: Number,                   // Required, min 10, max 100 - Visione di gioco
    res: Number,                   // Required, min 10, max 100 - Resistenza
    for: Number                    // Required, min 10, max 100 - Forza
  },
  
  // === ATTRIBUTI AGGIUNTIVI ===
  additionalAttributes: {
    piedeDebole: Number,           // Min 1, Max 5 - Stelle piede debole
    skill: Number                  // Min 1, Max 5 - Stelle skill moves
  },
  
  // === PROFILO GIOCATORE ===
  playerProfile: {
    position: String               // Enum: ['POR', 'DC', 'TS', 'TD', 'CC', 'CDC', 'COC', 'ED', 'ES', 'AT', 'AD', 'AS', 'ATT']
  },
  
  // === RATING CALCOLATO ===
  overallRating: Number,           // Min 10, Max 100 - Media dei 7 attributi principali
  
  // === COMMENTO ===
  comment: String,                 // Max 1000 char
  
  // === TRACKING (identici a VoteSubmission) ===
  timeSpent: Number,
  ipAddress: String,
  userAgent: String,
  deviceInfo: { /* ... */ },
  
  // === VERSIONING ===
  version: Number,
  isActive: Boolean,
  supersededBy: ObjectId,
  modificationReason: String,
  
  // === VALIDAZIONE ===
  submissionHash: String,
  validated: Boolean,
  validationErrors: [{ /* ... */ }]
}
```

#### Indices
- `{ votingSessionId: 1, voterId: 1, targetPlayerId: 1 }` - unique compound
- `{ targetPlayerId: 1, isActive: 1 }`
- `{ voterId: 1, isActive: 1 }`

---

### 7. VoteResult Schema

**File**: `src/models/VoteResult.js`  
**Collezione MongoDB**: `voteresults`

Contiene i risultati finali aggregati per votazioni di tipo **match rating** (tutti i giocatori di una partita).

```javascript
{
  // === RIFERIMENTI ===
  votingSessionId: ObjectId,       // Required, ref VotingSession
  
  // === RISULTATI MATCH RATING MULTI-PLAYER ===
  matchRatingResults: {
    type: Map,
    of: {
      playerId: ObjectId,          // Required, ref User
      averageRating: Number,       // Required, min 1, max 10
      medianRating: Number,        // Min 1, max 10
      goals: Number,               // Default 0, min 0
      assists: Number,             // Default 0, min 0
      voteCount: Number,           // Required, min 0
      badges: [String],            // Enum badges
      grade: String,               // Enum: ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F']
      standardDeviation: Number,   // Min 0
      confidence: Number           // Min 0, Max 1
    }
  },
  
  // === METADATI SESSIONE ===
  sessionMetadata: {
    totalVoters: Number,           // Required, min 0
    sessionType: String,           // Default 'match_rating'
    calculatedAt: Date,            // Default Date.now
    playersCount: Number,          // Min 0
    completionRate: Number         // Min 0, Max 100
  },
  
  // === STATISTICHE GENERALI ===
  statistics: {
    voteCount: Number,             // Required, min 0
    overallAverageRating: Number,  // Min 1, Max 10
    totalGoalsReported: Number,    // Default 0, min 0
    totalAssistsReported: Number,  // Default 0, min 0
    
    ratingDistribution: {
      '9-10': Number,
      '8-9': Number,
      '7-8': Number,
      '6-7': Number,
      '5-6': Number,
      'below-5': Number
    },
    
    badgesSummary: {
      mvp: Number,
      goleador: Number,
      assist_man: Number,
      difensore: Number,
      maratoneta: Number,
      gol_bello: Number
    }
  },
  
  // === METADATI CALCOLO ===
  calculationMethod: String,       // Enum: ['average', 'median', 'weighted_average', 'trimmed_mean']
  calculationParameters: {
    excludeOutliers: Boolean,
    minimumVotesRequired: Number
  },
  dataVersion: Number,
  recalculatedAt: Date
}
```

#### Indices
- `{ votingSessionId: 1 }` - unique
- `{ 'sessionMetadata.sessionType': 1, createdAt: -1 }`
- `{ 'statistics.overallAverageRating': -1 }`

#### Virtual Properties
- `bestPlayer` - Giocatore con rating più alto
- `isHighQualityMatch` - Match di alta qualità (rating ≥ 7.0, completion ≥ 80%)

---

### 8. PlayerCardResult Schema

**File**: `src/models/PlayerCardResult.js`  
**Collezione MongoDB**: `playercardresults`

Contiene i risultati finali aggregati per valutazioni **player card** (singolo giocatore valutato).

```javascript
{
  // === RIFERIMENTI ===
  votingSessionId: ObjectId,       // Required, ref VotingSession
  targetPlayerId: ObjectId,        // Required, ref User (giocatore valutato)
  
  // === ATTRIBUTI FINALI AGGREGATI ===
  finalAttributes: {
    tir: Number,                   // Required, min 10, max 100 - Media TIR
    pas: Number,                   // Required, min 10, max 100 - Media PAS
    dri: Number,                   // Required, min 10, max 100 - Media DRI
    fin: Number,                   // Required, min 10, max 100 - Media FIN
    vis: Number,                   // Required, min 10, max 100 - Media VIS
    res: Number,                   // Required, min 10, max 100 - Media RES
    for: Number                    // Required, min 10, max 100 - Media FOR
  },
  
  // === ATTRIBUTI AGGIUNTIVI AGGREGATI ===
  finalAdditionalAttributes: {
    piedeDebole: Number,           // Min 1, Max 5 - Media piede debole
    skill: Number                  // Min 1, Max 5 - Media skill moves
  },
  
  // === RATING FINALE ===
  finalOverallRating: Number,      // Required, min 10, max 100
  
  // === PROFILO CONSENSUALE ===
  consensusProfile: {
    mostVotedPosition: String,     // Posizione più votata
    positionDistribution: Map      // Distribuzione voti per posizione
  },
  
  // === METADATI SESSIONE ===
  sessionMetadata: {
    totalVoters: Number,           // Required, min 0
    sessionType: String,           // Default 'player_card_rating'
    calculatedAt: Date,            // Default Date.now
    completionRate: Number         // Min 0, Max 100
  },
  
  // === STATISTICHE DETTAGLIATE ===
  statistics: {
    attributeDistributions: {
      tir: { min: Number, max: Number, standardDeviation: Number },
      pas: { min: Number, max: Number, standardDeviation: Number },
      // ... per ogni attributo
    },
    ratingDistribution: {
      '90-100': Number,
      '80-90': Number,
      '70-80': Number,
      '60-70': Number,
      'below-60': Number
    },
    consistency: Number,           // Min 0, Max 1 - Coerenza valutazioni
    reliability: Number            // Min 0, Max 1 - Affidabilità risultato
  }
}
```

#### Indices
- `{ votingSessionId: 1 }` - unique
- `{ targetPlayerId: 1, createdAt: -1 }`
- `{ finalOverallRating: -1 }`

---

### 9. MatchNotification Schema

**File**: `src/models/MatchNotification.js`  
**Collezione MongoDB**: `matchnotifications`

Sistema di notifiche per eventi relativi ai match.

```javascript
{
  // === RIFERIMENTI ===
  userId: ObjectId,                // Required, ref User
  matchId: ObjectId,               // Required, ref Match
  
  // === TIPO E STATO ===
  type: String,                    // Enum: ['voting_open', 'voting_reminder']
  read: Boolean,                   // Default false
  
  // === TIMESTAMP ===
  createdAt: Date                  // Auto-managed
}
```

#### Indices
- `{ userId: 1, read: 1 }`
- `{ matchId: 1 }`

---

## 🔄 Flussi di Dati Principali

### Flusso Match Rating

1. **Creazione Match** → `Match` (status: 'draft')
2. **Avvio Votazione** → `VotingSession` (type: 'match_rating')
3. **Voti Utenti** → `VoteSubmission` per ogni utente
4. **Completamento** → `VoteResult` con risultati aggregati
5. **Update Match** → `Match.finalResults` aggiornato

### Flusso Player Card Rating

1. **Selezione Giocatore** → Target player identificato
2. **Avvio Valutazione** → `VotingSession` (type: 'player_card_rating')
3. **Valutazioni Utenti** → `PlayerCardSubmission` per ogni valutatore
4. **Completamento** → `PlayerCardResult` con attributi aggregati
5. **Update Profilo** → `User.stats` aggiornate

---

## 📊 Relazioni tra Entità

```
User ←→ Team (Many-to-Many via teamIds)
User → Match (One-to-Many via createdBy)
User ← VotingSession (One-to-Many via eligibleVoters)
User → VoteSubmission (One-to-Many via voterId)
User → PlayerCardSubmission (One-to-Many via voterId)

Match → VotingSession (One-to-Many via targetId quando type='match_rating')
VotingSession → VoteSubmission (One-to-Many)
VotingSession → PlayerCardSubmission (One-to-Many)
VotingSession → VoteResult (One-to-One)
VotingSession → PlayerCardResult (One-to-One)

Team → Match (One-to-Many via teamId)
Team → VotingSession (One-to-Many via teamId)
```

---

## 🚀 Ottimizzazioni e Best Practices

### Indices Strategici
- **Compound indices** per query frequenti (es. `{teamId: 1, status: 1}`)
- **Sparse indices** per campi opzionali (es. email)
- **TTL indices** per dati temporanei (future implementazione)

### Aggregation Pipelines
- Risultati calcolati via pipeline MongoDB per performance
- Denormalizzazione controllata per statistiche frequently-accessed
- Map fields per distribuzioni e metriche

### Versioning e Audit Trail
- Soft delete con `isActive` flags
- Versioning per submissions modificabili
- Hash per integrità dati critici

### Scalabilità
- Separazione responsabilità tra input (submissions) e output (results)
- Sharding-ready design con teamId come shard key
- Async processing per calcoli pesanti

---

*Documentazione aggiornata al 14 dicembre 2025*  
*Database Version: v2.1*  
*MongoDB Version: ^7.0*