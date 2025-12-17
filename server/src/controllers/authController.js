const AuthService = require('../services/AuthService');

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

    // Delega tutta la business logic all'AuthService
    const result = await AuthService.registerUser({ name, email, password, birthdate });

    console.log('✅ Utente registrato:', email);
    console.log('🔵 === FINE REGISTRAZIONE ===\n');

    res.status(201).json({
      success: true,
      token: result.token,
      user: result.user
    });

  } catch (error) {
    console.log('❌ ERRORE REGISTRAZIONE:', error.message);
    console.log('🔵 === FINE REGISTRAZIONE (ERRORE) ===\n');

    // Gestione errori specifici
    if (error.message.includes('already exists') ||
      error.message.includes('Please provide') ||
      error.message.includes('must be at least') ||
      error.message.includes('valid email')) {
      return res.status(400).json({ error: error.message });
    }

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

    // Delega tutta la business logic all'AuthService
    const result = await AuthService.loginUser({ email, password });

    console.log('✅ Login completato per:', email);
    console.log('🟢 === FINE LOGIN ===\n');

    res.json({
      success: true,
      token: result.token,
      user: result.user
    });

  } catch (error) {
    console.log('❌ ERRORE LOGIN:', error.message);
    console.log('🟢 === FINE LOGIN (ERRORE) ===\n');

    // Gestione errori specifici
    if (error.message.includes('Please provide') ||
      error.message.includes('Invalid credentials')) {
      return res.status(401).json({ error: error.message });
    }

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
    // Delega tutta la business logic all'AuthService
    const userProfile = await AuthService.getUserProfile(req.user.id);

    console.log('✅ Utente trovato:', userProfile.email);
    console.log('📊 Stats trovate:', userProfile.personalStats.totalMatches > 0 ? 'PlayerLeaderboardStats' : 'Default (0)');
    console.log('🏆 Team stats calcolate dinamicamente per', userProfile.teams?.length || 0, 'team');
    console.log('📊 Player Card status:', userProfile.playerCard.hasPlayerCard ? 'Presente' : 'Non presente');
    console.log('🟡 === FINE GET USER INFO ===\n');

    res.json({
      success: true,
      user: userProfile
    });

  } catch (error) {
    console.log('❌ ERRORE GET USER INFO:', error.message);
    console.log('🟡 === FINE GET USER INFO (ERRORE) ===\n');

    if (error.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(500).json({ error: 'Server error fetching user' });
  }
};

module.exports = {
  register,
  login,
  getMe
};