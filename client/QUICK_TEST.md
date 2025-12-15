# 🚀 QUICK TEST GUIDE - PAGELLE FC

## Preparazione Rapida

### 1. 🔧 Setup Backend
```bash
# Terminal 1 - Backend
cd ../pagelle-fc-backend
npm run dev

# Verifica che funzioni:
curl http://localhost:3000/health
```

### 2. 🔧 Setup Frontend  
```bash
# Terminal 2 - Frontend
cd the-football-ledger
npm run dev

# Verifica backend dal frontend:
node check-backend.js
```

### 3. 🧪 Accesso Console Debug
- **Browser:** Apri `http://localhost:5173`
- **Console:** F12 → Console
- **Test Redux:** 
  ```javascript
  window.store.getState()           // Stato completo
  window.getAuthState()             // Solo auth
  window.getTeamsState()            // Solo teams
  window.getMatchesState()          // Solo matches
  ```

---

## 🎯 Test Scenarios Veloci

### ⚡ TEST 1: AUTH (2 minuti)
1. **Vai:** `/login` → "Registrati"
2. **Crea:** `test1@email.com` / `testuser1` / `Marco Rossi`
3. **Verifica Console:** `window.getAuthState()`
4. **Logout:** Menu → Logout
5. **Verifica:** `window.getAuthState()` = null

### ⚡ TEST 2: TEAM (3 minuti)  
1. **Login:** come `test1@email.com`
2. **Crea Team:** "I Campioni" / "Team di test"
3. **Verifica Console:** `window.getTeamsState().myTeams`
4. **Copia:** Invite Code dalla UI

### ⚡ TEST 3: SECONDO USER (2 minuti)
1. **Incognito:** Nuova finestra privata  
2. **Registra:** `test2@email.com` / `testuser2` / `Luigi Bianchi`
3. **Unisciti:** Team con invite code
4. **Verifica Console:** `window.getTeamsState().myTeams`

### ⚡ TEST 4: MATCH (5 minuti)
1. **Finestra Marco:** Crea Partita vs "Juventus"
2. **Lineup:** Marco (GK), Luigi (MF)  
3. **Verifica Console:** `window.getMatchesState().matches`
4. **Voti:** 8.5 Marco, 7.0 Luigi
5. **Finestra Luigi:** Refresh → Verifica voti

---

## 🔍 Debug Commands

### Console Browser:
```javascript
// Quick state check
const quickCheck = () => {
  console.log('🔐 Auth:', window.getAuthState()?.user?.username || 'Not logged');
  console.log('🏆 Teams:', window.getTeamsState()?.myTeams?.length || 0);
  console.log('⚽ Matches:', window.getMatchesState()?.matches?.length || 0);
  console.log('💾 Token:', !!localStorage.getItem('token'));
};
quickCheck();

// Reset everything
const resetApp = () => {
  localStorage.clear();
  location.reload();
};
```

### PowerShell:
```powershell
# Backend health check
Invoke-RestMethod -Uri "http://localhost:3000/health" -Method Get

# Frontend build check  
npm run build

# Clear all
Remove-Item -Path ".\dist" -Recurse -Force -ErrorAction SilentlyContinue
```

---

## ✅ Success Checklist

- [ ] Backend risponde su :3000
- [ ] Frontend carica su :5173  
- [ ] Console mostra "🧪 DEBUG MODE: Store disponibile"
- [ ] Registrazione funziona
- [ ] Login/logout funziona
- [ ] States Redux si aggiornano
- [ ] LocalStorage si pulisce
- [ ] Team creation funziona
- [ ] Team invite funziona
- [ ] Match creation funziona
- [ ] Voti si salvano

## ❌ Common Issues

**❌ "Backend not responding"**
```bash
# Check if backend is running
netstat -an | findstr :3000
# Restart backend
cd ../pagelle-fc-backend && npm run dev
```

**❌ "Redux state not updating"**
```javascript  
// Check if actions are dispatched
window.store.dispatch({ type: 'test' })
// Check current state
window.store.getState()
```

**❌ "CORS Error"**
- Verifica backend CORS config
- Headers `Access-Control-Allow-Origin`

**❌ "Token not found"**
```javascript
localStorage.clear()  // Reset
```

## 🎉 When All Tests Pass

**Congratulations!** La tua architettura semplificata funziona:
- ✅ Frontend → Redux → API → Backend flow
- ✅ States management corretto  
- ✅ Authentication completa
- ✅ Team management
- ✅ Match & voting system

**Next Steps:** Production deployment! 🚀