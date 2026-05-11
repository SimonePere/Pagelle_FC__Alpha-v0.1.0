const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Match = require('../models/Match');

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

    // Scadenza contestuale per guest: se la partita è chiusa il JWT è inutile
    if (decoded.scope === 'guest' && decoded.matchId) {
      const match = await Match.findById(decoded.matchId).select('status');
      if (!match || match.status === 'completed' || match.status === 'cancelled') {
        return res.status(403).json({
          error: 'Partita chiusa. Registrati per continuare ad usare l\'app.'
        });
      }
    }

    next();
  } catch (error) {
    res.status(401).json({ error: 'Token is not valid' });
  }
};

module.exports = auth;