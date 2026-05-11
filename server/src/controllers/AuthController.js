const authService = require('../services/AuthService');

/**
// @desc    Register new user
// @route   POST /api/v1/auth/register
// @access  Public
*/
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

/**
// @desc    Register guest user
// @route   POST /api/v1/auth/register-guest
// @access  Public
*/
const registerGuest = async (req, res) => {
  console.log('\n🔵 === CREAZIONE UTENTE GUEST ===');
  console.log('📥 Dati ricevuti:', {
    guestUser: req.body.name,
    existingTeamId: req.body.existingTeamId || null,
    position: req.body.position || null
  });

  try {
    const { name, existingTeamId, position } = req.body;
    const result = await authService.registerGuest({ name, existingTeamId, position });

    console.log('✅ Utente Guest creato:', name);

    res.status(201).json({
      success: true,
      token: result.token,
      guestUser: result.guestUser,
      team: result.team || null
    });

  } catch (error) {
    console.log('❌ ERRORE CREAZIONE UTENTE GUEST:', error.message);

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

/**
// @desc    Update user profile
// @route   PUT /api/v1/auth/profile
// @access  Private
*/
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

/**
// @desc    Change user password
// @route   PUT /api/v1/auth/password
// @access  Private
*/
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

/**
// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
*/
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

/**
// @desc    Get current user
// @route   GET /api/v1/auth/me
// @access  Private
*/
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

/**
// @desc    Valida token di invito guest (endpoint pubblico)
// @route   GET /api/v1/invite/:token
// @access  Public
*/
const validateInvite = async (req, res) => {
  try {
    const { token } = req.params;
    const result = await authService.validateInvite(token);
    res.json({ success: true, ...result });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
};

/**
// @desc    Login guest tramite invite token → JWT con scope guest
// @route   POST /api/v1/auth/guest-login
// @access  Public
*/
const guestLogin = async (req, res) => {
  console.log('\n👻 === GUEST LOGIN ===');
  console.log('📥 Token ricevuto:', req.body.inviteToken ? `${req.body.inviteToken.slice(0, 4)}...` : 'assente');

  try {
    const { inviteToken } = req.body;
    const result = await authService.guestLogin({ inviteToken });

    console.log('✅ Guest autenticato:', result.user.name);
    console.log('👻 === FINE GUEST LOGIN ===\n');

    res.json({ success: true, token: result.token, user: result.user });
  } catch (error) {
    console.log('❌ ERRORE GUEST LOGIN:', error.message);
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
};

/**
// @desc    Merge guest → utente reale (registrazione con storico intatto)
// @route   POST /api/v1/auth/guest-merge-user
// @access  Public
*/
const guestMergeUser = async (req, res) => {
  console.log('\n🔀 === GUEST MERGE USER ===');
  console.log('📥 Token ricevuto:', req.body.inviteToken ? `${req.body.inviteToken.slice(0, 4)}...` : 'assente');

  try {
    const { email, password, name, inviteToken } = req.body;
    const result = await authService.guestMergeUser({ email, password, name, inviteToken });

    console.log('✅ Guest convertito in utente reale:', result.user.email);
    console.log('🔀 === FINE GUEST MERGE USER ===\n');

    res.status(200).json({ success: true, token: result.token, user: result.user });
  } catch (error) {
    console.log('❌ ERRORE GUEST MERGE USER:', error.message);
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
};

/**
// @desc    Converte il guest autenticato in utente reale (via JWT, no inviteToken)
// @route   POST /api/v1/auth/claim-guest-by-id
// @access  Private (solo scope guest)
*/
const claimGuestById = async (req, res) => {
  console.log('\n🔀 === CLAIM GUEST BY ID ===');
  try {
    const { email, password, name } = req.body;
    const userId = req.user.id;
    const result = await authService.claimGuestById({ userId, email, password, name });
    console.log('✅ Guest convertito:', result.user.email);
    res.status(200).json({ success: true, token: result.token, user: result.user });
  } catch (error) {
    console.log('❌ ERRORE CLAIM GUEST BY ID:', error.message);
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  validateInvite,
  guestLogin,
  guestMergeUser,
  claimGuestById
};