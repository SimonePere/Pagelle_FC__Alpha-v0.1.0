# 🚀 Guida Avvio Backend - Pagelle FC

## 📋 **Modalità di Avvio Disponibili**

### **1. 🔧 Sviluppo (Development)**
```bash
npm run dev
```
- **Cosa fa**: Avvia il server con nodemon per hot-reload automatico
- **Ambiente**: Development
- **Database**: Database di sviluppo
- **Quando usarlo**: Durante lo sviluppo quotidiano del codice

### **2. 🧪 Test**
```bash
npm run test:env
```
- **Cosa fa**: Avvia il server con NODE_ENV=test e nodemon
- **Ambiente**: Test
- **Database**: Database di test (isolato da produzione)
- **Quando usarlo**: Per testare funzionalità senza compromettere dati reali

### **3. 🎯 Produzione**
```bash
npm run start
# oppure
npm run prod
```
- **`npm run start`**: Avvio normale con Node.js
- **`npm run prod`**: Imposta NODE_ENV=production e avvia
- **Ambiente**: Production
- **Database**: Database di produzione
- **Quando usarlo**: Deploy finale o test in ambiente reale

---

## 🗄️ **Gestione Database**

### **Popolamento Dati**
```bash
# Ambiente normale
npm run seed

# Ambiente test
npm run seed:test
```

### **Backup e Ripristino**
```bash
# Backup database (ambiente test)
npm run db:backup

# Ripristino database (ambiente production)
npm run db:restore

# Migrazione database (ambiente test)
npm run db:migrate

# Lista backup disponibili
npm run db:list
```

---

## ⚙️ **Configurazioni Ambiente**

| Comando | NODE_ENV | Database | Hot-Reload | Uso Raccomandato |
|---------|----------|----------|------------|------------------|
| `npm run dev` | development | Dev DB | ✅ | Sviluppo quotidiano |
| `npm run test:env` | test | Test DB | ✅ | Testing e debugging |
| `npm run start` | (default) | Prod DB | ❌ | Deploy semplice |
| `npm run prod` | production | Prod DB | ❌ | Deploy ottimizzato |

---

## 🎯 **Workflow Raccomandato**

### **Durante Sviluppo**
1. `npm run dev` - per sviluppo normale
2. `npm run seed` - per popolare dati se necessario

### **Per Testing**
1. `npm run test:env` - ambiente isolato
2. `npm run seed:test` - dati di test
3. `npm run db:backup` - backup prima di test critici

### **Prima del Deploy**
1. `npm run db:backup` - backup sicurezza
2. `npm run prod` - test finale
3. Deploy su server

---

## 📁 **File Importanti**

- **Entry Point**: `server.js`
- **Configurazione DB**: `src/config/database.js`
- **Backup Directory**: `db-backups/`

---

## 🆘 **Troubleshooting**

### **Server non si avvia**
1. Controlla che MongoDB sia in esecuzione
2. Verifica file `.env` con configurazioni corrette
3. Controlla log errori nel terminale

### **Database vuoto**
1. Esegui `npm run seed` per popolare dati
2. Verifica connessione database in `src/config/database.js`

### **Errori in ambiente test**
1. Usa `npm run test:env` per ambiente isolato
2. Ripulisci database test se necessario
3. Ripristina da backup con `npm run db:restore`

---

> **💡 Tip**: Usa sempre `npm run dev` per sviluppo quotidiano e `npm run test:env` quando devi testare funzionalità critiche!