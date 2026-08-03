/**
 * requireMatchAdmin — Middleware che autorizza l'azione su un match
 * se l'utente è admin globale (User.role === 'admin') OPPURE
 * admin del Team a cui appartiene il match (Team.adminIds include userId).
 *
 * Richiede che la route abbia uno tra `:id` o `:matchId` nei params.
 *
 * Deve essere usato DOPO `auth` e tipicamente DOPO `requireScope('full')`.
 *
 * Esempio:
 *   router.post('/:id/players',
 *     auth, requireScope('full'), requireMatchAdmin,
 *     matchController.addRegisteredPlayer);
 */
const { MatchRepository, TeamRepository } = require('../repositories');

const matchRepository = new MatchRepository();
const teamRepository = new TeamRepository();

const requireMatchAdmin = async (req, res, next) => {
    try {
        // Admin globale → bypass
        if (req.user?.role === 'admin' || req.user?.role === 'god') return next();

        const matchId = req.params.matchId || req.params.id;
        if (!matchId) {
            return res.status(400).json({ error: 'Match id mancante nella route' });
        }

        const match = await matchRepository.findById(matchId);
        if (!match) {
            return res.status(404).json({ error: 'Match non trovato' });
        }

        const team = await teamRepository.findById(match.teamId);
        if (!team) {
            return res.status(404).json({ error: 'Team del match non trovato' });
        }

        const userId = String(req.user?.id || req.user?._id || '');
        const isTeamAdmin = (team.adminIds || []).some(
            (adminId) => String(adminId) === userId
        );

        if (!isTeamAdmin) {
            return res.status(403).json({
                error: 'Azione riservata agli admin del team o agli amministratori globali'
            });
        }

        // Cache per gli handler successivi (evita un'altra query)
        req.match = match;
        req.team = team;
        return next();
    } catch (err) {
        return next(err);
    }
};

module.exports = requireMatchAdmin;
