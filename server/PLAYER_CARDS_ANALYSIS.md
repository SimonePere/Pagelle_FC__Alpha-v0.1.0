# Player Cards System - Analisi Completa per Frontend

*Analisi dettagliata del sistema Player Cards per configurazione frontend*  
*Data: 10 dicembre 2025*

## 🎯 Panoramica Generale

Il sistema Player Cards implementa un sistema di valutazione stile FIFA per i giocatori, diverso dal sistema di voto partita. Permette di valutare le **abilità generali** di un giocatore attraverso 7 attributi principali su scala 10-100.

### Differenze Chiave vs Vote System
- **Vote System**: Valuta performance in una partita specifica (1-10)
- **Player Card System**: Valuta abilità generali del giocatore (10-100)

---

## 📊 Modelli Dati

### 1. PlayerCardSubmission (Voto Individuale)
```javascript
// Struttura dati che ogni utente invia per valutare un giocatore
{
  votingSessionId: ObjectId,     // Riferimento alla sessione
  voterId: ObjectId,             // Chi sta votando
  targetPlayerId: ObjectId,      // Chi viene valutato
  
  // ⭐ ATTRIBUTI PRINCIPALI (OBBLIGATORI - Range: 10-100)
  attributes: {
    tir: Number,    // Tiro
    pas: Number,    // Passaggio  
    dri: Number,    // Dribbling
    fin: Number,    // Finalizzazione
    vis: Number,    // Visione di gioco
    res: Number,    // Resistenza
    for: Number     // Forza
  },
  
  // ⭐ ATTRIBUTI AGGIUNTIVI (OPZIONALI - Range: 1-5 stelle)
  additionalAttributes: {
    piedeDebole: Number,  // Piede debole (1-5 stelle)
    skill: Number         // Skill moves (1-5 stelle)
  },
  
  // ⭐ PROFILO GIOCATORE (OPZIONALE)
  playerProfile: {
    position: String      // Posizione preferita
  },
  
  // ⭐ CALCOLATO AUTOMATICAMENTE DAL BACKEND
  overallRating: Number,  // Media dei 7 attributi principali
  
  // ⭐ METADATA
  comment: String,        // Commento opzionale (max 1000 caratteri)
  timeSpent: Number,      // Tempo impiegato in secondi
  deviceInfo: Object,     // Info dispositivo
  isActive: Boolean       // Per gestire modifiche future
}
```

### 2. PlayerCardResult (Risultati Aggregati)
```javascript
// Risultato finale aggregato di tutte le valutazioni per un giocatore
{
  votingSessionId: ObjectId,
  targetPlayerId: ObjectId,
  
  // ⭐ ATTRIBUTI FINALI (medie arrotondate di tutti i voti)
  finalAttributes: {
    tir: Number,     // Media di tutti i voti TIR
    pas: Number,     // Media di tutti i voti PAS
    dri: Number,     // Media di tutti i voti DRI
    fin: Number,     // Media di tutti i voti FIN
    vis: Number,     // Media di tutti i voti VIS
    res: Number,     // Media di tutti i voti RES
    for: Number      // Media di tutti i voti FOR
  },
  
  finalOverallRating: Number,    // Media di tutti gli overall rating
  grade: String,                 // A+, A, B+, B, C+, C, D, F
  
  // ⭐ PROFILO CONSENSUALE
  consensusProfile: {
    mostVotedPosition: String,           // Posizione più votata
    positionDistribution: Map           // { "CC": 5, "COC": 2, "CDC": 1 }
  },
  
  // ⭐ STATISTICHE DETTAGLIATE
  statistics: {
    voteCount: Number,
    attributeBreakdown: {
      [attribute]: {
        average: Number,
        median: Number,
        standardDeviation: Number,
        min: Number,
        max: Number,
        distribution: {
          '90-100': Number,    // Voti eccellenti
          '80-90': Number,     // Voti ottimi
          '70-80': Number,     // Voti buoni
          '60-70': Number,     // Voti discreti
          '50-60': Number,     // Voti sufficienti
          'below-50': Number   // Voti insufficienti
        }
      }
    },
    overallStats: {
      confidence: Number,         // Affidabilità 0-1
      consistencyScore: Number    // Coerenza voti 0-10
    }
  }
}
```

### 3. VotingSession (Player Card)
```javascript
// Sessione di votazione per player card
{
  type: "player_card_rating",    // Tipo fisso per player cards
  targetId: ObjectId,            // Il giocatore da valutare
  teamId: String,                // Team di appartenenza
  title: String,                 // Es: "Valuta Mario Rossi"
  description: String,           // Descrizione sessione
  status: String,                // "active" | "completed"
  deadline: Date,                // Scadenza (opzionale)
  eligibleVoters: [ObjectId],    // Chi può votare (membri team)
  allowSelfVoting: true,         // Il giocatore può votare se stesso
  voteConfig: {
    attributesToRate: ["tir", "pas", "dri", "fin", "vis", "res", "for"],
    attributeRange: { min: 10, max: 100 },
    allowComments: true
  }
}
```

---

## 🛠 API Endpoints Dettagliate

### 1. Gestione Sessioni

#### **POST `/api/v1/player-cards/sessions`**
*Crea una nuova sessione di valutazione player card*

**Request Body:**
```javascript
{
  targetPlayerId: "60a7b8c9d1e2f3a4b5c6d789",  // OBBLIGATORIO
  title?: "Valuta Mario Rossi",                  // Opzionale
  description?: "Valutazione abilità generali", // Opzionale
  deadline?: "2025-12-15T18:00:00.000Z",       // Opzionale
  teamId?: "team123"                            // Opzionale (derivato se non fornito)
}
```

**Response:**
```javascript
{
  success: true,
  votingSession: {
    id: "60a7b8c9d1e2f3a4b5c6d790",
    type: "player_card_rating",
    targetId: "60a7b8c9d1e2f3a4b5c6d789",
    teamId: "team123",
    title: "Valuta Mario Rossi",
    status: "active",
    eligibleVoters: 12,
    targetPlayerInfo: {
      id: "60a7b8c9d1e2f3a4b5c6d789",
      name: "Mario Rossi"
    }
  }
}
```

#### **GET `/api/v1/player-cards/sessions`**
*Lista tutte le sessioni player card per l'utente loggato*

**Response:**
```javascript
{
  success: true,
  votingSessions: [{
    id: "60a7b8c9d1e2f3a4b5c6d790",
    type: "player_card_rating",
    targetId: "60a7b8c9d1e2f3a4b5c6d789",
    title: "Valuta Mario Rossi",
    status: "active",
    submissionsCount: 7,          // Quanti hanno già votato
    participationRate: 58,        // Percentuale partecipazione (7/12 * 100)
    hasVoted: false,              // Se l'utente ha già votato
    canVote: true,                // Se può ancora votare (active + !hasVoted)
    targetPlayerInfo: {
      name: "Mario Rossi",
      email: "mario.rossi@email.com"
    }
  }],
  total: 1
}
```

#### **GET `/api/v1/player-cards/sessions/:id`**
*Dettagli di una sessione specifica*

**Response:**
```javascript
{
  success: true,
  votingSession: {
    id: "60a7b8c9d1e2f3a4b5c6d790",
    type: "player_card_rating",
    title: "Valuta Mario Rossi",
    description: "Esprimi la tua valutazione sulle abilità di Mario Rossi",
    status: "active",
    deadline: null,
    voteConfig: {
      attributesToRate: ["tir", "pas", "dri", "fin", "vis", "res", "for"],
      attributeRange: { min: 10, max: 100 },
      allowComments: true
    },
    targetPlayerInfo: {
      id: "60a7b8c9d1e2f3a4b5c6d789",
      name: "Mario Rossi",
      email: "mario.rossi@email.com"
    }
  }
}
```

### 2. Invio Voti

#### **POST `/api/v1/player-cards/sessions/:id/vote`**
*Invia il voto per una sessione player card*

**⚠️ IMPORTANTE:** L'Overall Rating viene calcolato automaticamente dal backend, NON inviarlo!

**Request Body:**
```javascript
{
  vote: {
    // ⭐ ATTRIBUTI OBBLIGATORI (tutti devono essere presenti, range 10-100)
    attributes: {
      tir: 78,     // Tiro
      pas: 85,     // Passaggio
      dri: 72,     // Dribbling
      fin: 76,     // Finalizzazione
      vis: 88,     // Visione di gioco
      res: 81,     // Resistenza
      for: 74      // Forza
    },
    
    // ⭐ ATTRIBUTI OPZIONALI
    additionalAttributes: {
      piedeDebole: 3,  // Piede debole (1-5 stelle) - OPZIONALE
      skill: 4         // Skill moves (1-5 stelle) - OPZIONALE
    },
    
    // ⭐ PROFILO OPZIONALE
    playerProfile: {
      position: "CC"   // Posizione preferita - OPZIONALE
    },
    
    // ⭐ COMMENTO OPZIONALE
    comment: "Ottimo centrocampista con grande visione di gioco"
  },
  
  // ⭐ METADATA OPZIONALI
  deviceInfo: {
    isMobile: false,
    platform: "Chrome"
  },
  timeSpent: 180  // Tempo impiegato in secondi
}
```

**Response:**
```javascript
{
  success: true,
  submission: {
    id: "60a7b8c9d1e2f3a4b5c6d791",
    submittedAt: "2025-12-10T15:30:00.000Z",
    type: "player_card_rating",
    overallRating: 79,  // Calcolato automaticamente: (78+85+72+76+88+81+74)/7 = 79
    targetPlayerId: "60a7b8c9d1e2f3a4b5c6d789"
  }
}
```

**⚠️ Errori Comuni:**
- **400**: Attributi mancanti o fuori range
- **400**: Utente ha già votato
- **403**: Non autorizzato a votare in questa sessione
- **404**: Sessione non trovata o non attiva

### 3. Risultati e Calcoli

#### **GET `/api/v1/player-cards/sessions/:id/calculation`**
*Ottieni risultati live (se attiva) o ufficiali (se completata)*

**Response (Session Attiva - Risultati Live):**
```javascript
{
  success: true,
  calculation: {
    targetPlayerId: "60a7b8c9d1e2f3a4b5c6d789",
    sessionId: "60a7b8c9d1e2f3a4b5c6d790",
    
    // ⭐ ATTRIBUTI FINALI (medie arrotondate)
    finalAttributes: {
      tir: 77,   // Media di tutti i voti per Tiro
      pas: 83,   // Media di tutti i voti per Passaggio
      dri: 71,   // Media di tutti i voti per Dribbling
      fin: 75,   // Media di tutti i voti per Finalizzazione
      vis: 86,   // Media di tutti i voti per Visione
      res: 79,   // Media di tutti i voti per Resistenza
      for: 73    // Media di tutti i voti per Forza
    },
    
    finalOverallRating: 78,  // Media di tutti gli overall rating
    
    // ⭐ STATISTICHE
    statistics: {
      voteCount: 8,
      attributeBreakdown: {
        tir: {
          average: 76.8,
          median: 77,
          min: 65,
          max: 88
        },
        // ... per ogni attributo
      }
    },
    
    // ⭐ CONSENSO POSIZIONE
    positionConsensus: {
      mostVoted: "CC",           // Posizione più votata
      distribution: {
        "CC": 5,                 // 5 voti per Centrocampista
        "COC": 2,               // 2 voti per Centrocampista Offensivo
        "CDC": 1                // 1 voto per Centrocampista Difensivo
      }
    }
  },
  isOfficial: false,             // Risultati live, non ufficiali
  calculatedAt: "2025-12-10T15:30:00.000Z"
}
```

**Response (Session Completata - Risultati Ufficiali):**
```javascript
{
  success: true,
  calculation: {
    // Stessa struttura di sopra, ma con:
    grade: "B+",                 // Voto finale: A+|A|B+|B|C+|C|D|F
    
    // ⭐ STATISTICHE COMPLETE
    statistics: {
      // Statistiche molto più dettagliate con deviazioni standard,
      // distribuzioni per fasce, confidence score, etc.
      attributeBreakdown: {
        tir: {
          average: 76.8,
          median: 77,
          standardDeviation: 6.2,
          min: 65,
          max: 88,
          distribution: {
            '90-100': 0,
            '80-90': 3,
            '70-80': 4,
            '60-70': 1,
            '50-60': 0,
            'below-50': 0
          }
        }
      },
      overallStats: {
        confidence: 0.85,         // Affidabilità alta (0-1)
        consistencyScore: 7.8     // Coerenza buona (0-10)
      }
    },
    
    // ⭐ HIGHLIGHTS
    highlights: {
      strongest: { name: "vis", value: 86 },   // Attributo più forte
      weakest: { name: "dri", value: 71 },     // Attributo più debole
      isElite: false                           // Se è un giocatore elite (>= 85 overall + confidence >= 0.8)
    }
  },
  isOfficial: true,              // Risultati ufficiali salvati
  calculatedAt: "2025-12-10T16:00:00.000Z"
}
```

#### **POST `/api/v1/player-cards/sessions/:id/complete`**
*Completa la sessione e salva i risultati ufficiali*

**Request Body:**
```javascript
{
  forceReopen?: false  // true per riaprire una sessione già completata
}
```

**Response:**
```javascript
{
  success: true,
  message: "Player card session completed successfully",
  officialResults: {
    // Stessa struttura dettagliata di /calculation con isOfficial: true
  },
  completedAt: "2025-12-10T16:00:00.000Z",
  playerCardResultId: "60a7b8c9d1e2f3a4b5c6d792"
}
```

---

## 🔧 Validazioni e Regole Business

### Validazioni Obbligatorie

#### **Attributi Principali**
- **Range**: 10-100 (NON 0-100!)
- **Obbligatori**: Tutti e 7 gli attributi devono essere presenti
  - `tir` (Tiro)
  - `pas` (Passaggio)
  - `dri` (Dribbling)
  - `fin` (Finalizzazione)
  - `vis` (Visione di gioco)
  - `res` (Resistenza)
  - `for` (Forza)

#### **Attributi Aggiuntivi (Opzionali)**
- **Range**: 1-5 stelle
- `piedeDebole`: Piede debole (1-5)
- `skill`: Skill moves (1-5)

#### **Posizioni Valide**
```javascript
const validPositions = [
  'POR',  // Portiere
  'DC',   // Difensore Centrale
  'TS',   // Terzino Sinistro
  'TD',   // Terzino Destro
  'CC',   // Centrocampista Centrale
  'CDC',  // Centrocampista Difensivo Centrale
  'COC',  // Centrocampista Offensivo Centrale
  'ED',   // Esterno Destro
  'ES',   // Esterno Sinistro
  'AT',   // Attaccante Trequartista
  'AD',   // Attaccante Destro
  'AS',   // Attaccante Sinistro
  'ATT'   // Attaccante Centrale
];
```

### Regole Business

1. **Un voto per utente**: Ogni utente può votare solo una volta per giocatore per sessione
2. **Self-voting permesso**: Il giocatore può votare per se stesso
3. **Eligible voters**: Solo i membri del team possono votare
4. **Overall Rating automatico**: Calcolato come `Math.round((tir+pas+dri+fin+vis+res+for)/7)`
5. **Session states**: 
   - `active`: Si può votare
   - `completed`: Solo visualizzazione risultati
6. **Minimum votes**: Almeno 1 voto necessario per completare una sessione

### Calcoli Aggregati

- **Media attributi**: Media aritmetica semplice di tutti i voti
- **Overall finale**: Media di tutti gli overall rating individuali
- **Posizione consensuale**: Posizione con più voti
- **Grade**: Basato sull'overall rating finale
  - A+: 95-100
  - A: 90-94
  - B+: 85-89
  - B: 80-84
  - C+: 75-79
  - C: 70-74
  - D: 60-69
  - F: <60
- **Confidence**: Basato sulla deviazione standard (meno dispersione = più confidenza)

---

## 💻 Implementazione Frontend

### Form di Valutazione

```javascript
// Esempio struttura form React/Vue
const PlayerCardForm = {
  data: {
    // ⭐ ATTRIBUTI PRINCIPALI (OBBLIGATORI)
    attributes: {
      tir: 50,    // Slider 10-100, default 50
      pas: 50,    // Slider 10-100, default 50
      dri: 50,    // Slider 10-100, default 50
      fin: 50,    // Slider 10-100, default 50
      vis: 50,    // Slider 10-100, default 50
      res: 50,    // Slider 10-100, default 50
      for: 50     // Slider 10-100, default 50
    },
    
    // ⭐ ATTRIBUTI OPZIONALI
    additionalAttributes: {
      piedeDebole: null,  // Star rating 1-5 o null
      skill: null         // Star rating 1-5 o null
    },
    
    // ⭐ PROFILO OPZIONALE
    playerProfile: {
      position: ''        // Dropdown con posizioni valide o ''
    },
    
    // ⭐ COMMENTO OPZIONALE
    comment: '',          // Textarea, max 1000 caratteri
    
    // ⭐ TRACKING
    startTime: Date.now()
  },
  
  computed: {
    // 💡 MOSTRA PREVIEW OVERALL (ma non inviarlo!)
    previewOverall() {
      const attrs = this.attributes;
      const total = attrs.tir + attrs.pas + attrs.dri + attrs.fin + 
                   attrs.vis + attrs.res + attrs.for;
      return Math.round(total / 7);
    },
    
    // Controllo validità form
    isValid() {
      return Object.values(this.attributes).every(val => 
        val >= 10 && val <= 100
      );
    }
  },
  
  methods: {
    async submitVote() {
      const timeSpent = Math.round((Date.now() - this.startTime) / 1000);
      
      const payload = {
        vote: {
          attributes: this.attributes,
          // Invia opzionali solo se compilati
          ...(this.additionalAttributes.piedeDebole && {
            additionalAttributes: this.additionalAttributes
          }),
          ...(this.playerProfile.position && {
            playerProfile: this.playerProfile
          }),
          ...(this.comment && { comment: this.comment })
        },
        timeSpent,
        deviceInfo: {
          isMobile: this.$device.isMobile,
          platform: navigator.userAgent
        }
      };
      
      // ⚠️ NON inviare overallRating - viene calcolato dal backend!
      
      try {
        const response = await api.post(`/player-cards/sessions/${sessionId}/vote`, payload);
        // Gestisci successo
      } catch (error) {
        // Gestisci errori
      }
    }
  }
};
```

### Componenti UI Consigliati

#### **Slider Attributi**
```javascript
// Slider per ogni attributo 10-100
<div class="attribute-slider">
  <label>Tiro</label>
  <input 
    type="range" 
    min="10" 
    max="100" 
    v-model="attributes.tir"
    step="1"
  />
  <span class="value">{{ attributes.tir }}</span>
</div>
```

#### **Star Rating Opzionale**
```javascript
// Star rating 1-5 per attributi aggiuntivi
<StarRating 
  v-model="additionalAttributes.piedeDebole"
  :max-stars="5"
  :nullable="true"
  label="Piede Debole"
/>
```

#### **Dropdown Posizioni**
```javascript
<select v-model="playerProfile.position">
  <option value="">-- Seleziona posizione --</option>
  <option value="POR">Portiere</option>
  <option value="DC">Difensore Centrale</option>
  <option value="TS">Terzino Sinistro</option>
  <option value="TD">Terzino Destro</option>
  <option value="CC">Centrocampista Centrale</option>
  <option value="CDC">Centrocampista Difensivo</option>
  <option value="COC">Centrocampista Offensivo</option>
  <option value="ED">Esterno Destro</option>
  <option value="ES">Esterno Sinistro</option>
  <option value="AT">Attaccante Trequartista</option>
  <option value="AD">Attaccante Destro</option>
  <option value="AS">Attaccante Sinistro</option>
  <option value="ATT">Attaccante Centrale</option>
</select>
```

### Gestione Stati Sessione

```javascript
// Logica per mostrare form vs risultati
const SessionState = {
  computed: {
    showVoteForm() {
      return this.session.status === 'active' && 
             !this.session.hasVoted && 
             this.session.canVote;
    },
    
    showResults() {
      return this.session.status === 'completed' || 
             this.session.hasVoted;
    },
    
    showAlreadyVoted() {
      return this.session.hasVoted && 
             this.session.status === 'active';
    }
  }
};
```

### Visualizzazione Risultati

#### **Radar Chart**
```javascript
// Esempio dati per radar chart (Chart.js/D3/etc)
const radarData = {
  labels: ['Tiro', 'Passaggio', 'Dribbling', 'Finalizzazione', 'Visione', 'Resistenza', 'Forza'],
  datasets: [{
    label: 'Mario Rossi',
    data: [77, 83, 71, 75, 86, 79, 73],
    backgroundColor: 'rgba(54, 162, 235, 0.2)',
    borderColor: 'rgba(54, 162, 235, 1)',
    pointBackgroundColor: 'rgba(54, 162, 235, 1)'
  }]
};
```

#### **Grade Badge**
```javascript
// Badge per il voto finale
const getGradeColor = (grade) => {
  const colors = {
    'A+': '#00C851', 'A': '#00C851',
    'B+': '#ffbb33', 'B': '#ffbb33',
    'C+': '#ff8800', 'C': '#ff8800',
    'D': '#ff4444',
    'F': '#cc0000'
  };
  return colors[grade] || '#6c757d';
};
```

#### **Statistiche Dettagliate**
```javascript
// Mostra min/max/media per ogni attributo
const AttributeStats = ({attribute, stats}) => (
  <div className="attribute-stats">
    <h4>{attribute.toUpperCase()}</h4>
    <div className="stats-grid">
      <div>Media: {stats.average}</div>
      <div>Mediana: {stats.median}</div>
      <div>Min: {stats.min}</div>
      <div>Max: {stats.max}</div>
    </div>
    {/* Grafico distribuzione */}
    <DistributionChart data={stats.distribution} />
  </div>
);
```

---

## 🚨 Punti Critici e Best Practices

### ⚠️ ERRORI DA EVITARE

1. **NON calcolare Overall Rating nel frontend**
   ```javascript
   // ❌ SBAGLIATO - Non fare questo
   const overallRating = (tir + pas + dri + fin + vis + res + for) / 7;
   payload.vote.overallRating = overallRating;
   
   // ✅ CORRETTO - Lascia che lo calcoli il backend
   payload.vote.attributes = { tir, pas, dri, fin, vis, res, for };
   ```

2. **NON usare range 0-100**
   ```javascript
   // ❌ SBAGLIATO - Range errato
   <input type="range" min="0" max="100" />
   
   // ✅ CORRETTO - Range 10-100
   <input type="range" min="10" max="100" />
   ```

3. **NON inviare valori opzionali vuoti**
   ```javascript
   // ❌ SBAGLIATO - Invia sempre tutto
   payload.vote.additionalAttributes = { piedeDebole: null, skill: null };
   
   // ✅ CORRETTO - Invia solo se compilato
   if (piedeDebole) {
     payload.vote.additionalAttributes = { piedeDebole };
   }
   ```

### 💡 BEST PRACTICES

1. **Validazione Real-time**
   ```javascript
   // Valida mentre l'utente inserisce i dati
   const validateAttribute = (value) => {
     if (value < 10 || value > 100) {
       return 'Il valore deve essere tra 10 e 100';
     }
     return null;
   };
   ```

2. **Preview Overall Rating**
   ```javascript
   // Mostra una preview dell'overall (senza inviarlo)
   const previewOverall = computed(() => {
     const sum = Object.values(attributes).reduce((a, b) => a + b, 0);
     return Math.round(sum / 7);
   });
   ```

3. **Loading States**
   ```javascript
   // Gestisci stati di caricamento
   const [submitting, setSubmitting] = useState(false);
   const [loadingResults, setLoadingResults] = useState(false);
   ```

4. **Error Handling**
   ```javascript
   // Gestisci errori specifici
   const handleSubmitError = (error) => {
     if (error.response?.status === 400) {
       if (error.response.data.error.includes('already voted')) {
         showError('Hai già votato per questo giocatore');
       } else if (error.response.data.error.includes('range')) {
         showError('Alcuni valori sono fuori dal range consentito (10-100)');
       }
     } else {
       showError('Errore durante l\'invio del voto');
     }
   };
   ```

5. **State Management**
   ```javascript
   // Gestisci stato globale per sessioni
   const usePlayerCardSessions = () => {
     const [sessions, setSessions] = useState([]);
     const [currentSession, setCurrentSession] = useState(null);
     
     const loadSessions = async () => {
       const response = await api.get('/player-cards/sessions');
       setSessions(response.data.votingSessions);
     };
     
     return { sessions, currentSession, loadSessions };
   };
   ```

---

## 📊 Appendice: Esempi Dati Completi

### Esempio Request Completa
```javascript
POST /api/v1/player-cards/sessions/60a7b8c9d1e2f3a4b5c6d790/vote

{
  "vote": {
    "attributes": {
      "tir": 78,
      "pas": 85,
      "dri": 72,
      "fin": 76,
      "vis": 88,
      "res": 81,
      "for": 74
    },
    "additionalAttributes": {
      "piedeDebole": 3,
      "skill": 4
    },
    "playerProfile": {
      "position": "CC"
    },
    "comment": "Ottimo centrocampista con grande visione di gioco. Buon piede destro, discreto il sinistro. Skill moves molto buone per la categoria."
  },
  "deviceInfo": {
    "isMobile": false,
    "platform": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "screenResolution": "1920x1080",
    "browserLanguage": "it"
  },
  "timeSpent": 180
}
```

### Esempio Response Risultati Completi
```javascript
GET /api/v1/player-cards/sessions/60a7b8c9d1e2f3a4b5c6d790/calculation

{
  "success": true,
  "calculation": {
    "targetPlayerId": "60a7b8c9d1e2f3a4b5c6d789",
    "sessionId": "60a7b8c9d1e2f3a4b5c6d790",
    "finalAttributes": {
      "tir": 77,
      "pas": 83,
      "dri": 71,
      "fin": 75,
      "vis": 86,
      "res": 79,
      "for": 73
    },
    "finalOverallRating": 78,
    "grade": "C+",
    "statistics": {
      "voteCount": 8,
      "attributeBreakdown": {
        "tir": {
          "average": 76.8,
          "median": 77,
          "standardDeviation": 6.2,
          "min": 65,
          "max": 88,
          "distribution": {
            "90-100": 0,
            "80-90": 3,
            "70-80": 4,
            "60-70": 1,
            "50-60": 0,
            "below-50": 0
          }
        },
        "pas": {
          "average": 82.7,
          "median": 83,
          "standardDeviation": 4.8,
          "min": 76,
          "max": 91,
          "distribution": {
            "90-100": 1,
            "80-90": 6,
            "70-80": 1,
            "60-70": 0,
            "50-60": 0,
            "below-50": 0
          }
        }
        // ... altri attributi
      },
      "overallStats": {
        "confidence": 0.85,
        "consistencyScore": 7.8
      }
    },
    "positionConsensus": {
      "mostVoted": "CC",
      "distribution": {
        "CC": 5,
        "COC": 2,
        "CDC": 1
      }
    },
    "highlights": {
      "strongest": { "name": "vis", "value": 86 },
      "weakest": { "name": "dri", "value": 71 },
      "isElite": false
    }
  },
  "isOfficial": true,
  "calculatedAt": "2025-12-10T16:00:00.000Z"
}
```

---

*Fine analisi - Buon lavoro con il frontend! 🚀*