# ⚽ Pagelle FC - Sistema di Valutazione Collaborativa per Squadre di Calcio

<div align="center">

<img src="client\public\FLAT_BG_W.png" alt="Pagelle FC Logo" width="150" style="border: 3px solid #2563eb; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); margin: 20px 0;">

**🏆 Sistema completo di gestione squadra calcistica con carte giocatori stile FIFA e votazioni collaborative**

[![Version](https://img.shields.io/badge/version-Alpha%20v0.1.0-blue.svg)](https://github.com/SimonePere/Pagelle_FC__Alpha-v0.1.0)
[![License](https://img.shields.io/badge/license-UNLICENSED-red.svg)]()
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248.svg)](https://www.mongodb.com)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg)](https://reactjs.org)

[🚀 Inizia](#-installazione) • [🎯 Features](#-funzionalità-principali) • [📖 Documentazione](#-documentazione) • [🗺️ Roadmap](#-roadmap)

</div>

---

## 📝 Descrizione

**Pagelle FC** è un sistema di valutazione collaborativa progettato specificamente per squadre di calcio amatoriale. Combina la potenza delle moderne tecnologie web con l'esperienza coinvolgente dei videogame di calcio per creare un ambiente dove i giocatori possono:

- 🃏 **Creare carte giocatore personalizzate** stile FIFA con attributi dettagliati
- 🗳️ **Votare le prestazioni** dopo ogni partita in modo democratico
- 📊 **Analizzare statistiche avanzate** e tendenze di performance
- 👥 **Gestire la squadra** con ruoli e permessi specifici
- 🏆 **Assegnare riconoscimenti** come MVP, MOTM e altri badge

Il tutto con un'interfaccia moderna, responsive e pensata per essere utilizzata facilmente da giocatori di tutte le età.

## 🎯 Funzionalità Principali

### 🃏 **Sistema Carte Giocatori FIFA-Style**
- **Attributi personalizzabili**: 10+ attributi per giocatori di movimento (Tiro, Passaggio, Dribbling, ecc.)
- **Portieri specializzati**: Attributi specifici (Tuffo, Presa, Rinvio, Piazzamento, Riflessi)
- **Sistema a stelle**: Piede debole e Skill Moves personalizzabili
- **Posizioni multiple**: Supporto per tutti i ruoli dal portiere all'attaccante
- **Valutazione collaborativa**: Ogni carta è creata attraverso il voto di tutti i membri del team

### 🗳️ **Sistema di Votazione Avanzato**
- **Voti partita**: Sistema 1-10 per valutare le performance individuali
- **MVP e MOTM**: Votazione per giocatore più valioso e migliore in campo
- **Sistema di astensione**: Possibilità di non votare mantenendo l'inclusività
- **Audit trail completo**: Tracciamento di tutti i voti per trasparenza
- **Auto-completamento intelligente**: Calcolo risultati anche con voti parziali

### 📊 **Gestione Partite e Statistiche**
- **Creazione partite guidata**: Wizard intuitivo per setup rapido
- **Storico completo**: Archivio di tutte le partite con possibilità di modifica
- **Dashboard statistiche**: Analisi performance individuali e di squadra
- **Trending e confronti**: Sistema di comparazione giocatori avanzato
- **Export dati**: Funzionalità di backup e esportazione

### � **External Player — Giocatori Ospiti**
- **Nessuna registrazione richiesta**: aggiungi giocatori occasionali come ospiti direttamente dalla creazione partita
- **Link invito personale**: ogni ospite riceve un link univoco (`/join?token=XXX`) per votare la partita
- **JWT con scope limitato**: gli ospiti ottengono un token temporaneo (48h) con permessi read-only
- **Merge automatico**: se l'ospite si registra in futuro, tutto lo storico (voti, partite, medie) viene trasferito automaticamente al nuovo account — l'ID User è lo stesso
- **Badge "Ospite"** visibile nella lista giocatori e nei dettagli partita
- **Zero refactoring**: l'ospite è un `User` reale nel DB con flag `isGuest: true`, compatibile con tutte le query esistenti

### �👥 **Team Management**
- **Gestione membri**: Inviti, ruoli e permessi granulari
- **Profili personalizzabili**: Informazioni dettagliate e foto profilo
- **Sistema team multipli**: Supporto per più squadre per utente
- **Bonus esperienza**: Sistema di riconoscimento per giocatori over 50

### 🎨 **UI/UX Moderno**
- **Design responsive**: Ottimizzato per mobile, tablet e desktop
- **Animazioni fluide**: Interfaccia coinvolgente con Framer Motion
- **Theme system**: Supporto modalità chiara e scura
- **PWA Ready**: Installabile come app nativa
- **Accessibilità**: Progettato per utenti di tutte le età e abilità

## 🛠️ Stack Tecnologico

### Frontend
- **React 18+** - Libreria UI moderna e performante
- **TypeScript** - Type safety e migliore esperienza sviluppo  
- **Vite** - Build tool veloce e moderno
- **Tailwind CSS** - Framework CSS utility-first
- **Shadcn/ui** - Componenti UI eleganti e accessibili
- **Framer Motion** - Animazioni fluide e professionali
- **Redux Toolkit** - State management prevedibile
- **React Hook Form** - Gestione form performante

### Backend
- **Node.js 18+** - Runtime JavaScript server-side
- **Express.js** - Framework web minimalista e flessibile
- **MongoDB Atlas** - Database NoSQL cloud-native
- **Mongoose** - ODM per MongoDB con schema validation
- **JWT** - Autenticazione stateless e sicura
- **bcrypt** - Hashing password sicuro
- **Service Layer Architecture** - Architettura scalabile e manutenibile

### DevOps & Tools
- **Git** - Controllo versione distribuito
- **ESLint + Prettier** - Code quality e formatting
- **Helmet** - Sicurezza HTTP headers
- **Rate Limiting** - Protezione da attacchi DoS
- **CORS** - Cross-Origin Resource Sharing
- **Morgan** - HTTP request logger

## 🚀 Installazione

### Prerequisiti

- **Node.js 18+** ([Scarica qui](https://nodejs.org))
- **npm** o **yarn** (incluso con Node.js)
- **Account MongoDB Atlas** (gratuito)
- **Git** per clonare il repository

### Setup Rapido

```bash
# 1. Clona il repository
git clone https://github.com/SimonePere/Pagelle_FC__Alpha-v0.1.0.git
cd Pagelle_FC__Alpha-v0.1.0

# 2. Installa dipendenze backend
cd server
npm install

# 3. Configura variabili ambiente
cp .env.example .env
# Modifica .env con le tue configurazioni MongoDB e JWT

# 4. Installa dipendenze frontend
cd ../client
npm install

# 5. Avvia il backend (terminale 1)
cd ../server
npm run dev  # Server su porta 5000

# 6. Avvia il frontend (terminale 2)
cd ../client
npm run dev  # Client su porta 8080
```

### Configurazione Database

1. Crea un account su [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Crea un nuovo cluster (tier gratuito disponibile)
3. Ottieni la connection string
4. Aggiungi la stringa nel file `.env`:

```env
MONGODB_URI_TEST=mongodb+srv://username:password@cluster0.mongodb.net/Pagelle-FC-test
JWT_SECRET=your-super-secret-jwt-key-change-this
CLIENT_URL_DEV=http://localhost:8080
```

### Seed Database (Opzionale)

```bash
# Popola il database con dati di test
cd server
npm run seed:test
```

## 🎮 Utilizzo

### 1. **Registrazione e Team Setup**
- Crea un account: ti registri e crei subito il tuo team, diventandone il capitano
- Invita i compagni di squadra creando una partita e condividendo il link

### 2. **Creazione Carte Giocatore**
- Vai su "Player Cards" per creare le carte dei giocatori
- Ogni membro del team può valutare gli attributi
- Il sistema calcola automaticamente l'Overall Rating

### 3. **Gestione Partite**
- Crea una nuova partita dal dashboard principale
- Aggiungi i giocatori del team e, se vuoi, **giocatori ospiti** (senza account)
- Condividi il link invito personale con ogni ospite
- Avvia la sessione di votazione post-partita

### 4. **Votazioni e Risultati**
- Ogni giocatore vota i compagni di squadra (1-10)
- Nomina MVP e Man of the Match
- Visualizza i risultati aggregati in tempo reale

### 5. **Analisi e Statistiche**
- Consulta lo storico delle partite
- Analizza le performance individuali
- Confronta i giocatori con grafici dettagliati

## 📖 Documentazione

Il progetto include documentazione dettagliata per sviluppatori e utenti:

- 📋 **[System Architecture Guide](SYSTEM_ARCHITECTURE_GUIDE.md)** - Architettura del sistema
- 🗺️ **[Roadmap Priorità](ROADMAP_PRIORITA_DEFINITIVA.md)** - Piano di sviluppo
- 💡 **[Archivio Idee](ARCHIVIO_IDEE_COMPLETE.md)** - Features future
- 🔧 **[Guida Implementazione](GUIDA_IMPLEMENTAZIONE_FEATURE_COMPLETA.md)** - Guide tecniche

### API Documentation

Il backend espone API RESTful complete:

- **Auth**: `/api/v1/auth/*` - Autenticazione e registrazione
- **Users**: `/api/v1/users/*` - Gestione profili utente
- **Teams**: `/api/v1/teams/*` - Operazioni squadra
- **Matches**: `/api/v1/matches/*` - Gestione partite
- **Voting**: `/api/v1/voting-sessions/*` - Sistema votazioni
- **Player Cards**: `/api/v1/player-card-sessions/*` - Carte giocatori
- **Invite**: `/api/v1/invite/*` - Link invito ospiti, claim account guest

## 🗺️ Roadmap

### ✅ **Rilasciato (Alpha v0.1.0)**
- [x] Sistema base votazioni e carte giocatori
- [x] Architettura Service Layer robusta
- [x] UI responsive con Shadcn/UI
- [x] Sistema autenticazione JWT
- [x] Database MongoDB con backup automatico
- [x] **CRUD Avanzato**: Edit/Delete partite e profili utente
- [x] **Sistema Astensioni**: Voto opzionale per inclusività
- [x] **Attributi Portieri**: Specializzazione ruoli
- [x] **WEB APP PWA**: Versione scaricabile iOS/Android
- [x] **External Player (Guest User)**: Ospiti senza registrazione con link invito personale, JWT scope limitato e merge automatico storico alla registrazione
- [x] **UI semplificata**: registrazione solo "Crea Team", dialog modali coerenti, modale elimina/logout, social links, Buy Me a Coffee

### 🔮 **Pianificato (v1.2.0+)**
- [ ] **Dashboard Comparazioni**: Analisi avanzate giocatori
- [ ] **Sistema Flagging**: Gestione dispute valutazioni
- [ ] **Integrazione Social**: Condivisione risultati
- [ ] **AI Insights**: Suggerimenti performance

## 👨‍💻 Sviluppo

### Comandi Principali

```bash
# Backend
npm run dev          # Sviluppo con hot-reload
npm run prod         # Produzione
npm run seed         # Popola database
npm run db:backup    # Backup database

# Frontend  
npm run dev          # Sviluppo
npm run build        # Build produzione
npm run preview      # Preview build
npm run lint         # Controllo codice
```

### Contribuire

1. Fork del repository
2. Crea branch feature (`git checkout -b feature/amazing-feature`)
3. Commit modifiche (`git commit -m 'Add amazing feature'`)
4. Push al branch (`git push origin feature/amazing-feature`)
5. Apri Pull Request

### Architettura Codice

Il progetto segue il pattern **Service Layer + Repository**:

```
server/src/
├── controllers/     # HTTP request handling
├── services/        # Business logic
├── repositories/    # Data access layer  
├── models/          # MongoDB schemas
├── middleware/      # Express middleware
├── routes/          # API route definitions
└── utils/           # Utilità condivise
```

## 🔒 Sicurezza

- **🔐 Autenticazione JWT** con refresh token
- **🛡️ Rate Limiting** per prevenire attacchi
- **🔒 Password Hashing** con bcrypt
- **🌐 CORS Configurato** per domini autorizzati
- **📋 Input Validation** con Mongoose schemas
- **🔍 Audit Trail** completo per tutte le operazioni

## 🤝 Community e Supporto

- **� Instagram**: [@limone_pere](https://www.instagram.com/limone_pere/)
- **💼 LinkedIn**: [Simone Mele](https://www.linkedin.com/in/simone-mele/)
- **🐙 GitHub**: [SimonePere](https://github.com/SimonePere)
- **☕ Supporta il progetto**: [Buy Me a Coffee](https://buymeacoffee.com/simonemele) — se l'app ti piace, offrimi un caffè!
- **🐛 Issues**: [GitHub Issues](https://github.com/SimonePere/Pagelle_FC__Alpha-v0.1.0/issues)

## 📄 Licenza

Questo progetto è attualmente sotto licenza **UNLICENSED** - tutti i diritti riservati.

---

## 🌟 Caratteristiche Speciali

### 🎯 **Inclusività Over 50**
Sistema pensato per coinvolgere giocatori di tutte le età con:
- Bonus "Esperienza" discreto e positivo
- Sistema astensioni per non escludere nessuno
- UI intuitiva e accessibile
- Supporto completo mobile e desktop

### 🏆 **Gamification Avanzata**
- Badge e riconoscimenti personalizzati
- Sistema progressione giocatori
- Sfide e obiettivi stagionali
- Classifiche dinamiche e coinvolgenti

### 📱 **Mobile First**
- PWA installabile come app nativa
- Gesture touch ottimizzate
- Performance elevate su dispositivi mobili
- Sincronizzazione offline (coming soon)

---

<div align="center">

**Fatto con ❤️ per le squadre di calcio amatoriale**

*Trasforma la tua squadra in un team professionale con Pagelle FC*

[🚀 **Inizia Ora**](#-installazione) | [📖 **Documentazione**](#-documentazione) | [🤝 **Contribuisci**](#-sviluppo)

</div>