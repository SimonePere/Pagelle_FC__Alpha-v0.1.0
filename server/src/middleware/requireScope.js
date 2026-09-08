/**
 * requireScope — Middleware che verifica lo scope del JWT
 *
 * Uso:
 *   requireScope('full')                   → solo utenti normali
 *   requireScope('full', 'guest')          → utenti normali + ospiti
 *   requireScope('full', 'guest', 'demo')  → aggiunge i visitatori in demo
 *
 * SCOPE ESISTENTI
 *   'full'  → utente registrato, nessuna restrizione
 *   'guest' → ospite invitato a una partita, permessi ridotti
 *   'demo'  → visitatore della squadra dimostrativa pubblica, sola lettura
 *             (le scritture sono già respinte a monte da blockDemoWrites)
 *
 * Lo scope viene iniettato da auth.js: req.user.scope = decoded.scope || 'full'
 * Deve sempre essere usato DOPO il middleware auth.
 */
const requireScope = (...allowedScopes) => (req, res, next) => {
    const scope = req.user?.scope || 'full';
    if (allowedScopes.includes(scope)) return next();
    return res.status(403).json({
        error: 'Accesso non consentito con il tuo tipo di account'
    });
};

module.exports = requireScope;
