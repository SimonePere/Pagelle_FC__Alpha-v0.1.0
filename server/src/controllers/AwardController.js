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
const SeasonService = require('../services/SeasonService');

const awardRepository = new AwardRepository();
const teamRepository = new TeamRepository();
const seasonService = new SeasonService();


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

        // Filtro stagione (default: stagione corrente)
        try {
            filters.seasonId = seasonService.resolveSeasonParam(req.query.season);
        } catch (seasonErr) {
            return res.status(400).json({ error: seasonErr.message });
        }

        const awards = await awardRepository.findByTeam(teamId, filters);

        res.json({
            awards,
            total: awards.length,
            filters: {
                type: filters.type || 'all',
                status: filters.status || 'all',
                season: filters.seasonId || 'all',
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
// 🧾 GET /api/v1/awards/public/:awardId/share
// ============================================
/**
 * Restituisce una pagina HTML server-rendered con meta Open Graph/Twitter
 * specifici dell'award. I crawler (WhatsApp/Telegram) leggono questi meta,
 * poi l'utente viene reindirizzato alla pagina frontend /c/:id.
 */
const getPublicAwardSharePage = async (req, res, next) => {
    try {
        const { awardId } = req.params;

        const award = await awardRepository.findById(awardId);
        if (!award) {
            return res.status(404).send('<!doctype html><html><head><meta charset="utf-8"><title>Award non trovata</title></head><body>Award non trovata</body></html>');
        }

        const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:8080').replace(/\/+$/, '');
        const targetUrl = `${frontendUrl}/c/${awardId}`;
        const title = buildAwardTitle(award.type, award.payload);
        const description = `Trofeo ${title} generato su Pagelle FC. Guarda la card completa e crea i tuoi awards di squadra.`;

        const imageUrl = resolveShareImageUrl(req, award);
        const canonicalUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

        const escTitle = escapeHtml(title);
        const escDescription = escapeHtml(description);
        const escImage = escapeHtml(imageUrl);
        const escCanonical = escapeHtml(canonicalUrl);
        const escTarget = escapeHtml(targetUrl);

        const html = `<!doctype html>
<html lang="it">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escTitle} | Pagelle FC</title>
        <meta name="description" content="${escDescription}" />

        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Pagelle FC" />
        <meta property="og:title" content="${escTitle}" />
        <meta property="og:description" content="${escDescription}" />
        <meta property="og:image" content="${escImage}" />
        <meta property="og:url" content="${escCanonical}" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="${escTitle}" />
        <meta name="twitter:description" content="${escDescription}" />
        <meta name="twitter:image" content="${escImage}" />

        <meta http-equiv="refresh" content="0;url=${escTarget}" />
    </head>
    <body>
        <p>Reindirizzamento a Pagelle FC...</p>
        <p><a href="${escTarget}">Apri la card</a></p>
        <script>window.location.replace(${JSON.stringify(targetUrl)});</script>
    </body>
</html>`;

        res.set('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(html);
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
 * Query: ?variant=square|story|thumb (default: story — 1080x1920, card completa)
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
        const variant = ['square', 'story', 'thumb'].includes(req.query.variant) ? req.query.variant : 'story';

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
        // 1) Prima prova i file locali in ordine di priorità (compatibilità award storici).
        const variantPriority = getVariantPriority(variant);
        for (const candidateVariant of variantPriority) {
            const localPath = path.join(
                __dirname,
                '..',
                '..',
                'public',
                'awards',
                String(awardId),
                `${candidateVariant}.png`,
            );
            if (!fs.existsSync(localPath)) continue;

            const filename = buildAwardFilename(award, candidateVariant, 'png');
            return res.download(localPath, filename);
        }

        // Fallback Cloudinary / URL remoto.
        // Non facciamo redirect: serviamo il file come attachment dal backend,
        // così il download resta affidabile anche su mobile/webview.
        // 2) Fallback URL remoti (Cloudinary/CDN), provando più varianti.
        const remoteCandidates = getRemoteVariantCandidates(award, variantPriority);
        if (remoteCandidates.length === 0) {
            return res.status(404).json({ error: 'Variant non disponibile' });
        }

        if (typeof fetch !== 'function') {
            // Fallback difensivo per runtime Node senza fetch globale.
            return res.redirect(302, remoteCandidates[0].url);
        }

        let lastRemoteStatus = null;
        for (const candidate of remoteCandidates) {
            const remoteResp = await fetch(candidate.url);
            if (!remoteResp.ok) {
                lastRemoteStatus = remoteResp.status;
                continue;
            }

            const contentType = remoteResp.headers.get('content-type') || 'image/png';
            const ext = detectImageExt(contentType);
            const filename = buildAwardFilename(award, candidate.variant, ext);
            const bytes = Buffer.from(await remoteResp.arrayBuffer());

            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Length', String(bytes.length));
            return res.status(200).send(bytes);
        }

        if (lastRemoteStatus === 404) {
            return res.status(404).json({
                error: 'Download remoto non disponibile',
                status: 404,
            });
        }

        return res.status(502).json({
            error: 'Download remoto non disponibile',
            status: lastRemoteStatus || 502,
        });
    } catch (error) {
        next(error);
    }
};

function getVariantPriority(requestedVariant) {
    if (requestedVariant === 'story') return ['story', 'square', 'thumb'];
    if (requestedVariant === 'thumb') return ['thumb', 'story', 'square'];
    return ['square', 'story', 'thumb'];
}

function getRemoteVariantCandidates(award, variantPriority) {
    const candidates = [];
    const seen = new Set();

    for (const variant of variantPriority) {
        const url = rawVariantUrl(award, variant);
        if (!url || seen.has(url)) continue;
        seen.add(url);
        candidates.push({ variant, url });
    }

    return candidates;
}

function rawVariantUrl(award, variant) {
    if (variant === 'story') return award.imageUrl || null;
    if (variant === 'thumb') return award.imageThumbUrl || null;
    return award.imageSquareUrl || null;
}

function buildAwardFilename(award, variant, ext) {
    const typeSlug = awardTypeSlug(award.type);
    const periodSlug = slugify(award?.payload?.period?.label || 'periodo');
    const shortId = String(award._id || '').slice(-8) || 'award';
    return `pagelle-fc-${typeSlug}-${periodSlug}-${variant}-${shortId}.${ext}`;
}

function awardTypeSlug(type) {
    switch (type) {
        case 'MATCH_RECAP':
            return 'podio-partita';
        case 'MONTHLY_MVP':
            return 'mvp-mese';
        case 'BALLON_DOR':
            return 'pallone-oro';
        case 'GOLDEN_BOOT':
            return 'scarpa-oro';
        default:
            return 'award';
    }
}

function slugify(value) {
    return String(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-{2,}/g, '-');
}

function detectImageExt(contentType) {
    const ct = String(contentType).toLowerCase();
    if (ct.includes('image/webp')) return 'webp';
    if (ct.includes('image/jpeg') || ct.includes('image/jpg')) return 'jpg';
    return 'png';
}

function buildAwardTitle(type, payload) {
    const period = payload?.period?.label ? ` · ${payload.period.label}` : '';
    switch (type) {
        case 'MATCH_RECAP':
            return `Il Podio della Partita${period}`;
        case 'MONTHLY_MVP':
            return `MVP del Mese${period}`;
        case 'BALLON_DOR':
            return `Pallone d'Oro${period}`;
        case 'GOLDEN_BOOT':
            return `Scarpa d'Oro${period}`;
        default:
            return `Trofeo Pagelle FC${period}`;
    }
}

function resolveShareImageUrl(req, award) {
    if (award.imageSquareUrl) return award.imageSquareUrl;
    if (award.imageUrl) return award.imageUrl;

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return `${baseUrl}/awards-static/${award._id}/square.png`;
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}


module.exports = {
    getTeamAwards,
    getPendingAwards,
    getAwardById,
    markViewed,
    trackShare,
    getPublicAward,
    getPublicAwardSharePage,
    downloadAwardImage
};
