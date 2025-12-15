# 📊 Frontend-Backend Integration Guide

## 🆕 AGGIORNAMENTI FIFA-STYLE (Dicembre 2025)

### **Sistema PlayerCard FIFA-style Integrato**

Il sistema di player cards è stato completamente ridisegnato e integrato con il backend:

#### **1. Struttura Dati Aggiornata**
```typescript
// Frontend: PlayerCardRatingVote
{
  attributes: {
    tir: number,     // 10-100
    pas: number,     // 10-100  
    dri: number,     // 10-100
    fin: number,     // 10-100
    vis: number,     // 10-100
    res: number,     // 10-100
    for: number,     // 10-100
    piedeDebole: number,  // 1-5
    skill: number         // 1-5
  },
  playerProfile: {
    position: 'POR' | 'DIF' | 'CEN' | 'ATT',
    preferredRole: string,
    age: number
  },
  overallComment?: string,
  overallRating: number
}

// Backend: VoteSubmission Model (MongoDB)
attributes: {
  tir: { type: Number, min: 10, max: 100 },
  pas: { type: Number, min: 10, max: 100 },
  dri: { type: Number, min: 10, max: 100 },
  fin: { type: Number, min: 10, max: 100 },
  vis: { type: Number, min: 10, max: 100 },
  res: { type: Number, min: 10, max: 100 },
  for: { type: Number, min: 10, max: 100 },
  piedeDebole: { type: Number, min: 1, max: 5 },
  skill: { type: Number, min: 1, max: 5 }
},
playerProfile: {
  position: { type: String, required: false },
  preferredRole: { type: String, required: false },
  age: { type: Number, min: 16, max: 50, required: false }
},
overallRating: { type: Number, min: 10, max: 100 }
```

#### **2. Flusso Integrazione Completo**
```
1. 🎮 User compila PlayerCard FIFA-style (4 tabs)
2. 📊 Frontend calcola overall rating real-time
3. ✅ Validazione frontend (campi obbligatori, range)
4. 📤 Submit → Redux → API POST /voting-sessions/:id/vote
5. 🔍 Backend valida con Mongoose schema
6. 💾 Salvataggio MongoDB con attributi FIFA-style
7. 📨 Response → Redux → UI feedback
8. 🔄 Update stato sessione votazione
```

---

## Spiegazione Completa del Funzionamento

### **1. Flusso Dati Backend → Frontend**
```
1. 🌐 Backend/API risponde con:
   { success: true, team: { id, name, memberIds: [...] } }

2. 🔄 Redux fetchTeamById estrae:
   response.team → { id, name, memberIds: [...] }

3. 💾 Redux salva in state.currentTeam:
   { id, name, memberIds: [...] }

4. ⚛️ CreateMatch riceve via useSelector:
   currentTeam con memberIds popolati

5. 🔄 CreateMatch converte:
   WritableDraft<User>[] → User[] (per TypeScript)

6. 🎯 UI mostra:
   Lista membri selezionabili per la partita
```

### **2. Perché i "Draft Objects" di Redux**
Redux Toolkit usa **Immer** che crea oggetti "draft" per la mutabilità controllata:
- `WritableDraft<User>` = tutte proprietà opzionali
- `User` = tutte proprietà obbligatorie
- **Soluzione**: conversione esplicita con fallback

### **3. Perché `response.team` invece di `response`**
Il tuo backend API ha uno **standard di risposta**:
```javascript
// Tutte le API rispondono così:
{
  success: boolean,
  message?: string,
  data?: any,      // Per liste
  team?: Team,     // Per singoli team
  user?: User,     // Per singoli user
}
```

### **4. I Log Che Rimangono (Essenziali)**
I log che ho tenuto ti dicono sempre:
- 🔐 Se l'utente è autenticato
- 📋 Quale team sta caricando  
- ✅ Se il team è stato caricato dal backend
- 👥 Quanti membri sono stati convertiti
- ✅ I nomi dei membri pronti per la selezione

## 🎯 **Risultato Finale**
Ora hai una **pipeline completa**:
1. **Login** → Utente autenticato con `teamIds`
2. **API Call** → Backend restituisce team con membri popolati  
3. **Redux** → Stato aggiornato correttamente
4. **UI** → Lista membri reali pronti per la selezione
5. **CreateMatch** → Pronto per creare partite con veri giocatori!

## 🔧 **Problemi Risolti**

### Problema: Struttura Risposta Backend vs Frontend
```javascript
// ❌ QUELLO CHE CREDEVAMO ricevere:
{
  id: "...",
  name: "DosiMele", 
  memberIds: [...],
  adminIds: [...]
}

// ✅ QUELLO CHE RICEVEVAMO DAVVERO:
{
  success: true,
  team: {
    id: "...",
    name: "DosiMele",
    memberIds: [...],
    adminIds: [...]
  }
}
```

### Soluzione: Redux Slice Corretto
```typescript
// ❌ PRIMA (sbagliato):
return response; // Salvavamo { success: true, team: {...} }

// ✅ DOPO (corretto):
return response.team; // Salviamo solo { id, name, memberIds, ... }
```

### Conversione TypeScript Draft Objects
```typescript
// Conversione da WritableDraft<User>[] a User[]
const convertedUsers: User[] = currentTeam.memberIds.map(member => ({
  id: member._id || member.id || '',
  name: member.name || '',
  email: member.email || '',
  teamId: member.teamId || (member.teamIds && member.teamIds[0]) || '',
  teamIds: member.teamIds || []
}));
```

## 🚀 **Prossimi Passi**
La prossima fase sarà testare la **creazione partita completa** e poi il **sistema di valutazione**!

---
*Generated: 7 dicembre 2025*
*Status: Frontend-Backend Integration ✅ Completato*