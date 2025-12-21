const authService = require('../services/AuthService');

// @desc    Register new user
// @route   POST /api/v1/auth/register
// @access  Public
const register = async (req, res) => {
  console.log('\n🔵 === REGISTRAZIONE UTENTE ===');
  console.log('📥 Dati ricevuti:', {
    name: req.body.name,
    email: req.body.email,
    hasPassword: !!req.body.password,
    birthdate: req.body.birthdate,
    existingTeamId: req.body.existingTeamId || null
  });

  try {
    const { name, email, password, birthdate, existingTeamId } = req.body;
    // Delega tutta la business logic all'AuthService
    const result = await authService.registerUser({ name, email, password, birthdate, existingTeamId });

    console.log('✅ Utente registrato:', email);
    console.log('🔵 === FINE REGISTRAZIONE ===\n');

    res.status(201).json({
      success: true,
      token: result.token,
      user: result.user,
      team: result.team || null
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

// @desc    Update user profile
// @route   PUT /api/v1/auth/profile
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const updateData = req.body;

    const result = await authService.updateProfile(userId, updateData);

    res.json(result);

  } catch (error) {
    next(error);
  }
};

// @desc    Change user password
// @route   PUT /api/v1/auth/password
// @access  Private
const changePassword = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Password attuale e nuova password sono richieste'
      });
    }

    const result = await authService.changePassword(userId, oldPassword, newPassword);

    res.json(result);

  } catch (error) {
    next(error);
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
    const result = await authService.loginUser({ email, password });

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
    const userProfile = await authService.getUserProfile(req.user.id);

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
  getMe,
  updateProfile,
  changePassword
};