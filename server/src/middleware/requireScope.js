/**
 * requireScope — Middleware che verifica lo scope del JWT
 *
 * Uso:
 *   requireScope('full')           → solo utenti normali
 *   requireScope('full', 'guest')  → utenti normali + guest
 *
 * Lo scope viene iniettato da auth.js: req.user.scope = decoded.scope || 'full'
 * Deve sempre essere usato DOPO il middleware auth.
 */
const requireScope = (...allowedScopes) => (req, res, next) => {
    const scope = req.user?.scope || 'full';
    if (allowedScopes.includes(scope)) return next();
    return res.status(403).json({
        error: 'Accesso non consentito per utenti ospite'
    });
};

module.exports = requireScope;
