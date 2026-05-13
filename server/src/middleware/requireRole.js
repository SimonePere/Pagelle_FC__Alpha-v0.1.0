/**
 * requireRole — Middleware che verifica il ruolo dell'utente
 *
 * Uso:
 *   requireRole('admin')                → solo admin
 *   requireRole('admin', 'moderator')   → admin + moderator
 *
 * Il ruolo viene letto da req.user.role, popolato da auth.js
 * (req.user è il documento User completo, che contiene il campo `role`
 * con default 'player' — vedi server/src/models/User.js).
 *
 * Deve sempre essere usato DOPO il middleware auth (e tipicamente
 * dopo requireScope('full'), perché i guest non hanno un ruolo applicativo).
 *
 * Esempio:
 *   router.post('/', auth, requireScope('full'), requireRole('admin'), handler);
 */
const requireRole = (...allowedRoles) => (req, res, next) => {
    const role = req.user?.role || 'player';
    if (allowedRoles.includes(role)) return next();
    return res.status(403).json({
        error: 'Azione riservata agli amministratori'
    });
};

module.exports = requireRole;
