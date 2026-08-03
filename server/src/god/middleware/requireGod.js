/**
 * Middleware che richiede il ruolo God per l'accesso.
 * Separa in modo esplicito la modalita personale `god` dalla modalita `admin` (che puo' essere usata per gestire i team).
 */

const requireGod = (req, res, next) => {
    const role = req.user?.role || 'player';
    if (role === 'god') return next();

    return res.status(403).json({
        error: 'Access denied: God role required'
    });
};

module.exports = requireGod;