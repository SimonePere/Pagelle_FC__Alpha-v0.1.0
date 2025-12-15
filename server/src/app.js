require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const teamRoutes = require('./routes/teams');
const matchRoutes = require('./routes/matches');
const playerCardRoutes = require('./routes/playerCards');
const votingSessionRoutes = require('./routes/votingSessions');
const leaderboardRoutes = require('./routes/leaderboards');

const app = express();

// Security middleware
app.use(helmet());

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

// CORS configuration
app.use(cors({
  origin: true, // Permette tutte le origini in sviluppo
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware per debugging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('📱 :method :url :status :res[content-length] - :response-time ms'));
}

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/teams', teamRoutes);
app.use('/api/v1/matches', matchRoutes);
app.use('/api/v1/voting-sessions', votingSessionRoutes);
app.use('/api/v1/player-cards', playerCardRoutes);
app.use('/api/v1/leaderboards', leaderboardRoutes);

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

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

module.exports = app;