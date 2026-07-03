const BaseRepository = require('./BaseRepository');
const { GoldenTot } = require('../models/GoldenTot');

/**
 * 🏆 GOLDEN TOT REPOSITORY — Accesso dati ai bonus stagionali Pallone d'Oro / Scarpa d'Oro
 *
 * Ogni documento rappresenta un bonus attivo per un giocatore in una stagione.
 * Chiave unica: (teamId, seasonId, playerId, source) → idempotenza garantita.
 */
class GoldenTotRepository extends BaseRepository {

    constructor() {
        super(GoldenTot);
    }

    /**
     * Tutti i bonus attivi per un (team, stagione).
     * Usato in lettura da LeaderboardService e dal controller PlayerCard.
     *
     * @param {string|ObjectId} teamId
     * @param {string} seasonId  - "YYYY-YY"
     * @returns {Promise<Array>}
     */
    async findActiveByTeamSeason(teamId, seasonId) {
        return this.findAll({ teamId, seasonId, isActive: true });
    }

    /**
     * Bonus attivi per un singolo giocatore in una (team, stagione).
     * Restituisce 0, 1 o 2 documenti (BALLON_DOR e/o GOLDEN_BOOT).
     *
     * @param {string|ObjectId} teamId
     * @param {string} seasonId
     * @param {string|ObjectId} playerId
     * @returns {Promise<Array>}
     */
    async findActiveForPlayer(teamId, seasonId, playerId) {
        return this.findAll({ teamId, seasonId, playerId, isActive: true });
    }

    /**
     * Upsert idempotente di un bonus.
     * Se esiste già una riga per (teamId, seasonId, playerId, source) la aggiorna;
     * altrimenti la crea. Usa l'indice unico per garantire no-duplicate.
     *
     * @param {Object} data
     * @param {string|ObjectId} data.teamId
     * @param {string}          data.seasonId        - stagione ATTIVA del bonus (N+1)
     * @param {string|ObjectId} data.playerId
     * @param {string}          data.source          - 'BALLON_DOR' | 'GOLDEN_BOOT'
     * @param {string}          data.field           - 'playerCardTOT' | 'fin'
     * @param {number}          data.delta           - +3 o +2
     * @param {string|ObjectId} data.awardId
     * @param {string}          data.sourceSeasonId  - stagione VINTA (N)
     * @returns {Promise<Object>} documento upsertato
     */
    async upsertBonus({ teamId, seasonId, playerId, source, field, delta, awardId, sourceSeasonId }) {
        const filter = { teamId, seasonId, playerId, source };
        const update = {
            $set: { field, delta, awardId, sourceSeasonId, isActive: true, appliedAt: new Date() }
        };
        return this.model.findOneAndUpdate(filter, update, {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true
        });
    }

    /**
     * Disattiva TUTTI i bonus di una stagione per un team (rollback soft).
     * Reversibile: per riattivare ri-eseguire applyBonusesForSeason.
     *
     * @param {string|ObjectId} teamId
     * @param {string} seasonId
     * @returns {Promise<number>} documenti aggiornati
     */
    async deactivateForSeason(teamId, seasonId) {
        const result = await this.model.updateMany(
            { teamId, seasonId, isActive: true },
            { $set: { isActive: false } }
        );
        return result.modifiedCount;
    }

    /**
     * Disattiva i bonus di un singolo giocatore (decadenza per trasferimento/rimozione).
     *
     * @param {string|ObjectId} teamId
     * @param {string} seasonId
     * @param {string|ObjectId} playerId
     * @returns {Promise<number>} documenti aggiornati
     */
    async deactivateForPlayer(teamId, seasonId, playerId) {
        const result = await this.model.updateMany(
            { teamId, seasonId, playerId, isActive: true },
            { $set: { isActive: false } }
        );
        return result.modifiedCount;
    }
}

module.exports = GoldenTotRepository;
