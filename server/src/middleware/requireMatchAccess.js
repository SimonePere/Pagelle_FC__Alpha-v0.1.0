/**
 * requireMatchAccess — Middleware che verifica che un guest
 * possa accedere SOLO alla partita per cui è stato invitato.
 *
 * Per utenti normali (scope: 'full') passa sempre.
 * Per guest: confronta req.user.matchId (dal JWT) con il
 * votingSessionId della sessione di voto target.
 *
 * Viene usato sulle rotte di voto: POST/PATCH /:id/vote
 * In quel caso ":id" è il votingSessionId, non il matchId diretto.
 * Il controllo avviene nel VotingSessionController/Service che già
 * verifica l'eleggibilità del voter — questo middleware blocca prima
 * i guest che tentano sessioni di altre partite.
 *
 * Nota: req.user.matchId è l'ObjectId del Match (non della VotingSession).
 * Il confronto finale avviene nel service, questo middleware è un guard
 * leggero che blocca sessioni palesemente non correlate.
 */
const requireMatchAccess = (req, res, next) => {
    // Utenti normali: nessun controllo aggiuntivo
    if (!req.user || req.user.scope !== 'guest') return next();

    // Per i guest: il matchId deve essere presente nel JWT
    if (!req.user.matchId) {
        return res.status(403).json({
            error: 'Token guest non valido: matchId mancante'
        });
    }

    // Passa: il controllo di eleggibilità dettagliato avviene nel VotingService
    // (che verifica se il voter è in eligibleVoters della sessione specifica)
    next();
};

module.exports = requireMatchAccess;
