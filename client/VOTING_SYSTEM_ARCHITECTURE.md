# 🗳️ VOTING SYSTEM ARCHITECTURE
**Sistema di Votazione Completo - Architettura Frontend-Backend**

## 📋 INDICE
1. [Overview del Sistema](#overview-del-sistema)
2. [Architettura Frontend](#architettura-frontend)
3. [Flusso di Votazione](#flusso-di-votazione)
4. [Integrazione Backend](#integrazione-backend)
5. [Tipi di Votazione](#tipi-di-votazione)
6. [Redux State Management](#redux-state-management)
7. [Componenti UI](#componenti-ui)
8. [API Endpoints](#api-endpoints)
9. [Testing e Debugging](#testing-e-debugging)

---

## 🎯 OVERVIEW DEL SISTEMA

### Obiettivo
Sistema di votazione completo con **interfaccia FIFA-style** per la creazione collaborativa di carte giocatore e gestione votazioni di squadra con architettura professionale **VotingSession** e integrazione backend completa.

### 🆕 AGGIORNAMENTI RECENTI (Dicembre 2025)
- ✅ **PlayerCardRatingVote**: Completamente ridisegnato in stile FIFA
- ✅ **4-Tab System**: Profilo, Fisico, Tecnica, Stelle
- ✅ **Attributi FIFA-style**: Scale 10-100 + Skill Stars 1-5
- ✅ **Backend Integration**: Modelli aggiornati per supportare nuova struttura
- ✅ **Type Safety**: Strutture dati frontend-backend completamente allineate

### Principi Architetturali
- **FIFA-Style UX**: Design moderno ispirato alle carte FIFA
- **Separation of Concerns**: Ogni tipo di voto ha il suo componente specializzato
- **Backend Integration**: Modelli MongoDB aggiornati per attributi FIFA
- **Type Safety**: TypeScript completo con union types per diversi tipi di voto
- **Consistency**: UI/UX uniforme attraverso design system condiviso
- **Scalability**: Facile aggiunta di nuovi tipi di votazione

---

## 🏗️ ARCHITETTURA FRONTEND

### File Structure
```
src/
├── types/voting.ts                      # ✅ AGGIORNATO: FIFA-style types
├── redux/slices/votingSlice.ts          # State management 
├── pages/Vote.tsx                       # Hub centrale + routing
├── components/voting/
│   ├── index.ts                        # Barrel exports
│   ├── PlayerCardRatingVote.tsx        # 🆕 FIFA-style component (4 tabs)
│   ├── MatchPlayerRatingVote.tsx       # Rating giocatori 1-10
│   ├── MVPElectionVote.tsx             # Elezione MVP
│   └── MOTMElectionVote.tsx            # Elezione MOTM
└── lib/api.ts                          # API integration

## 🔧 BACKEND UPDATES
pagelle-fc-backend/src/models/
├── VoteSubmission.js                   # ✅ AGGIORNATO: attributi FIFA-style
├── VotingSession.js                    # Modello sessioni
└── PlayerCard.js                       # Modello carte giocatore
```

### Gerarchia Componenti
```
Vote.tsx (Hub)
├── Dashboard Mode (default)
│   ├── Stats Cards (pendenti, attive, completate)
│   ├── Tabs (pendenti, attive, completate)
│   └── Session Cards (lista votazioni)
└── Voting Mode (quando si vota)
    ├── PlayerCardVote (type: player_card_rating)
    ├── MatchRatingVote (type: match_player_rating)
    └── MVPElectionVote (type: mvp_election | motm_election)
```

---

## 🔄 FLUSSO DI VOTAZIONE

### 1. Caricamento Dashboard
```typescript
useEffect(() => {
  // All'apertura della pagina
  dispatch(fetchUserVotingSessions({ 
    status: 'active', 
    page: 1, 
    limit: 20 
  }));
}, []);
```

**Cosa succede:**
- Redux chiama API `/voting-sessions`
- Carica sessioni attive per l'utente
- Popola dashboard con stats e liste

### 2. Selezione Votazione
```typescript
const handleStartVoting = (session: VotingSession) => {
  setSelectedSession(session);
  setViewMode('voting');
};
```

**Cosa succede:**
- User clicca "Vota" su una sessione
- Si passa da dashboard mode a voting mode
- Routing condizionale carica componente specifico

### 3. Votazione Specifica
```typescript
// Route in base al type della sessione
{selectedSession.type === 'player_card_rating' && (
  <PlayerCardVote
    votingSession={selectedSession}
    onComplete={handleBackToDashboard}
    onCancel={handleBackToDashboard}
  />
)}
```

**Cosa succede:**
- Carica componente specializzato per il tipo
- Interface ottimizzata per quel tipo di voto
- Auto-save delle bozze in Redux

### 4. Invio Voto
```typescript
const result = await dispatch(submitVote({
  sessionId: votingSession.id,
  voteData: {
    vote: voteData,
    deviceInfo: {
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    }
  }
}));
```

**Cosa succede:**
- Validazione lato client
- POST to `/voting-sessions/${id}/vote`
- Aggiorna stato Redux
- Torna al dashboard

### 5. Ritorno Dashboard
```typescript
const handleBackToDashboard = () => {
  setViewMode('dashboard');
  setSelectedSession(null);
  
  // Refresh per vedere stato aggiornato
  dispatch(fetchUserVotingSessions({ 
    status: 'active', 
    page: 1, 
    limit: 20 
  }));
};
```

---

## 🌐 INTEGRAZIONE BACKEND

### API Contract

#### GET /voting-sessions
**Query Parameters:**
```typescript
{
  status?: 'draft' | 'active' | 'completed' | 'cancelled' | 'all'
  type?: 'player_card_rating' | 'match_player_rating' | 'mvp_election' | 'motm_election' | 'all'
  page?: number
  limit?: number
}
```

**Response:**
```typescript
{
  votingSessions: VotingSession[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}
```

#### POST /voting-sessions/{sessionId}/vote
**Request Body:**
```typescript
{
  vote: VoteData  // Union type basato su session.type
  deviceInfo?: {
    userAgent: string
    timestamp: string
  }
}
```

**Response:**
```typescript
{
  submission: VoteSubmission
  updatedSession: VotingSession
}
```

### Database Models

#### VotingSession
```javascript
{
  id: ObjectId,
  type: 'player_card_rating' | 'match_player_rating' | 'mvp_election' | 'motm_election',
  title: String,
  description: String,
  status: 'draft' | 'active' | 'completed' | 'cancelled',
  
  // Configuration
  isAnonymous: Boolean,
  allowMultipleSubmissions: Boolean,
  requiresApproval: Boolean,
  
  // Timing
  startsAt: Date,
  endsAt: Date,
  createdAt: Date,
  
  // Target
  target: {
    type: 'player' | 'match' | 'team',
    entityId: ObjectId,
    metadata: Object  // playerName, matchTitle, etc.
  },
  
  // Participants
  createdBy: ObjectId,
  eligibleVoters: [ObjectId],
  
  // Stats (calculated)
  submissionsCount: Number,
  participationRate: Number
}
```

#### VoteSubmission
```javascript
{
  id: ObjectId,
  sessionId: ObjectId,
  userId: ObjectId,
  
  // Vote data (varies by session type)
  vote: {
    // PlayerCardRating: { attributes: PlayerAttributes, comments?: string }
    // MatchPlayerRating: { playerRatings: {...}, matchComments?: string }
    // MVPElection: { selectedPlayerId: ObjectId, reason?: string }
  },
  
  // Metadata
  submittedAt: Date,
  status: 'valid' | 'invalid' | 'flagged',
  deviceInfo: Object,
  
  // Audit
  isValid: Boolean,
  validationErrors: [String]
}
```

---

## 🎪 TIPI DI VOTAZIONE

### 1. Player Card Rating (`player_card_rating`) 🆕 AGGIORNATO

**Scopo:** Creare carte giocatore **FIFA-style** collaborativamente

**Component:** `PlayerCardRatingVote.tsx` 
- 🎨 **Design FIFA completo** con 4-tab system
- 📊 **Overview Mode**: Griglia player cards con status
- ✏️ **Edit Mode**: Form specializzato con tab
- 🏆 **Overall Rating**: Calcolo automatico 10-100
- 💾 **Backend Integration**: Struttura dati allineata

**UI Features FIFA-style:**
- **Tab Profilo**: Posizione, ruolo preferito, età
- **Tab Fisico**: RES, FOR (scale 10-100) 
- **Tab Tecnica**: TIR, PAS, DRI, FIN, VIS (scale 10-100)
- **Tab Stelle**: Piede debole + Skill moves (1-5 stelle)
- **Commenti**: Note opzionali su stile di gioco

**Vote Data (AGGIORNATA):**
```typescript
{
  attributes: {
    // Attributi FIFA-style (10-100)
    tir: number,    // Tiro
    pas: number,    // Passaggio  
    dri: number,    // Dribbling
    fin: number,    // Finalizzazione
    vis: number,    // Visione
    res: number,    // Resistenza
    for: number,    // Forza
    // Skill Stars (1-5)
    piedeDebole: number,
    skill: number
  },
  playerProfile: {
    position: 'POR' | 'DIF' | 'CEN' | 'ATT',
    preferredRole: string,
    age: number
  },
  overallComment?: string,
  overallRating: number  // Calcolato automaticamente
}
```

### 2. Match Player Rating (`match_player_rating`)

**Scopo:** Valutare performance giocatori in una partita (voti 1-10)

**Component:** `MatchRatingVote.tsx`
- Grid interattiva con tutti i giocatori
- Rating buttons 1-10 per giocatore
- Minuti giocati opzionale
- Commenti per giocatore e partita

**Vote Data:**
```typescript
{
  playerRatings: {
    [playerId: string]: {
      rating: number,        // 1-10
      minutes?: number,      // minuti giocati
      position?: string,     // posizione in campo  
      comments?: string
    }
  },
  matchComments?: string
}
```

**UI Features:**
- Stats real-time (media team, top player)
- Color-coded ratings (rosso <6, verde ≥6)
- Batch operations
- Validation: tutti i giocatori valutati

### 3. MVP/MOTM Election (`mvp_election`, `motm_election`)

**Scopo:** Eleggere MVP o Man of the Match

**Component:** `MVPElectionVote.tsx`
- Lista candidati con stats performance
- Selezione singola
- Motivazione opzionale

**Vote Data:**
```typescript
{
  selectedPlayerId: string,
  reason?: string
}
```

**UI Features:**
- Cards candidati con stats
- Selection state visibile
- Avatar placeholder
- Reason textarea

---

## 🏪 REDUX STATE MANAGEMENT

### VotingState Structure
```typescript
interface VotingState {
  // Data
  sessions: VotingSession[]           // Lista sessioni caricate
  currentSession: VotingSession | null  // Sessione in votazione
  
  // Loading States
  isLoading: boolean                  // Generic loading
  isLoadingSessions: boolean          // Loading lista
  isSubmittingVote: boolean          // Invio voto
  isCreatingSession: boolean         // Creazione sessione
  
  // Errors
  error: string | null               // Generic error  
  submitError: string | null         // Errore invio voto
  
  // UI State
  filters: {                         // Filtri dashboard
    type?: VotingSessionType | 'all'
    status?: VotingSessionStatus | 'all' 
    searchTerm?: string
  }
  pagination: {                      // Paginazione
    page: number
    limit: number
    total: number
    pages: number
  }
  
  // Draft Management
  draftVotes: {                      // Auto-save locale
    [sessionId: string]: Partial<VoteData>
  }
  
  // Cache
  results: {                         // Cache risultati
    [sessionId: string]: VotingResult
  }
}
```

### Key Actions

#### Async Thunks
```typescript
// Caricamento sessioni
fetchUserVotingSessions(params)

// Dettaglio sessione  
fetchVotingSessionById(sessionId)

// Invio voto
submitVote({ sessionId, voteData })

// Creazione sessione (admin)
createVotingSession(sessionData)

// Risultati
fetchVotingResults(sessionId)
```

#### Sync Actions
```typescript
// Filtri e paginazione
updateFilters(payload)
setPage(pageNumber)

// Draft management
updateDraftVote({ sessionId, draftVote })
clearDraftVote(sessionId)

// Utility
resetVotingState()
clearErrors()
sortSessions('date' | 'type' | 'status')
```

### Selectors
```typescript
// Sessioni filtrate per UI
selectFilteredVotingSessions(state)

// Categorie specifiche  
selectActiveVotingSessions(state)
selectPendingVoteSessions(state)
selectCompletedVotingSessions(state)

// Stats dashboard
selectVotingDashboardStats(state)

// Draft specifica sessione
selectDraftVote(sessionId)(state)

// Risultati
selectVotingResults(sessionId)(state)
```

---

## 🎨 COMPONENTI UI

### Vote.tsx (Hub Centrale)

**Responsabilità:**
- Router tra dashboard e voting mode
- Stats overview
- Session list management
- Loading states

**Key Features:**
```typescript
const [viewMode, setViewMode] = useState<'dashboard' | 'voting'>('dashboard')
const [selectedSession, setSelectedSession] = useState<VotingSession | null>(null)

// Conditional rendering
{viewMode === 'dashboard' && (
  // Dashboard con tabs, stats, lista sessioni
)}

{viewMode === 'voting' && selectedSession && (
  // Routing ai componenti specifici
)}
```

### Dashboard Mode Features

**Stats Cards:**
- Pending votes count
- Active sessions
- Completed sessions
- User participation rate

**Tabs Navigation:**
- "Da Votare" (pending + canVote)
- "Attive" (status: active)
- "Completate" (status: completed)

**Session Cards:**
- Type badge e icon
- Progress bar (submissions/eligible)
- Action buttons (Vota/Visualizza)
- Status indicators

### Voting Components Pattern

**Shared Interface:**
```typescript
interface VoteComponentProps {
  votingSession: VotingSession
  onComplete: () => void    // Torna dashboard + refresh
  onCancel: () => void      // Torna dashboard senza refresh  
}
```

**Common Features:**
- Header con back button
- Progress indicators
- Auto-save drafts
- Loading overlays
- Error states
- Success animations

### PlayerCardVote (Wrapper Pattern)

**Strategy:**
- Riusa `PlayerCardWizard` esistente
- Wrappa con VotingSession logic
- Mantiene UX familiare
- Aggiunge backend integration

**Implementation:**
```typescript
<PlayerCardWizard
  playerName={playerName}
  onSubmit={handleSubmitVote}
  onCancel={handleCancel}
  initialValues={getInitialValues()}  // Da draft
/>
```

### MatchRatingVote (New Interface)

**Layout:**
- Stats summary cards (media, top player, sufficienti)
- Grid giocatori con rating buttons
- Quick actions (select all 6, clear all)
- Submit area

**Interactions:**
- Click rating button → immediate feedback
- Auto-save dopo 2s di inattività
- Validation real-time

### MVPElectionVote (Election Interface)

**Layout:**
- Candidate cards con stats
- Single selection mode
- Reason textarea
- Selected candidate preview

**Data Source:**
- Mock candidates con stats
- Future: da match/player APIs
- Filtro automatico top performers

---

## 🌐 API ENDPOINTS

### Authentication
Tutti gli endpoints richiedono autenticazione Bearer token.

### Core Endpoints

#### `GET /voting-sessions`
**Scopo:** Lista sessioni utente con filtri

**Query Params:**
- `status`: draft|active|completed|cancelled|all
- `type`: player_card_rating|match_player_rating|mvp_election|motm_election|all
- `page`: numero pagina (default: 1)
- `limit`: items per pagina (default: 10)
- `sortBy`: createdAt|endsAt|submissionsCount
- `sortOrder`: asc|desc

**Response:**
- Array sessioni con metadata
- Pagination info
- User-specific flags (hasVoted, canVote)

#### `GET /voting-sessions/{sessionId}`
**Scopo:** Dettagli sessione specifica

**Response:**
- Sessione completa
- Populated target info
- User submission se presente
- Results se completata

#### `POST /voting-sessions/{sessionId}/vote`
**Scopo:** Invio voto

**Body:** 
- Union type VoteData basato su session.type
- DeviceInfo opzionale per audit

**Validation:**
- User in eligibleVoters
- Session status = active
- Non già votato (se !allowMultipleSubmissions)
- Vote data valida per type

**Response:**
- VoteSubmission created
- Updated session stats

#### `GET /voting-sessions/{sessionId}/results`
**Scopo:** Risultati sessione completata

**Access:** Solo se session.status = completed

**Response:**
- Aggregated results by type
- Statistics e breakdown
- Anonymized se necessario

### Admin Endpoints

#### `POST /voting-sessions`
**Scopo:** Crea nuova sessione

**Access:** Admin o organizers

#### `PATCH /voting-sessions/{sessionId}/activate`
**Scopo:** Attiva sessione draft

#### `PATCH /voting-sessions/{sessionId}/complete`
**Scopo:** Completa sessione e calcola risultati

---

## 🧪 TESTING E DEBUGGING

### Frontend Testing

**Component Testing:**
```bash
# Test componenti individuali
npm test PlayerCardVote
npm test MatchRatingVote
npm test MVPElectionVote
```

**Redux Testing:**
```bash
# Test slices
npm test votingSlice
npm test voting.selectors
```

**Integration Testing:**
```bash
# Test flusso completo
npm test Vote.integration
```

### Debugging Tools

**Redux DevTools:**
```typescript
// Monitora state changes
const store = configureStore({
  reducer: { voting: votingReducer },
  devTools: true
})
```

**API Debugging:**
```typescript
// In lib/api.ts - logging automatico
const api = {
  get: (url) => {
    console.log('🔍 API GET:', url)
    return fetch(url).then(res => {
      console.log('✅ API Response:', res.status)
      return res.json()
    })
  }
}
```

**Console Logging:**
Tutti i thunks hanno console.log per debugging:
```typescript
console.log('🗳️ Invio voto per sessione:', sessionId)
console.log('✅ Voto inviato con successo')
console.error('❌ Errore invio voto:', error)
```

### Test Data

**Mock Sessions:**
```typescript
const mockSessions: VotingSession[] = [
  {
    id: '1',
    type: 'player_card_rating',
    title: 'Valutazione carta giocatore - Mario Rossi',
    status: 'active',
    hasVoted: false,
    canVote: true,
    submissionsCount: 3,
    eligibleVotersCount: 10
  }
]
```

**Mock Vote Data:**
```typescript
// PlayerCard vote
const mockPlayerCardVote: PlayerCardRatingVote = {
  attributes: {
    stamina: 75,
    shooting: 80,
    // ... other attributes
  },
  comments: 'Ottimo giocatore offensivo'
}
```

### Error Scenarios

**Common Issues:**
1. **Session not found** - Refresh lista sessioni
2. **Already voted** - Check hasVoted flag
3. **Validation error** - Show field-specific errors  
4. **Network error** - Retry logic + offline support
5. **Type mismatch** - Strict TypeScript validation

**Error Handling Pattern:**
```typescript
try {
  const result = await dispatch(submitVote(data))
  if (submitVote.fulfilled.match(result)) {
    // Success handling
  } else {
    throw new Error(result.payload)
  }
} catch (error) {
  toast({
    title: 'Errore',
    description: error.message,
    variant: 'destructive'
  })
}
```

---

## 🚀 DEPLOYMENT E PERFORMANCE

### Frontend Optimizations

**Code Splitting:**
```typescript
// Lazy load voting components
const PlayerCardVote = lazy(() => import('./voting/PlayerCardVote'))
const MatchRatingVote = lazy(() => import('./voting/MatchRatingVote'))
```

**Memoization:**
```typescript
// Expensive selectors
const selectFilteredSessions = useMemo(() => 
  sessions.filter(/* filter logic */), 
  [sessions, filters]
)
```

**Redux Optimization:**
```typescript
// RTK Query per caching automatico
const votingApi = createApi({
  reducerPath: 'votingApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/voting-sessions'
  }),
  tagTypes: ['VotingSession'],
  endpoints: (builder) => ({
    getVotingSessions: builder.query({
      query: (params) => `?${new URLSearchParams(params)}`,
      providesTags: ['VotingSession']
    })
  })
})
```

### Monitoring

**Analytics Events:**
```typescript
// Track user actions
analytics.track('voting_session_started', {
  sessionType: session.type,
  sessionId: session.id
})

analytics.track('vote_submitted', {
  sessionType: session.type,
  timeToComplete: completionTime
})
```

**Performance Metrics:**
- Time to first vote
- Completion rate by session type
- Error rate by endpoint
- User engagement metrics

---

## 🎯 PROSSIMI SVILUPPI

### Short Term
- [ ] Real-time updates (WebSocket)
- [ ] Offline support (Service Worker)
- [ ] Push notifications
- [ ] Mobile responsiveness audit

### Medium Term  
- [ ] Advanced result visualizations
- [ ] Export results to PDF/Excel
- [ ] Voting analytics dashboard
- [ ] A/B testing framework

### Long Term
- [ ] Machine learning per fraud detection
- [ ] Multi-tenant support
- [ ] Voting templates system
- [ ] Integration con altri sistemi

---

*Questo documento è in evoluzione e verrà aggiornato man mano che il sistema cresce e matura.*