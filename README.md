# ⚽ The Football Ledger - Sistema Pagelle FC

## 🏆 FIFA-Style Player Cards & Voting System

**Sistema completo di gestione squadra calcistica con carte giocatori stile FIFA e votazioni collaborative**

### 🆕 Latest Updates (Dicembre 2025)
- ✅ **FIFA-Style Player Cards**: Design moderno con 4-tab system
- ✅ **Backend Integration**: MongoDB + Node.js completamente integrato  
- ✅ **Voting System**: Sistema votazioni avanzato con audit trail
- ✅ **Results Calculation**: API calcolo risultati finali con logica semplificata ✨
- ✅ **Real-time Calculations**: Overall rating calcolato automaticamente
- ✅ **Badge System**: Riconoscimenti e aggregazione completa
- ✅ **Mobile Responsive**: Ottimizzato per tutti i device

### 🎯 Core Features
- 🃏 **Player Cards**: Creazione collaborativa carte giocatori FIFA-style
- 🗳️ **Voting System**: MVP, MOTM, Match ratings con sistema avanzato
- 📊 **Match Management**: Gestione partite con statistiche dettagliate
- 👥 **Team Management**: Amministrazione squadre e membri
- 📱 **Responsive Design**: UI moderna con Shadcn/UI + Tailwind

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- MongoDB Atlas account (for database)

### Installation

```sh
# Clone the repository
git clone https://github.com/SimonePere/Pagelle_FC__Alpha-v0.1.0.git
cd Pagelle_FC__Alpha-v0.1.0

# Install frontend dependencies
cd client
npm install

# Install backend dependencies  
cd ../server
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your MongoDB connection string and other settings

# Start development servers
npm run dev  # Backend on port 5000
cd ../client
npm run dev  # Frontend on port 5173
