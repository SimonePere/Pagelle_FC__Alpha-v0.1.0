# 🧪 TEST SCENARIOS - PAGELLE FC
## Flusso completo per testare Frontend → Redux → API → Backend

---

## 📋 **PREPARAZIONE TESTS**

### **Backend Setup Checklist:**
- [x] Backend running su `http://localhost:5000`
- [x] Database MongoDB connesso  
- [x] Endpoints `/auth`, `/teams`, `/matches` funzionanti
- [x] CORS abilitato per frontend

### **Frontend Setup Checklist:**  
- [x] Frontend running su `http://localhost:8080`
- [x] Redux Store configurato
- [x] API layer semplificato attivo
- [x] Console browser aperta per debug

---

## 🎯 **TEST CASE 1: LOGIN UTENTE ESISTENTE** ✅

### **Obiettivo:** Testare login con utente già registrato

### **Steps:**
1. ✅ **Vai su:** `http://localhost:8080/login`
2. ✅ **Login con credenziali esistenti:**
   ```
   Email: simonetest@test.com
   Password: [password esistente]
   ```
3. ✅ **Verifica:** Login successful e redirect alla home

### **Redux State Verificato:** ✅
```javascript
window.store.getState().auth
// ✅ RISULTATO:
{
  user: { id: "6931a9eb05bcaffadf3f823e", name: "Simone", email: "simonetest@test.com" },
  isAuthenticated: true,
  isLoading: false,
  error: null
}
```

---

## 🎯 **TEST CASE 2: REGISTRAZIONE NUOVO UTENTE** ✅

### **Obiettivo:** Testare flusso completo registrazione nuovo utente

### **Steps:**
1. ✅ **Logout** dall'utente precedente
2. ✅ **Vai alla registrazione:** "Non hai un account? Registrati"
3. ✅ **Compila form registrazione:**
   ```
   Email: marco.test@email.com
   Username: marco_test  
   Nome: Marco
   Cognome: Verdi
   Password: test123456
   ```
4. ✅ **Clicca:** "Registrati"

### **Verifiche Redux State:** ✅
```javascript
window.store.getState().auth
// ✅ RISULTATO: Nuovo utente registrato e autenticato
{
  user: { id: "...", name: "Marco", email: "marco.test@email.com" },
  isAuthenticated: true,
  isLoading: false,
  error: null
}
```

---

## 🎯 **TEST CASE 3: CREAZIONE E GESTIONE TEAM** ✅

### **Obiettivo:** Testare creazione team, unirsi a team, gestione membri

### **Steps:**
1. ✅ **API Test via Postman:** `POST http://localhost:5000/api/v1/teams`
2. ✅ **Body utilizzato:**
   ```json
   {
     "name": "DosiMele",
     "description": "Team di test per sviluppo"
   }
   ```
3. ✅ **Headers:** `Authorization: Bearer [token_utente]`

### **Risultato Creazione Team:** ✅
```javascript
// ✅ TEAM CREATO CORRETTAMENTE:
{
  _id: "6932f76cdd1f324fdff48481",
  name: "DosiMele",
  createdBy: "6932f5c0dd1f324fdff4847a",
  adminIds: ["6932f5c0dd1f324fdff4847a"],    // ✅ Auto-admin
  memberIds: ["6932f5c0dd1f324fdff4847a"],   // ✅ Auto-membro  
  inviteCode: "F2IP8A",                      // ✅ Auto-generato
  settings: { /* default values */ },
  colors: { /* default values */ },
  stats: { /* default values */ },
  isActive: true
}
```

### **Verifiche:** ✅
- ✅ Utente creatore automaticamente admin
- ✅ Utente creatore automaticamente membro  
- ✅ Codice invito generato automaticamente
- ✅ Settings di default applicati
- ✅ Team attivo e pronto per l'uso

---

## 🎯 **TEST CASE 4: PARTITE E VALUTAZIONI** 🔄

### **Obiettivo:** Testare creazione partite, invio valutazioni, calcolo statistiche

### **Steps:**
1. **Vai su:** `http://localhost:5173/login`
2. **Clicca:** "Non hai un account? Registrati"
3. **Compila form registrazione:**
   ```
   Email: test1@email.com
   Username: test_user_1
   Nome: Marco
   Cognome: Rossi
   Password: test123456
   ```
4. **Clicca:** "Registrati"

### **Verifiche Redux State:**
```javascript
// Apri Console Browser e digita:
window.store?.getState().auth
// Expected:
{
  user: { _id: "...", username: "test_user_1", email: "test1@email.com" },
  isAuthenticated: true,
  isLoading: false,
  error: null
}
```

### **Verifiche LocalStorage:**
```javascript
localStorage.getItem('token')    // Should be: "eyJ..."
localStorage.getItem('user')     // Should be: "{\"_id\":\"...\"}"
```

### **Test Logout:**
5. **Clicca:** Menu/Avatar → "Logout"
6. **Verifica:** Redirect a `/login`

### **Verifiche Post-Logout:**
```javascript
window.store?.getState().auth
// Expected:
{ user: null, isAuthenticated: false, isLoading: false, error: null }

localStorage.getItem('token')    // Should be: null
```

---

## 🏆 **TEST CASE 2: CREAZIONE TEAM**

### **Obiettivo:** Testare creazione team e gestione stati

### **Prerequisites:** Utente Marco (test_user_1) autenticato

### **Steps:**
1. **Naviga:** Dashboard/Home
2. **Clicca:** "Crea Team" o "Nuovo Team"
3. **Compila form:**
   ```
   Nome Team: I Campioni
   Descrizione: Team di test per sviluppo
   Pubblico: ✅ (checked)
   Max Membri: 15
   ```
4. **Clicca:** "Crea Team"

### **Verifiche Redux State:**
```javascript
window.store?.getState().teams
// Expected:
{
  teams: [...],
  myTeams: [{ _id: "...", name: "I Campioni", creator: "...", members: [...] }],
  currentTeam: { ... },
  isLoading: false
}
```

### **Test API Call (Network Tab):**
- **Request:** `POST /api/v1/teams`
- **Headers:** `Authorization: Bearer ...`
- **Body:** `{ "name": "I Campioni", "description": "...", "isPublic": true }`
- **Response:** `{ "success": true, "data": { "_id": "...", "inviteCode": "ABC123" } }`

---

## 👥 **TEST CASE 3: SECONDO UTENTE E INVITO**

### **Obiettivo:** Testare registrazione secondo utente + invito al team

### **Steps Parte A - Secondo Utente:**
1. **Apri finestra incognito/privata**
2. **Vai:** `http://localhost:5173/login`
3. **Registra nuovo utente:**
   ```
   Email: test2@email.com
   Username: test_user_2  
   Nome: Luigi
   Cognome: Bianchi
   Password: test123456
   ```

### **Steps Parte B - Invito al Team:**
4. **Torna alla finestra Marco (test_user_1)**
5. **Vai:** Sezione Team → "I Campioni" → "Gestisci Team"
6. **Copia:** Invite Code (es: "ABC123")
7. **Torna alla finestra Luigi (test_user_2)**
8. **Vai:** Sezione Team → "Unisciti a Team"
9. **Incolla:** Invite Code "ABC123"
10. **Clicca:** "Unisciti"

### **Verifiche Redux State (Finestra Luigi):**
```javascript
window.store?.getState().teams.myTeams
// Expected: [{ name: "I Campioni", role: "member" }]
```

### **Verifiche Redux State (Finestra Marco):**
```javascript
window.store?.getState().teams.currentTeam.members
// Expected: [
//   { user: { username: "test_user_1" }, role: "owner" },
//   { user: { username: "test_user_2" }, role: "member" }
// ]
```

---

## ⚽ **TEST CASE 4: PARTITA E VOTI**

### **Obiettivo:** Testare creazione partita e sistema di voti

### **Prerequisites:** Team "I Campioni" con 2 membri

### **Steps Parte A - Creazione Partita (Marco):**
1. **Finestra Marco:** Dashboard → "Crea Partita"
2. **Compila form:**
   ```
   Team: I Campioni
   Avversario: Juventus FC
   Data: [Data odierna + 1 giorno]
   Ora: 15:00
   Location: Campo Sportivo
   Tipo: Amichevole
   ```
3. **Seleziona formazione:** 
   - Marco Rossi (Portiere)
   - Luigi Bianchi (Centrocampo)
4. **Clicca:** "Crea Partita"

### **Verifiche Redux State:**
```javascript
window.store?.getState().matches
// Expected:
{
  matches: [{ 
    _id: "...", 
    opponent: "Juventus FC", 
    lineup: [
      { user: "test_user_1", position: "GK" },
      { user: "test_user_2", position: "MF" }
    ],
    status: "scheduled"
  }],
  isLoading: false
}
```

### **Steps Parte B - Voti Post-Partita:**
5. **Vai:** Partite → Dettaglio partita "vs Juventus FC"
6. **Clicca:** "Inizia Voti" o "Valuta Prestazioni"
7. **Assegna voti:**
   ```
   Marco Rossi: 8.5 (Ottima parata al 85°)
   Luigi Bianchi: 7.0 (Buona partita a centrocampo)
   ```
8. **Clicca:** "Invia Voti"

### **Verifiche API Call:**
- **Request:** `POST /api/v1/matches/{matchId}/ratings`
- **Body:** 
```json
{
  "ratings": [
    { "playerId": "test_user_1", "rating": 8.5, "notes": "Ottima parata al 85°" },
    { "playerId": "test_user_2", "rating": 7.0, "notes": "Buona partita" }
  ]
}
```

### **Steps Parte C - Verifica Luigi:**
9. **Finestra Luigi:** Refresh page
10. **Vai:** Partite → Dettaglio partita "vs Juventus FC"  
11. **Verifica:** Voti visibili e corretti

---

## 🔍 **CHECKLIST DEBUGGING**

### **Se qualcosa non funziona:**

#### **❌ Errori Redux:**
```javascript
// Console commands per debug:
window.store?.getState()           // Stato completo
window.store?.getState().auth      // Solo auth
window.store?.getState().teams     // Solo teams  
window.store?.getState().matches   // Solo matches
```

#### **❌ Errori API:**
1. **Apri:** Network Tab (F12 → Network)
2. **Filtra:** XHR/Fetch requests
3. **Verifica:** Status codes, headers, response body
4. **Check:** CORS errors, 401 Unauthorized, 500 Internal errors

#### **❌ Errori LocalStorage:**
```javascript
// Console commands:
localStorage.clear()                    // Reset storage
localStorage.setItem('debug', 'true')   // Enable debug mode
```

#### **❌ Backend Non Risponde:**
```bash
# Terminal check:
curl http://localhost:5000/health
curl http://localhost:5000/api/v1/auth/me -H "Authorization: Bearer TOKEN"
```

---

## 📊 **SUCCESS CRITERIA**

### **✅ Test Superato Se:**
- [ ] Registrazione e login funzionano
- [ ] Stati Redux si aggiornano correttamente
- [ ] LocalStorage salva/rimuove token
- [ ] Team creation + invites funzionano
- [ ] Partite si creano e si gestiscono
- [ ] Voti si salvano e si visualizzano
- [ ] Network calls hanno status 200/201
- [ ] Non ci sono errori console

### **🎯 Metriche Performance:**
- **Login/Register:** < 2 secondi
- **Team Creation:** < 3 secondi  
- **Match Creation:** < 3 secondi
- **Vote Submission:** < 2 secondi

---

## 🚀 **AUTOMATION SCRIPT**

Per automatizzare i test, puoi usare questo snippet:

```javascript
// Paste in browser console per test rapido
const runTestSuite = async () => {
  console.log('🧪 Starting Test Suite...');
  
  // Test 1: Check Auth State
  const authState = window.store?.getState()?.auth;
  console.log('Auth State:', authState);
  
  // Test 2: Check LocalStorage
  console.log('Token:', localStorage.getItem('token'));
  console.log('User:', localStorage.getItem('user'));
  
  // Test 3: API Health Check
  try {
    const health = await fetch('http://localhost:3000/health');
    console.log('Backend Health:', health.status);
  } catch (e) {
    console.error('Backend Down:', e);
  }
  
  console.log('✅ Test Suite Complete');
};

// Run it
runTestSuite();
```