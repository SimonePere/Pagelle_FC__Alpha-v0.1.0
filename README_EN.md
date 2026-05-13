# ⚽ Pagelle FC - Collaborative Team Management System

<div align="center">

<img src="client\public\FLAT_BG_W.png" alt="Pagelle FC Logo" width="150" style="border: 3px solid #2563eb; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); margin: 20px 0;">

**🏆 Complete football team management system with FIFA-style player cards and collaborative voting**

[![Version](https://img.shields.io/badge/version-Alpha%20v0.1.0-blue.svg)](https://github.com/SimonePere/Pagelle_FC__Alpha-v0.1.0)
[![License](https://img.shields.io/badge/license-UNLICENSED-red.svg)]()
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248.svg)](https://www.mongodb.com)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg)](https://reactjs.org)

[🚀 Get Started](#-installation) • [🎯 Features](#-key-features) • [📖 Documentation](#-documentation) • [🗺️ Roadmap](#-roadmap)

</div>

---

## 📝 Description

**Pagelle FC** is a collaborative evaluation system designed specifically for amateur football teams. It combines the power of modern web technologies with the engaging experience of football video games to create an environment where players can:

- 🃏 **Create personalized player cards** FIFA-style with detailed attributes
- 🗳️ **Vote on performances** after each match democratically
- 📊 **Analyze advanced statistics** and performance trends
- 👥 **Manage the team** with specific roles and permissions
- 🏆 **Award recognitions** like MVP, MOTM and other badges

All with a modern, responsive interface designed to be easily used by players of all ages.

## 🎯 Key Features

### 🃏 **FIFA-Style Player Cards System**
- **Customizable attributes**: 10+ attributes for outfield players (Shooting, Passing, Dribbling, etc.)
- **Specialized goalkeepers**: Specific attributes (Diving, Handling, Kicking, Positioning, Reflexes)
- **Star ratings system**: Customizable weak foot and skill moves
- **Multiple positions**: Support for all roles from goalkeeper to striker
- **Collaborative evaluation**: Each card is created through team member voting

### 🗳️ **Advanced Voting System**
- **Match ratings**: 1-10 scale system for individual performance evaluation
- **MVP and MOTM**: Voting for most valuable player and man of the match
- **Abstention system**: Option not to vote while maintaining inclusivity
- **Complete audit trail**: Tracking of all votes for transparency
- **Smart auto-completion**: Result calculation even with partial votes

### 📊 **Match Management and Statistics**
- **Guided match creation**: Intuitive wizard for quick setup
- **Complete history**: Archive of all matches with editing capabilities
- **Statistics dashboard**: Individual and team performance analysis
- **Trending and comparisons**: Advanced player comparison system
- **Data export**: Backup and export functionality

### � **External Player — Guest Users**
- **No registration required**: add occasional players as guests directly from match creation
- **Personal invite link**: each guest receives a unique link (`/join?token=XXX`) to vote the match
- **Scoped JWT**: guests get a temporary token (48h) with read-only permissions
- **Automatic merge**: if the guest registers in the future, all history (votes, matches, averages) is automatically transferred to the new account
- **Guest badge** visible in player lists and match details

### �👥 **Team Management**
- **Member management**: Invites, roles and granular permissions
- **Customizable profiles**: Detailed information and profile photos
- **Multi-team system**: Support for multiple teams per user
- **Experience bonus**: Recognition system for players over 50

### 🎨 **Modern UI/UX**
- **Responsive design**: Optimized for mobile, tablet and desktop
- **Smooth animations**: Engaging interface with Framer Motion
- **Theme system**: Light and dark mode support
- **PWA Ready**: Installable as native app
- **Accessibility**: Designed for users of all ages and abilities

## 🛠️ Technology Stack

### Frontend
- **React 18+** - Modern and performant UI library
- **TypeScript** - Type safety and better development experience
- **Vite** - Fast and modern build tool
- **Tailwind CSS** - Utility-first CSS framework
- **Shadcn/ui** - Elegant and accessible UI components
- **Framer Motion** - Smooth and professional animations
- **Redux Toolkit** - Predictable state management
- **React Hook Form** - Performant form handling

### Backend
- **Node.js 18+** - Server-side JavaScript runtime
- **Express.js** - Minimalist and flexible web framework
- **MongoDB Atlas** - Cloud-native NoSQL database
- **Mongoose** - MongoDB ODM with schema validation
- **JWT** - Stateless and secure authentication
- **bcrypt** - Secure password hashing
- **Service Layer Architecture** - Scalable and maintainable architecture

### DevOps & Tools
- **Git** - Distributed version control
- **ESLint + Prettier** - Code quality and formatting
- **Helmet** - HTTP header security
- **Rate Limiting** - DoS attack protection
- **CORS** - Cross-Origin Resource Sharing
- **Morgan** - HTTP request logger

## 🚀 Installation

### Prerequisites

- **Node.js 18+** ([Download here](https://nodejs.org))
- **npm** or **yarn** (included with Node.js)
- **MongoDB Atlas account** (free tier available)
- **Git** to clone the repository

### Quick Setup

```bash
# 1. Clone the repository
git clone https://github.com/SimonePere/Pagelle_FC__Alpha-v0.1.0.git
cd Pagelle_FC__Alpha-v0.1.0

# 2. Install backend dependencies
cd server
npm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env with your MongoDB and JWT configurations

# 4. Install frontend dependencies
cd ../client
npm install

# 5. Start backend (terminal 1)
cd ../server
npm run dev  # Server on port 5000

# 6. Start frontend (terminal 2)
cd ../client
npm run dev  # Client on port 8080
```

### Database Configuration

1. Create an account on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster (free tier available)
3. Get the connection string
4. Add the string to the `.env` file:

```env
MONGODB_URI_TEST=mongodb+srv://username:password@cluster0.mongodb.net/Pagelle-FC-test
JWT_SECRET=your-super-secret-jwt-key-change-this
CLIENT_URL_DEV=http://localhost:8080
```

### Seed Database (Optional)

```bash
# Populate database with test data
cd server
npm run seed:test
```

## 🎮 Usage

### 1. **Registration and Team Setup**
- Create an account or login with existing credentials
- Create a new team or join an existing one
- Invite your teammates

### 2. **Player Card Creation**
- Go to "Player Cards" to create player cards
- Each team member can evaluate attributes
- System automatically calculates Overall Rating

### 3. **Match Management**
- Create a new match from the main dashboard
- Add team players and, if needed, **guest players** (no account required)
- Share the personal invite link with each guest
- Start post-match voting session

### 4. **Voting and Results**
- Each player votes for teammates (1-10 scale)
- Nominate MVP and Man of the Match
- View aggregated results in real-time

### 5. **Analysis and Statistics**
- Check match history
- Analyze individual performances
- Compare players with detailed charts

## 📖 Documentation

The project includes detailed documentation for developers and users:

- 📋 **[System Architecture Guide](SYSTEM_ARCHITECTURE_GUIDE.md)** - System architecture
- 🗺️ **[Priority Roadmap](ROADMAP_PRIORITA_DEFINITIVA.md)** - Development plan
- 💡 **[Ideas Archive](ARCHIVIO_IDEE_COMPLETE.md)** - Future features
- 🔧 **[Implementation Guide](GUIDA_IMPLEMENTAZIONE_FEATURE_COMPLETA.md)** - Technical guides

### API Documentation

The backend exposes complete RESTful APIs:

- **Auth**: `/api/v1/auth/*` - Authentication and registration
- **Users**: `/api/v1/users/*` - User profile management
- **Teams**: `/api/v1/teams/*` - Team operations
- **Matches**: `/api/v1/matches/*` - Match management
- **Voting**: `/api/v1/voting-sessions/*` - Voting system
- **Player Cards**: `/api/v1/player-card-sessions/*` - Player cards
- **Invite**: `/api/v1/invite/*` - Guest invite links, guest account claim

## 🗺️ Roadmap

### ✅ **Released (Alpha v0.1.0)**
- [x] Basic voting and player cards system
- [x] Robust Service Layer architecture
- [x] Responsive UI with Shadcn/UI
- [x] JWT authentication system
- [x] MongoDB database with automatic backup
- [x] **Advanced CRUD**: Edit/Delete matches and user profiles
- [x] **Fluid Team Join**: Public teams dropdown
- [x] **Abstention System**: Optional voting for inclusivity
- [x] **Goalkeeper Attributes**: Role specialization
- [x] **PWA WEB APP**: Downloadable iOS/Android version
- [x] **External Player (Guest User)**: Guests without registration, personal invite link, scoped JWT and automatic history merge on registration

### 🔮 **Planned (v1.2.0+)**
- [ ] **Comparison Dashboard**: Advanced player analytics
- [ ] **Flagging System**: Evaluation dispute management
- [ ] **Social Integration**: Result sharing
- [ ] **AI Insights**: Performance suggestions

## 👨‍💻 Development

### Main Commands

```bash
# Backend
npm run dev          # Development with hot-reload
npm run prod         # Production
npm run seed         # Populate database
npm run db:backup    # Database backup

# Frontend  
npm run dev          # Development
npm run build        # Production build
npm run preview      # Build preview
npm run lint         # Code check
```

### Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Code Architecture

The project follows the **Service Layer + Repository** pattern:

```
server/src/
├── controllers/     # HTTP request handling
├── services/        # Business logic
├── repositories/    # Data access layer  
├── models/          # MongoDB schemas
├── middleware/      # Express middleware
├── routes/          # API route definitions
└── utils/           # Shared utilities
```

## 🔒 Security

- **🔐 JWT Authentication** with refresh tokens
- **🛡️ Rate Limiting** to prevent attacks
- **🔒 Password Hashing** with bcrypt
- **🌐 Configured CORS** for authorized domains
- **📋 Input Validation** with Mongoose schemas
- **🔍 Complete Audit Trail** for all operations

## 🤝 Community and Support

- **� Instagram**: [@pagellefc](https://www.instagram.com/pagellefc?igsh=MW1lajQxNmUxNDAzZg==)
- **💼 LinkedIn**: [Simone Mele](https://www.linkedin.com/in/simone-mele/)
- **🐙 GitHub**: [SimonePere](https://github.com/SimonePere)
- **☕ Support the project**: [Ko-fi](https://ko-fi.com/simonemele) — if you like the app, buy me a coffee!
- **🐛 Issues**: [GitHub Issues](https://github.com/SimonePere/Pagelle_FC__Alpha-v0.1.0/issues)

## 📄 License

This project is currently under **UNLICENSED** license - all rights reserved.

---

## 🌟 Special Features

### 🎯 **Over 50 Inclusivity**
System designed to involve players of all ages with:
- Discrete and positive "Experience" bonus
- Abstention system to not exclude anyone
- Intuitive and accessible UI
- Complete mobile and desktop support

### 🏆 **Advanced Gamification**
- Personalized badges and recognitions
- Player progression system
- Seasonal challenges and goals
- Dynamic and engaging leaderboards

### 📱 **Mobile First**
- PWA installable as native app
- Optimized touch gestures
- High performance on mobile devices
- Offline synchronization (coming soon)

---

<div align="center">

**Made with ❤️ for amateur football teams**

*Transform your team into a professional squad with Pagelle FC*

[🚀 **Get Started**](#-installation) | [📖 **Documentation**](#-documentation) | [🤝 **Contribute**](#-development)

</div>