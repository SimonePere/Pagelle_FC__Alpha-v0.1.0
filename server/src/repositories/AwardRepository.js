const BaseRepository = require('./BaseRepository');
const Award = require('../models/Award');

/**
 * AWARD REPOSITORY - Gestione accesso dati Award
 *
 * RESPONSABILITÀ:
 * - Operazioni CRUD su Award (ereditate da BaseRepository)
 * - Query specializzate per bacheca team, pending per utente, retry falliti
 * - Tracking view/share/visite pubbliche
 *
 * FUNZIONALITÀ:
 *   Ereditate da BaseRepository:
 *   - create(data)              → crea Award
 *   - findAll(filter, options)  → query generiche
 *   - findById(id)              → trova per ID
 *   - update(id, data)          → aggiorna Award
 *   - delete(id)                → elimina Award
 *
 *   Specifici Award:
 *   - findByTeam(teamId, filters)              → bacheca team (filtro tipo/status, paginazione)
 *   - findByTeamAndRef(teamId, refId, type)    → anti-duplicato (rispetta indice unique)
 *   - findPendingForUser(userId, teamIds)      → award READY mai aperte dall'utente
 *   - findFailedForRetry(maxAttempts)          → award FAILED da riprovare
 *   - markViewed(awardId, userId)              → aggiunge userId a viewedBy (idempotente)
 *   - markReady(awardId, urls)                 → status READY + imageUrl/imageSquareUrl/imageThumbUrl/shareUrl
 *   - markFailed(awardId, errorMessage)        → status FAILED + incrementa generationAttempts
 *   - incrementShareClick(awardId, channel)    → +1 su stats.shareClicks[channel]
 *   - incrementPublicVisit(awardId)            → +1 su stats.publicPageVisits
 *   - incrementView(awardId)                   → +1 su stats.views
 */
class AwardRepository extends BaseRepository {
    constructor() {
        super(Award);
    }

    // ============================================
    // QUERY
    // ============================================

    /**
     * Lista award di un team (bacheca)
     * @param {string} teamId
     * @param {Object} filters - { type?, status?, limit?, skip? }
     */
    async findByTeam(teamId, filters = {}) {
        const query = { teamId };
        if (filters.type) query.type = filters.type;
        if (filters.status) query.status = filters.status;
        // Filtro stagione: null significa nessun filtro ("all")
        if (filters.seasonId) query.seasonId = filters.seasonId;

        return this.findAll(query, {
            sort: { generatedAt: -1 },
            limit: filters.limit || 20,
            skip: filters.skip || 0
        });
    }

    /**
     * Anti-duplicato: cerca award per coppia team+refId+type
     * Sfrutta indice unique (teamId, refId, type)
     */
    async findByTeamAndRef(teamId, refId, type) {
        return this.model.findOne({ teamId, refId, type }).exec();
    }

    /**
     * Award READY mai aperte dall'utente (per cerimoniale reveal)
     * @param {string} userId
     * @param {Array<string>} teamIds - team di cui l'utente è membro
     */
    async findPendingForUser(userId, teamIds = []) {
        return this.findAll({
            teamId: { $in: teamIds },
            status: 'READY',
            viewedBy: { $ne: userId }
        }, { sort: { generatedAt: -1 } });
    }

    /**
     * Award FAILED da riprovare (per cron retry)
     * @param {number} maxAttempts - default 3
     */
    async findFailedForRetry(maxAttempts = 3) {
        return this.findAll({
            status: 'FAILED',
            generationAttempts: { $lt: maxAttempts }
        }, { sort: { generatedAt: 1 } });
    }

    // ============================================
    // MUTATIONS
    // ============================================

    /**
     * Marca award come vista da un utente (idempotente)
     */
    async markViewed(awardId, userId) {
        return this.model.findByIdAndUpdate(
            awardId,
            {
                $addToSet: { viewedBy: userId },
                $inc: { 'stats.views': 1 }
            },
            { new: true }
        ).exec();
    }

    /**
     * Render completato: salva URL e passa a READY
     * @param {string} awardId
     * @param {Object} urls - { imageUrl, imageSquareUrl, imageThumbUrl, shareUrl }
     */
    async markReady(awardId, urls = {}) {
        return this.model.findByIdAndUpdate(
            awardId,
            {
                $set: {
                    status: 'READY',
                    finalizedAt: new Date(),
                    imageUrl: urls.imageUrl,
                    imageSquareUrl: urls.imageSquareUrl,
                    imageThumbUrl: urls.imageThumbUrl,
                    shareUrl: urls.shareUrl,
                    lastError: null
                }
            },
            { new: true }
        ).exec();
    }

    /**
     * Render fallito: status FAILED + incrementa attempts
     */
    async markFailed(awardId, errorMessage) {
        return this.model.findByIdAndUpdate(
            awardId,
            {
                $set: { status: 'FAILED', lastError: String(errorMessage || 'Unknown error') },
                $inc: { generationAttempts: 1 }
            },
            { new: true }
        ).exec();
    }

    // ============================================
    // TRACKING METRICHE
    // ============================================

    /**
     * +1 condivisione su canale
     * @param {string} channel - native | whatsapp | telegram | copyLink | download
     */
    async incrementShareClick(awardId, channel) {
        const allowed = ['native', 'whatsapp', 'telegram', 'copyLink', 'download'];
        if (!allowed.includes(channel)) {
            throw new Error(`Canale share non valido: ${channel}`);
        }
        return this.model.findByIdAndUpdate(
            awardId,
            { $inc: { [`stats.shareClicks.${channel}`]: 1 } },
            { new: true }
        ).exec();
    }

    /**
     * +1 visita pagina pubblica /c/:cardId
     */
    async incrementPublicVisit(awardId) {
        return this.model.findByIdAndUpdate(
            awardId,
            { $inc: { 'stats.publicPageVisits': 1 } },
            { new: true }
        ).exec();
    }

    /**
     * +1 view modal (senza toccare viewedBy)
     */
    async incrementView(awardId) {
        return this.model.findByIdAndUpdate(
            awardId,
            { $inc: { 'stats.views': 1 } },
            { new: true }
        ).exec();
    }
}

module.exports = AwardRepository;