const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const PlayerCardResult = require('../models/PlayerCardResult');
const PlayerLeaderboardStats = require('../models/PlayerLeaderboardStats');

// Generate JWT Token
const generateToken = (id) => {
  const token = jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
  return token;
};

// @desc    Register new user
// @route   POST /api/v1/auth/register
// @access  Public
const register = async (req, res) => {
  console.log('\n🔵 === REGISTRAZIONE UTENTE ===');
  console.log('📥 Dati ricevuti:', {
    name: req.body.name,
    email: req.body.email,
    hasPassword: !!req.body.password,
    birthdate: req.body.birthdate
  });

  try {
    const { name, email, password, birthdate } = req.body;
    // Validation
    if (!name || !email || !password) {
      console.log('❌ Validazione fallita: campi mancanti');
      return res.status(400).json({
        error: 'Please provide name, email, and password'
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      console.log('❌ Utente già esistente con email:', email);
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      birthdate: birthdate,
      password: hashedPassword,
      teamIds: [], // Nessun team inizialmente
      profile: {
        position: 'UTIL', // Default position
        preferredFoot: 'right'
      }
    });

    // Generate token
    const token = generateToken(user._id);

    console.log('✅ Utente registrato:', user.email);
    console.log('🔵 === FINE REGISTRAZIONE ===\n');

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        birthdate: user.birthdate,
        teamIds: user.teamIds,
        teamName: user.teamName,
        role: user.role,
        profile: user.profile,
        totalTeams: user.totalTeams
      }
    });

  } catch (error) {
    console.log('❌ ERRORE REGISTRAZIONE:', error.message);
    console.log('🔵 === FINE REGISTRAZIONE (ERRORE) ===\n');
    res.status(500).json({ error: 'Server error during registration' });
  }
};

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
const login = async (req, res) => {
  console.log('\n🟢 === LOGIN UTENTE ===');
  console.log('📥 Dati ricevuti:', {
    email: req.body.email,
    hasPassword: !!req.body.password
  });

  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      console.log('❌ Validazione fallita: email o password mancanti');
      return res.status(400).json({
        error: 'Please provide email and password'
      });
    }

    // Find user (allow login with email or name)
    const user = await User.findOne({
      $or: [
        { email: email.toLowerCase().trim() },
      ]
    }).select('+password');

    if (!user) {
      console.log('❌ Utente non trovato con email/nome:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      console.log('❌ Password errata per utente:', user.email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user._id);

    console.log('✅ Login completato per:', user.email);
    console.log('🟢 === FINE LOGIN ===\n');

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        birthdate: user.birthdate,
        teamIds: user.teamIds,
        teamName: user.teamName, // Manteniamo per compatibilità
        role: user.role,
        profile: user.profile,
        totalTeams: user.totalTeams
      }
    });

  } catch (error) {
    console.log('❌ ERRORE LOGIN:', error.message);
    console.log('🟢 === FINE LOGIN (ERRORE) ===\n');
    res.status(500).json({ error: 'Server error during login' });
  }
};

// @desc    Get current user
// @route   GET /api/v1/auth/me
// @access  Private
const getMe = async (req, res) => {
  console.log('\n🟡 === GET USER INFO ===');
  console.log('📥 User ID dal token:', req.user?.id);

  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .populate('teamIds', 'name description colors settings inviteCode');

    if (!user) {
      console.log('❌ Utente non trovato nel database');
      return res.status(404).json({ error: 'User not found' });
    }

    // Per ogni team dell'utente, calcola stats dinamiche
    if (user.teamIds && user.teamIds.length > 0) {
      for (let team of user.teamIds) {
        // Calcola stats team dinamiche
        const [totalMatches, teamStats, lastMatch] = await Promise.all([
          // Conta match del team
          mongoose.model('Match').countDocuments({ teamId: team._id }),

          // Somma stats di tutti i membri del team
          PlayerLeaderboardStats.aggregate([
            { $match: { teamId: team._id, isActive: true } },
            {
              $group: {
                _id: null,
                totalGoals: { $sum: '$totalGoals' },
                totalAssists: { $sum: '$totalAssists' },
                avgRating: { $avg: '$averageRating' },
                activePlayers: { $sum: 1 }
              }
            }
          ]),

          // Ultima partita del team
          mongoose.model('Match').findOne({ teamId: team._id })
            .sort({ date: -1 })
            .select('date')
            .lean()
        ]);

        const teamStatsData = teamStats[0] || { totalGoals: 0, totalAssists: 0, avgRating: 0, activePlayers: 0 };

        // Aggiungi stats dinamiche al team
        team._doc.teamStats = {
          totalMatches: totalMatches,
          totalGoals: teamStatsData.totalGoals,
          totalAssists: teamStatsData.totalAssists,
          averageRating: Math.round(teamStatsData.avgRating * 10) / 10 || 0,
          activePlayers: teamStatsData.activePlayers,
          lastMatchDate: lastMatch ? lastMatch.date : null
        };
        // Rimuovi le stats statiche non aggiornate  
        delete team._doc.stats;
      }
    }

    // Recupera statistiche reali da PlayerLeaderboardStats
    const userStats = await PlayerLeaderboardStats.findOne({
      playerId: req.user.id
    }).lean();

    // Costruisci oggetto stats (con fallback se non esistono)
    const stats = userStats ? {
      totalMatches: userStats.totalMatches,
      totalGoals: userStats.totalGoals,
      totalAssists: userStats.totalAssists,
      averageRating: userStats.averageRating,
      bestRating: userStats.bestRating,
      worstRating: userStats.worstRating
    } : {
      totalMatches: 0,
      totalGoals: 0,
      totalAssists: 0,
      averageRating: 0,
      bestRating: null,
      worstRating: null
    };

    // Recupera informazioni Player Card più recente
    const latestPlayerCard = await PlayerCardResult.findOne({
      targetPlayerId: req.user.id
    })
      .sort({ createdAt: -1 })
      .populate('votingSessionId', 'title createdAt completedAt')
      .lean();

    // Costruisci oggetto player card info
    const playerCardInfo = latestPlayerCard ? {
      hasPlayerCard: true,
      latestCard: {
        id: latestPlayerCard._id,
        sessionTitle: latestPlayerCard.votingSessionId.title,
        finalOverallRating: latestPlayerCard.finalOverallRating,
        consensusProfile: latestPlayerCard.consensusProfile,
        createdAt: latestPlayerCard.createdAt,
        completedAt: latestPlayerCard.votingSessionId.completedAt,
        finalAttributes: {
          tir: latestPlayerCard.finalAttributes.tir,
          pas: latestPlayerCard.finalAttributes.pas,
          dif: latestPlayerCard.finalAttributes.dif,
          cor: latestPlayerCard.finalAttributes.cor,
          dri: latestPlayerCard.finalAttributes.dri,
          fis: latestPlayerCard.finalAttributes.fis,
          vel: latestPlayerCard.finalAttributes.vel,
          men: latestPlayerCard.finalAttributes.men
        }
      }
    } : {
      hasPlayerCard: false,
      latestCard: null
    };

    console.log('✅ Utente trovato:', user.email);
    console.log('📊 Stats trovate:', userStats ? 'PlayerLeaderboardStats' : 'Default (0)');
    console.log('🏆 Team stats calcolate dinamicamente per', user.teamIds?.length || 0, 'team');
    console.log('📊 Player Card status:', latestPlayerCard ? 'Presente' : 'Non presente');
    console.log('🟡 === FINE GET USER INFO ===\n');

    res.json({
      success: true,
      user: {
        // === INFORMAZIONI BASE UTENTE ===
        id: user._id,
        name: user.name,
        email: user.email,
        birthdate: user.birthdate,
        role: user.role,
        profile: user.profile,
        isActive: user.isActive,
        displayName: user.displayName,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,

        // === STATISTICHE PERSONALI ===
        personalStats: stats,

        // === PLAYER CARD ===
        playerCard: playerCardInfo,

        // === TEAM INFORMATION ===
        teams: user.teamIds,
        totalTeams: user.totalTeams,
        hasTeams: user.hasTeams
      }
    });

  } catch (error) {
    console.log('❌ ERRORE GET USER INFO:', error.message);
    console.log('🟡 === FINE GET USER INFO (ERRORE) ===\n');
    res.status(500).json({ error: 'Server error fetching user' });
  }
};

module.exports = {
  register,
  login,
  getMe
};