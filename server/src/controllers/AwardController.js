/**
 * AWARD CONTROLLER
 * 
 * Gestisce le richieste HTTP relative agli Award (card celebrative).
 * Tutta la business logic è delegata ad AwardRepository.
 * Il controller si occupa solo di: validare input, verificare autorizzazioni, rispondere JSON.
 *
 * ENDPOINTS:
 * - GET    /api/v1/awards/team/:teamId          → Bacheca award del team (filtro tipo/status, paginazione)
 * - GET    /api/v1/awards/pending               → Award READY non ancora viste dall'utente (tutti i suoi team)
 * - GET    /api/v1/awards/:awardId              → Dettaglio singolo award (membro team)
 * - POST   /api/v1/awards/:awardId/viewed       → Marca award come vista dall'utente
 * - POST   /api/v1/awards/:awardId/share        → Incrementa contatore share per canale
 * - GET    /api/v1/awards/public/:awardId       → Pagina pubblica card (nessuna auth, tracking visita)
 * - GET    /api/v1/awards/public/:awardId/download → Download PNG (Content-Disposition attachment)
 */

const { AwardRepository, TeamRepository } = require('../repositories');

const awardRepository = new AwardRepository();
const teamRepository = new TeamRepository();


// ============================================
// 🏆 GET /api/v1/awards/team/:teamId
// ============================================
/**
 * Bacheca award di un team.
 * L'utente deve essere membro del team.
 *
 * Query params:
 *   ?type=MATCH_RECAP|MONTHLY_MVP|BALLON_DOR|GOLDEN_BOOT  (opzionale, filtra per tipo)
 *   ?status=PENDING|READY|FAILED                          (opzionale, default: tutti)
 *   ?limit=20                                             (opzionale, max 50)
 *   ?skip=0                                               (opzionale, paginazione offset)
 *
 * Response 200: { awards: [...], total: number }
 */
const getTeamAwards = async (req, res, next) => {
    try {
        const { teamId } = req.params;
        const userId = req.user.id;

        // Verifica appartenenza al team
        const team = await teamRepository.findById(teamId);
        if (!team) {
            return res.status(404).json({ error: 'Team non trovato' });
        }
        if (!team.isMember(userId)) {
            return res.status(403).json({ error: 'Non sei membro di questo team' });
        }

        // Parsing filtri
        const filters = {};
        if (req.query.type) filters.type = req.query.type;
        if (req.query.status) filters.status = req.query.status;
        filters.limit = Math.min(parseInt(req.query.limit) || 20, 50);
        filters.skip = parseInt(req.query.skip) || 0;

        const awards = await awardRepository.findByTeam(teamId, filters);

        res.json({
            awards,
            total: awards.length,
            filters: {
                type: filters.type || 'all',
                status: filters.status || 'all',
                limit: filters.limit,
                skip: filters.skip
            }
        });
    } catch (error) {
        next(error);
    }
};


// ============================================
// 🏆 GET /api/v1/awards/pending
// ============================================
/**
 * Award READY che l'utente non ha ancora visto (per badge notifica e reveal).
 * Cerca in TUTTI i team dell'utente.
 *
 * Response 200: { awards: [...], count: number }
 */
const getPendingAwards = async (req, res, next) => {
    try {
        const userId = req.user.id;

        // Recupera i team dell'utente
        const userTeams = await teamRepository.findAll({
            memberIds: userId
        });
        const teamIds = userTeams.map(t => t._id);

        if (teamIds.length === 0) {
            return res.json({ awards: [], count: 0 });
        }

        const awards = await awardRepository.findPendingForUser(userId, teamIds);

        res.json({
            awards,
            count: awards.length
        });
    } catch (error) {
        next(error);
    }
};


// ============================================
// 🏆 GET /api/v1/awards/:awardId
// ============================================
/**
 * Dettaglio singolo award.
 * L'utente deve essere membro del team proprietario dell'award.
 *
 * Response 200: { award: {...} }
 */
const getAwardById = async (req, res, next) => {
    try {
        const { awardId } = req.params;
        const userId = req.user.id;

        const award = await awardRepository.findById(awardId);
        if (!award) {
            return res.status(404).json({ error: 'Award non trovato' });
        }

        // Verifica che l'utente sia membro del team dell'award
        const team = await teamRepository.findById(award.teamId);
        if (!team || !team.isMember(userId)) {
            return res.status(403).json({ error: 'Non autorizzato a vedere questo award' });
        }

        res.json({ award });
    } catch (error) {
        next(error);
    }
};


// ============================================
// 🏆 POST /api/v1/awards/:awardId/viewed
// ============================================
/**
 * Marca un award come "vista" dall'utente.
 * Operazione idempotente ($addToSet): se già vista, non cambia nulla.
 * Usata dal frontend dopo l'animazione di reveal.
 *
 * Response 200: { success: true }
 */
const markViewed = async (req, res, next) => {
    try {
        const { awardId } = req.params;
        const userId = req.user.id;

        const award = await awardRepository.findById(awardId);
        if (!award) {
            return res.status(404).json({ error: 'Award non trovato' });
        }

        // Verifica appartenenza al team
        const team = await teamRepository.findById(award.teamId);
        if (!team || !team.isMember(userId)) {
            return res.status(403).json({ error: 'Non autorizzato' });
        }

        await awardRepository.markViewed(awardId, userId);
        await awardRepository.incrementView(awardId);

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};


// ============================================
// 🏆 POST /api/v1/awards/:awardId/share
// ============================================
/**
 * Registra un evento di condivisione per analytics.
 *
 * Body: { channel: 'native' | 'whatsapp' | 'telegram' | 'copyLink' | 'download' }
 *
 * Response 200: { success: true }
 */
const trackShare = async (req, res, next) => {
    try {
        const { awardId } = req.params;
        const { channel } = req.body;

        // Validazione canale
        const validChannels = ['native', 'whatsapp', 'telegram', 'copyLink', 'download'];
        if (!channel || !validChannels.includes(channel)) {
            return res.status(400).json({
                error: 'Canale non valido',
                validChannels
            });
        }

        const award = await awardRepository.findById(awardId);
        if (!award) {
            return res.status(404).json({ error: 'Award non trovato' });
        }

        await awardRepository.incrementShareClick(awardId, channel);

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};


// ============================================
// 🌐 GET /api/v1/awards/public/:awardId
// ============================================
/**
 * Endpoint PUBBLICO (nessuna auth richiesta).
 * Serve i dati essenziali della card per la pagina pubblica di condivisione.
 * Incrementa il contatore publicPageVisits per analytics.
 *
 * Ritorna SOLO i dati necessari al render pubblico (no stats interne, no viewedBy).
 *
 * Response 200: { award: { type, payload, imageUrl, imageSquareUrl, shareUrl } }
 * Response 404: { error: 'Award non trovato' }
 */
const getPublicAward = async (req, res, next) => {
    try {
        const { awardId } = req.params;

        const award = await awardRepository.findById(awardId);
        if (!award) {
            return res.status(404).json({ error: 'Award non trovato' });
        }

        // Incrementa visite pagina pubblica (fire-and-forget)
        awardRepository.incrementPublicVisit(awardId).catch(() => { });

        // Ritorna solo i dati pubblici (no stats, no viewedBy, no error tracking)
        res.json({
            award: {
                id: award._id,
                type: award.type,
                status: award.status,
                generatedAt: award.generatedAt,
                payload: award.payload,
                imageUrl: award.imageUrl || null,
                imageSquareUrl: award.imageSquareUrl || null,
                shareUrl: award.shareUrl || null
            }
        });
    } catch (error) {
        next(error);
    }
};


// ============================================
// ⬇️  GET /api/v1/awards/public/:awardId/download
// ============================================
/**
 * Stream del PNG della card con Content-Disposition: attachment.
 * Pubblico (la card stessa è già esposta via /c/:id e /api/v1/awards/public/:id).
 *
 * Query: ?variant=square|story|thumb (default: square — 1080x1080, ideale IG/WA)
 *
 * Vantaggio rispetto al link diretto a /awards-static:
 *  - Funziona da mobile LAN (passa per la stessa base URL dell'API client → reachable)
 *  - Garantisce il download nativo del browser (Content-Disposition attachment)
 *  - Evita problemi CORS in fetch+blob
 */
const path = require('path');
const fs = require('fs');

const downloadAwardImage = async (req, res, next) => {
    try {
        const { awardId } = req.params;
        const variant = ['square', 'story', 'thumb'].includes(req.query.variant) ? req.query.variant : 'square';

        const award = await awardRepository.findById(awardId);
        if (!award) {
            return res.status(404).json({ error: 'Award non trovato' });
        }
        if (award.status !== 'READY') {
            return res.status(409).json({ error: 'Card ancora in generazione', status: award.status });
        }

        // Le immagini locali stanno in server/public/awards/<id>/<variant>.png.
        // In produzione (Cloudinary) i file non sono su disco → in quel caso
        // facciamo redirect 302 all'URL Cloudinary (che fa il download nativo).
        const localPath = path.join(__dirname, '..', '..', 'public', 'awards', String(awardId), `${variant}.png`);
        if (fs.existsSync(localPath)) {
            const filename = `pagelle-fc-${awardId}-${variant}.png`;
            return res.download(localPath, filename);
        }

        // Fallback Cloudinary / URL remoto
        const remoteUrl =
            variant === 'story' ? award.imageUrl :
                variant === 'thumb' ? award.imageThumbUrl :
                    award.imageSquareUrl;
        if (!remoteUrl) {
            return res.status(404).json({ error: 'Variant non disponibile' });
        }
        return res.redirect(302, remoteUrl);
    } catch (error) {
        next(error);
    }
};


module.exports = {
    getTeamAwards,
    getPendingAwards,
    getAwardById,
    markViewed,
    trackShare,
    getPublicAward,
    downloadAwardImage
};
