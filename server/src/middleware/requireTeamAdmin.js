/**
 * requireTeamAdmin — Middleware che verifica che l'utente sia
 * autorizzato ad amministrare un team specifico.
 *
 * Permette se (in OR):
 *   1. req.user.role === 'admin'   (admin globale: bypass totale)
 *   2. l'utente è in team.adminIds
 *   3. l'utente è team.createdBy   (fallback per team legacy)
 *
 * Richiede `auth` e `requireScope('full')` a monte.
 *
 * Carica il Team una sola volta e lo allega a `req.team` per
 * evitare doppie query nel controller successivo.
 *
 * Default: legge il teamId da `req.params.id`.
 * Per rotte diverse (es. :teamId) passare:
 *   requireTeamAdmin({ paramName: 'teamId' })
 *
 * Esempio:
 *   router.put('/:id', auth, requireScope('full'), requireTeamAdmin(), handler);
 */
const Team = require('../models/Team');

const requireTeamAdmin = ({ paramName = 'id' } = {}) => async (req, res, next) => {
    try {
        const teamId = req.params?.[paramName];
        if (!teamId) {
            return res.status(400).json({ error: 'Team ID mancante nella richiesta' });
        }

        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ error: 'Team non trovato' });
        }

        // Allego il team alla request per evitare di ricaricarlo nel controller
        req.team = team;

        // 1) Admin globale → bypass
        if (req.user?.role === 'admin') {
            return next();
        }

        const userId = req.user?._id?.toString();
        if (!userId) {
            return res.status(401).json({ error: 'Utente non autenticato' });
        }

        // 2) Presente in adminIds
        const isInAdminIds = (team.adminIds || []).some(id => id.toString() === userId);
        if (isInAdminIds) return next();

        // 3) Fallback: è il creatore del team (team legacy senza adminIds popolato)
        if (team.createdBy && team.createdBy.toString() === userId) {
            return next();
        }

        return res.status(403).json({
            error: 'Solo gli amministratori del team possono eseguire questa azione'
        });
    } catch (error) {
        console.error('[requireTeamAdmin] error:', error);
        return res.status(500).json({ error: 'Errore verifica permessi team' });
    }
};

module.exports = requireTeamAdmin;
