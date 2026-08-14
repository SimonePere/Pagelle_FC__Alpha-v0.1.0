require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const teamRoutes = require('./routes/teams');
const matchRoutes = require('./routes/matches');
const playerCardRoutes = require('./routes/playerCards');
const votingSessionRoutes = require('./routes/votingSessions');
const leaderboardRoutes = require('./routes/leaderboards');
const newsRoutes = require('./routes/news');
const awardRoutes = require('./routes/awards');
const inviteRoutes = require('./routes/invite');
const seasonRoutes = require('./routes/seasons');
const godRoutes = require('./god/routes/god');

const app = express();

// Security middleware: abilita cross-origin resource policy per consentire l'embed delle immagini avatar su domini differenti
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// Trust proxy e Rate limiting - Solo in PRODUCTION
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', true);

  // Import rate limiter solo quando serve
  const rateLimit = require('express-rate-limit');

  // Rate limiting - AUMENTATO per sviluppo
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // AUMENTATO: 500 richieste per IP ogni 15 min
    message: {
      error: 'Too many requests from this IP, please try again later.'
    },
    // Skip rate limiting in development
    skip: (req) => process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
  });
  app.use('/api', limiter);
}

// CORS configuration
app.use(cors({
  origin: true, // Permette tutte le origini in sviluppo
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Disposition', 'Content-Length', 'Content-Type']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Disabilita cache globalmente per sviluppo
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'ETag': false
    });
    next();
  });
}

// Logging middleware per debugging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('📱 :method :url :status :res[content-length] - :response-time ms'));
}

// Static: immagini award generate localmente (fallback dev senza Cloudinary).
// In produzione le card vivono su Cloudinary, ma teniamo lo static safe anche lì.
app.use(
  '/awards-static',
  express.static(path.join(__dirname, '..', 'public', 'awards'), {
    maxAge: process.env.NODE_ENV === 'production' ? '7d' : 0,
    fallthrough: true,
  })
);

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/teams', teamRoutes);
app.use('/api/v1/matches', matchRoutes);
app.use('/api/v1/voting-sessions', votingSessionRoutes);
app.use('/api/v1/player-cards', playerCardRoutes);
app.use('/api/v1/leaderboards', leaderboardRoutes);
app.use('/api/v1/news', newsRoutes);
app.use('/api/v1/awards', awardRoutes);
app.use('/api/v1/invite', inviteRoutes);
app.use('/api/v1/seasons', seasonRoutes);
// Rotte God Dashboard: overview, dashboard graph data, guest conversion,
// engagement, awards analytics e usage tecnico.
app.use("/api/v1/god", godRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Pagelle FC Backend is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);

  const statusCode = err.statusCode || err.status || 500;

  res.status(statusCode).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

module.exports = app;