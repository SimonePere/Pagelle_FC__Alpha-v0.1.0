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

const ROLE_HIERARCHY = {
    god: ['god', 'admin', 'moderator', 'player'],
    admin: ['admin', 'moderator', 'player'],
    moderator: ['moderator', 'player'],
    captain: ['captain', 'player'],
    player: ['player']
};

const checkRole = (currentRole, requiredRole) => {
    const allowedRoles = ROLE_HIERARCHY[currentRole] || [];
    return allowedRoles.includes(requiredRole);

}

const requireRole = (...allowedRoles) => (req, res, next) => {
    const role = req.user?.role || 'player';
    const ok = allowedRoles.some((r) => checkRole(role, r));
    if (ok) return next();
    return res.status(403).json({ error: 'Azione non consentita per il tuo ruolo' });
};

module.exports = requireRole;
