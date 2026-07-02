// services/SeasonService.js
const Season = require('../models/Season');

/**
 * SEASON SERVICE
 * ──────────────────────────────────────────────────────────────────────────
 * Cuore della logica di stagionalità. Le stagioni sono GLOBALI e CONTIGUE.
 *
 * CONFINE GLOBALE
 *   Una stagione "YYYY-YY" va dal 1 LUGLIO (incluso) dell'anno YYYY
 *   al 1 LUGLIO (escluso) dell'anno YYYY+1.
 *   → Non esistono partite "fuori stagione" (niente buco estivo).
 *
 * CHIAVE
 *   `seasonId` è una STRINGA "YYYY-YY" denormalizzata su tutti i record.
 *   Questo service è l'unica fonte di verità per:
 *     - calcolare il seasonId da una data        → resolveSeasonId()
 *     - calcolare i confini da un seasonId        → seasonBounds()
 *     - gestire l'anagrafica Season (CRUD light)  → ensureSeason/getCurrentSeason/...
 */

// Mese di inizio stagione, 0-based: 6 = Luglio.
const SEASON_START_MONTH = 6;

class SeasonService {

    // ────────────────────────────────────────────────────────────────────
    //  FUNZIONI PURE (nessun accesso al DB)
    // ────────────────────────────────────────────────────────────────────

    /**
     * Calcola il seasonId "YYYY-YY" che copre la data passata.
     * Regola: se mese >= luglio → stagione che inizia quest'anno,
     *         altrimenti → stagione iniziata l'anno scorso.
     *
     * @param {Date|string|number} date
     * @returns {string} es. "2025-26"
     */
    resolveSeasonId(date) {
        const d = new Date(date);
        if (Number.isNaN(d.getTime())) {
            throw new Error(`SeasonService.resolveSeasonId: data non valida (${date})`);
        }
        const startYear = d.getMonth() >= SEASON_START_MONTH
            ? d.getFullYear()
            : d.getFullYear() - 1;
        return this._formatSeasonId(startYear);
    }

    /**
     * Restituisce i confini temporali di un seasonId.
     * seasonStart incluso (1 lug), seasonEnd ESCLUSO (1 lug anno succ.).
     *
     * @param {string} seasonId  es. "2025-26"
     * @returns {{seasonStart: Date, seasonEnd: Date}}
     */
    seasonBounds(seasonId) {
        const startYear = this._startYearOf(seasonId);
        return {
            seasonStart: new Date(startYear, SEASON_START_MONTH, 1, 0, 0, 0, 0),
            seasonEnd: new Date(startYear + 1, SEASON_START_MONTH, 1, 0, 0, 0, 0)
        };
    }

    /**
     * Normalizza il parametro `?season=` delle richieste HTTP → seasonId stringa o null.
     *
     * - undefined / null / "current"  → stagione corrente (stringa "YYYY-YY")
     * - "all"                         → null  (nessun filtro, dati lifetime)
     * - "YYYY-YY"                     → usato direttamente dopo validazione formato
     *
     * Usato dai controller per standardizzare il parsing senza toccare il DB.
     *
     * @param {string|undefined} param - valore di req.query.season
     * @returns {string|null}          - seasonId "YYYY-YY" oppure null
     */
    resolveSeasonParam(param) {
        if (!param || param === 'current') return this.resolveSeasonId(new Date());
        if (param === 'all') return null;
        if (/^\d{4}-\d{2}$/.test(param)) return param;
        throw new Error(`Parametro season non valido: "${param}". Usa YYYY-YY, "current" o "all".`);
    }

    /**
     * Nome leggibile della stagione. Es. "2025-26" → "Stagione 2025/26".
     * @param {string} seasonId
     * @returns {string}
     */
    displayNameFor(seasonId) {
        const startYear = this._startYearOf(seasonId);
        return `Stagione ${startYear}/${String(startYear + 1).slice(2)}`;
    }

    // ────────────────────────────────────────────────────────────────────
    //  ANAGRAFICA (accesso al DB)
    // ────────────────────────────────────────────────────────────────────

    /**
     * Crea la Season se non esiste già (idempotente).
     * NON modifica una Season esistente (status incluso).
     *
     * @param {string} seasonId
     * @param {('active'|'archived'|'upcoming')} [status='upcoming']
     * @returns {Promise<Object>} documento Season
     */
    async ensureSeason(seasonId, status = 'upcoming') {
        const existing = await Season.findOne({ seasonId });
        if (existing) return existing;

        const { seasonStart, seasonEnd } = this.seasonBounds(seasonId);
        return Season.create({
            seasonId,
            displayName: this.displayNameFor(seasonId),
            seasonStart,
            seasonEnd,
            status,
            archivedAt: status === 'archived' ? new Date() : null
        });
    }

    /**
     * Stagione attualmente attiva. Se nessuna è marcata 'active',
     * la deriva da now() e la crea on-demand (safety net).
     *
     * @returns {Promise<Object>} documento Season active
     */
    async getCurrentSeason() {
        const active = await Season.findOne({ status: 'active' });
        if (active) return active;

        const seasonId = this.resolveSeasonId(new Date());
        return this.ensureSeason(seasonId, 'active');
    }

    /**
     * Stagione (documento) che copre una certa data.
     * La crea on-demand se l'anagrafica non la contiene ancora.
     *
     * @param {Date|string|number} date
     * @returns {Promise<Object>} documento Season
     */
    async getSeasonAt(date) {
        const seasonId = this.resolveSeasonId(date);
        return this.ensureSeason(seasonId);
    }

    /**
     * Lista di tutte le stagioni in ordine cronologico DESC (per dropdown UI).
     * @returns {Promise<Array<Object>>}
     */
    async listSeasons() {
        return Season.find().sort({ seasonStart: -1 });
    }

    // ────────────────────────────────────────────────────────────────────
    //  HELPER PRIVATI
    // ────────────────────────────────────────────────────────────────────

    _formatSeasonId(startYear) {
        return `${startYear}-${String(startYear + 1).slice(2)}`;
    }

    _startYearOf(seasonId) {
        if (!/^\d{4}-\d{2}$/.test(String(seasonId))) {
            throw new Error(`SeasonService: seasonId non valido (${seasonId}), atteso "YYYY-YY"`);
        }
        return Number(String(seasonId).split('-')[0]);
    }
}

module.exports = SeasonService;
