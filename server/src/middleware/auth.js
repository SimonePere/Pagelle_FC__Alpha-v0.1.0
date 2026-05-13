const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ error: 'Token is not valid' });
    }

    req.user = user;
    req.user.scope = decoded.scope || 'full';
    if (decoded.matchId) req.user.matchId = decoded.matchId;

    // 🟢 Guest: link/JWT SEMPRE valido come punto di accesso all'app, anche se
    //    la partita è stata completata o cancellata. Il guest può così consultare
    //    i risultati in read-only e usare il link come gancio per la registrazione
    //    (claim/merge → utente full). Le restrizioni sui voti sono già garantite
    //    da VotingSession.canUserVote (sessione 'active' + non scaduta) e da
    //    requireRole/requireScope sulle azioni amministrative.

    next();
  } catch (error) {
    res.status(401).json({ error: 'Token is not valid' });
  }
};

module.exports = auth;