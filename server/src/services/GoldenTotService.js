/**
 * ============================================================
 * GOLDEN TOT SERVICE
 * ============================================================
 *
 * Gestisce i bonus temporanei stagionali assegnati ai vincitori
 * del Pallone d'Oro (BALLON_DOR) e della Scarpa d'Oro (GOLDEN_BOOT)
 * della stagione precedente:
 *
 *   - Pallone d'Oro stagione N  →  +3 al playerCardTOT nella stagione N+1
 *   - Scarpa d'Oro  stagione N  →  +2 all'attributo fin  nella stagione N+1
 *
 * PRINCIPIO FONDAMENTALE:
 *   I dati "veri" (PlayerCardResult, PlayerLeaderboardStats) non vengono
 *   MAI modificati. Il bonus è materializzato SOLO nella collection GoldenTot.
 *   La somma avviene IN LETTURA (decoration del DTO) → zero side-effect storici.
 *
 * IDEMPOTENZA:
 *   applyBonusesForSeason può essere chiamato N volte: l'upsert sull'indice
 *   unico (teamId, seasonId, playerId, source) garantisce un solo documento
 *   per vincitore/fonte/stagione. Sicuro da hook award + cron rollover.
 *
 * ROLLBACK:
 *   rollbackSeason → isActive:false su tutti i bonus della stagione.
 *   La lettura successiva (getActiveBonuses) non include più nulla.
 *
 * FLUSSO PRINCIPALE:
 *   1. generatePeriodicAwards genera BALLON_DOR + GOLDEN_BOOT (stagione N)
 *   2. Hook chiama applyBonusesForSeason(teamId, stagione N+1)  ← primario
 *   3. seasonRolloverJob chiama lo stesso metodo come rete di sicurezza
 *   4. In lettura (leaderboard, cards) → getActiveBonuses porta la mappa bonus
 *   5. I controller decorano il DTO senza toccare il dato grezzo
 *
 * DIPENDENZE:
 *   - GoldenTotRepository  → DB access
 *   - AwardRepository       → legge i vincitori degli award stagionali
 *   - SeasonService         → calcolo previousSeasonId, validazione formato
 *   - CacheService          → invalidazione cache leaderboard post-apply
 * ============================================================
 */

const GoldenTotRepository = require('../repositories/GoldenTotRepository');
const AwardRepository = require('../repositories/AwardRepository');
const SeasonService = require('./SeasonService');
const cacheService = require('./CacheService'); // singleton, non classe
const { GOLDEN_TOT_RULES } = require('../models/GoldenTot');

// Tipi di award stagionali che generano un bonus GoldenTot.
// Mantenuto in sync con GOLDEN_TOT_RULES: se domani arriva un terzo
// premio stagionale, basta aggiungere qui e nelle RULES.
const SEASON_AWARD_TYPES = Object.keys(GOLDEN_TOT_RULES); // ['BALLON_DOR', 'GOLDEN_BOOT']

class GoldenTotService {

    constructor() {
        this.goldenTotRepository = new GoldenTotRepository();
        this.awardRepository = new AwardRepository();
        this.seasonService = new SeasonService();
        this.cacheService = cacheService; // singleton condiviso
    }

    // ================================================================
    // METODO PRINCIPALE — applicazione bonus a inizio stagione
    // ================================================================

    /**
     * Applica (o aggiorna) i bonus GoldenTot per la stagione `currentSeasonId`
     * leggendo i vincitori degli award BALLON_DOR e GOLDEN_BOOT della stagione
     * precedente (`prevSeasonId`).
     *
     * QUANDO chiamarlo:
     *   - Subito dopo la creazione riuscita di BALLON_DOR + GOLDEN_BOOT in
     *     generatePeriodicAwards.js (hook primario, pattern lazy require + try/catch).
     *   - Al rollover in seasonRolloverJob.js (rete di sicurezza).
     *   - Via endpoint admin POST /seasons/apply-golden-tot (backfill/test PROD).
     *
     * COMPORTAMENTO:
     *   - Se un award non esiste o non è READY → skip silenzioso (no errore).
     *   - Se il vincitore è un ospite (playerId null) → skip.
     *   - Se il vincitore non è più membro del team → skip (check membership).
     *   - Tutto il resto → upsert idempotente (sicuro su re-run multipli).
     *
     * @param {string|ObjectId} teamId         - ID del team
     * @param {string}          currentSeasonId - stagione ATTIVA del bonus, es. "2026-27"
     * @returns {Promise<{applied: number, skipped: number, details: Array}>}
     *          Riepilogo operazione (utile per log e test).
     */
    async applyBonusesForSeason(teamId, currentSeasonId) {
        // ── 1. Calcola la stagione precedente (quella da cui si legge il vincitore).
        //       currentSeasonId "2026-27" → prevSeasonId "2025-26".
        //       ⚠️ ANTI-OFF-BY-ONE: il bonus si applica su N+1, non su N.
        const prevSeasonId = this._previousSeasonId(currentSeasonId);

        // ── 2. Carica tutti gli award stagionali della stagione precedente per questo team.
        //       Filtriamo per status READY: non usiamo PENDING/FAILED (dati incompleti).
        const awards = await this.awardRepository.findByTeam(teamId, {
            status: 'READY',
            seasonId: prevSeasonId,
            limit: 10 // sono al massimo 2 per stagione (BALLON_DOR + GOLDEN_BOOT)
        });

        // Teniamo solo i tipi che hanno una regola bonus (BALLON_DOR, GOLDEN_BOOT).
        const seasonAwards = awards.filter(a => SEASON_AWARD_TYPES.includes(a.type));

        if (seasonAwards.length === 0) {
            // Nessun award trovato o nessuno READY: situazione normale a inizio stagione
            // se il cron non è ancora girato. No errore, solo log.
            console.log(
                `[GoldenTotService] applyBonusesForSeason: nessun award stagionale READY ` +
                `trovato per team=${teamId} stagione-vinta=${prevSeasonId}. Skip.`
            );
            return { applied: 0, skipped: 0, details: [] };
        }

        // ── 3. Carica i memberIds attuali del team per il check membership (D-E).
        //       Se il vincitore ha lasciato il team, il bonus non viene applicato.
        //       Importiamo il model Team direttamente (nessun TeamRepository necessario qui:
        //       è solo una select leggera su un singolo campo).
        const Team = require('../models/Team');
        const team = await Team.findById(teamId).select('memberIds').lean();
        const memberIdSet = new Set(
            (team?.memberIds || []).map(id => id.toString())
        );

        // ── 4. Per ogni award trovato, applica la regola bonus.
        let applied = 0;
        let skipped = 0;
        const details = [];
        const appliedWinnerIds = new Set(); // per invalidazione cache playercard

        for (const award of seasonAwards) {
            const rule = GOLDEN_TOT_RULES[award.type];
            // Doppia sicurezza: salta se la regola non esiste (futuro-proofing).
            if (!rule) {
                console.warn(`[GoldenTotService] Nessuna regola per type=${award.type}, skip.`);
                skipped++;
                continue;
            }

            // Il vincitore si trova in payload.hero.playerId (verificato sui dati reali:
            // per gli award stagionali `podium` è vuoto, il vincitore è SEMPRE in `hero`).
            const winnerId = award.payload?.hero?.playerId;

            if (!winnerId) {
                // Può accadere se il vincitore era un ospite non registrato.
                console.warn(
                    `[GoldenTotService] Award ${award._id} (${award.type}) senza winnerId. Skip.`
                );
                skipped++;
                details.push({ awardType: award.type, status: 'skip', reason: 'winnerId null' });
                continue;
            }

            // Check membership: se il vincitore non è più nel team, il bonus decade (D-E).
            if (!memberIdSet.has(winnerId.toString())) {
                console.warn(
                    `[GoldenTotService] Vincitore ${winnerId} non è membro del team ${teamId}. ` +
                    `Bonus ${award.type} non applicato.`
                );
                skipped++;
                details.push({
                    awardType: award.type,
                    winnerId: winnerId.toString(),
                    status: 'skip',
                    reason: 'winner non più nel team'
                });
                continue;
            }

            // ── 5. Upsert idempotente: se esiste già (re-run), sovrascrive i valori.
            await this.goldenTotRepository.upsertBonus({
                teamId,
                seasonId: currentSeasonId,   // stagione N+1 (dove il bonus è ATTIVO)
                playerId: winnerId,
                source: award.type,          // 'BALLON_DOR' | 'GOLDEN_BOOT'
                field: rule.field,           // 'playerCardTOT' | 'fin'
                delta: rule.delta,           // +3 | +2
                awardId: award._id,          // tracciabilità: da quale award nasce
                sourceSeasonId: prevSeasonId // stagione N (quella vinta)
            });

            applied++;
            appliedWinnerIds.add(winnerId.toString());
            details.push({
                awardType: award.type,
                winnerId: winnerId.toString(),
                field: rule.field,
                delta: rule.delta,
                status: 'applied'
            });

            console.log(
                `[GoldenTotService] ✅ Bonus ${award.type} applicato: ` +
                `giocatore=${winnerId}, +${rule.delta} su ${rule.field}, ` +
                `stagione-attiva=${currentSeasonId} (vinta in ${prevSeasonId})`
            );
        }

        // ── 6. Invalida la cache leaderboard e i risultati playercard dei vincitori.
        try {
            await this.cacheService.invalidateLeaderboardsAfterVote(teamId);
            if (appliedWinnerIds.size > 0) {
                await this.cacheService.invalidatePlayerCardsAfterVote([...appliedWinnerIds]);
            }
        } catch (cacheErr) {
            console.warn(`[GoldenTotService] Impossibile invalidare cache: ${cacheErr.message}`);
        }

        // ── 7. Genera news per i premi appena applicati.
        if (applied > 0) {
            try {
                const NewsService = require('./NewsService');
                const newsService = new NewsService();
                const newsAwards = seasonAwards
                    .filter(a => details.find(d => d.awardType === a.type && d.status === 'applied'))
                    .map(a => ({ type: a.type, hero: a.payload?.hero, seasonId: prevSeasonId }));
                await newsService.createNewsOnSeasonAwards(teamId, newsAwards);
            } catch (newsErr) {
                console.warn(`[GoldenTotService] news error: ${newsErr.message}`);
            }
        }

        console.log(
            `[GoldenTotService] applyBonusesForSeason completato: ` +
            `team=${teamId}, stagione-attiva=${currentSeasonId} | ` +
            `applicati=${applied}, skippati=${skipped}`
        );

        return { applied, skipped, details };
    }

    // ================================================================
    // LETTURA — usato da LeaderboardService e dai controller PlayerCard
    // ================================================================

    /**
     * Restituisce una MAPPA dei bonus attivi per tutti i giocatori di un
     * (team, stagione), nel formato:
     *
     *   {
     *     "<playerId>": {
     *       playerCardTOT: { delta: 3, source: 'BALLON_DOR', sourceSeasonId: '2025-26', awardId: ... },
     *       fin:           { delta: 2, source: 'GOLDEN_BOOT', sourceSeasonId: '2025-26', awardId: ... }
     *     },
     *     ...
     *   }
     *
     * I campi `playerCardTOT` e `fin` sono presenti SOLO se il giocatore ha il
     * bonus corrispondente attivo. Giocatori senza bonus non appaiono nella mappa.
     *
     * Un solo round-trip DB (findActiveByTeamSeason) → efficiente.
     *
     * NOTA: la membership non viene ri-verificata qui perché la mappa viene
     * usata solo per giocatori già nel team (la leaderboard e la pagina CARDS
     * mostrano solo membri attuali). Il check avviene in applyBonusesForSeason.
     *
     * @param {string|ObjectId} teamId
     * @param {string}          seasonId  - stagione corrente "YYYY-YY"
     * @returns {Promise<Object>}  mappa playerId → { playerCardTOT?, fin? }
     */
    async getActiveBonuses(teamId, seasonId) {
        const bonuses = await this.goldenTotRepository.findActiveByTeamSeason(teamId, seasonId);

        // Costruzione mappa: un giocatore può avere fino a 2 bonus (un per source).
        const map = {};
        for (const bonus of bonuses) {
            const pid = bonus.playerId.toString();
            if (!map[pid]) map[pid] = {};

            // La chiave nella mappa è il campo target (es. "playerCardTOT" o "fin"),
            // così il consumer sa esattamente su quale valore sommare il delta.
            map[pid][bonus.field] = {
                delta: bonus.delta,
                source: bonus.source,         // 'BALLON_DOR' | 'GOLDEN_BOOT'
                sourceSeasonId: bonus.sourceSeasonId, // stagione vinta (N)
                awardId: bonus.awardId         // per link/tooltip nel frontend
            };
        }

        return map;
    }

    // ================================================================
    // ROLLBACK
    // ================================================================

    /**
     * Disattiva (soft-delete) TUTTI i bonus attivi di un (team, stagione).
     * Non cancella i documenti: li mette isActive:false → audit trail preservato.
     * Per riattivare: ri-eseguire applyBonusesForSeason (idempotente).
     *
     * Usato da: endpoint admin, test PROD, situazioni di emergenza.
     *
     * @param {string|ObjectId} teamId
     * @param {string}          seasonId
     * @returns {Promise<number>}  numero di bonus disattivati
     */
    async rollbackSeason(teamId, seasonId) {
        const count = await this.goldenTotRepository.deactivateForSeason(teamId, seasonId);

        // Invalida la cache: il frontend deve smettere di mostrare i bonus subito.
        try {
            await this.cacheService.invalidateLeaderboardsAfterVote(teamId);
        } catch (cacheErr) {
            console.warn(`[GoldenTotService] rollback cache error: ${cacheErr.message}`);
        }

        console.log(
            `[GoldenTotService] 🔄 rollbackSeason completato: ` +
            `team=${teamId}, stagione=${seasonId}, bonus disattivati=${count}`
        );
        return count;
    }

    /**
     * Disattiva i bonus di un singolo giocatore per una stagione.
     * Chiamato quando un giocatore viene rimosso dal team durante la stagione
     * (evento raro, D-E del piano). Il bonus decade immediatamente.
     *
     * @param {string|ObjectId} teamId
     * @param {string}          seasonId
     * @param {string|ObjectId} playerId
     * @returns {Promise<number>}  numero di bonus disattivati (0, 1 o 2)
     */
    async revokePlayerBonus(teamId, seasonId, playerId) {
        const count = await this.goldenTotRepository.deactivateForPlayer(teamId, seasonId, playerId);
        if (count > 0) {
            console.log(
                `[GoldenTotService] ⚠️ Bonus revocati per giocatore rimosso dal team: ` +
                `player=${playerId}, team=${teamId}, stagione=${seasonId}, revocati=${count}`
            );
        }
        return count;
    }

    // ================================================================
    // HELPER PRIVATI
    // ================================================================

    /**
     * Calcola il seasonId della stagione precedente.
     * Esempio: "2026-27" → "2025-26".
     *
     * Delegato a SeasonService per rispettare il principio "unica fonte di verità
     * sul formato YYYY-YY". Usiamo _startYearOf per estrarre l'anno di inizio
     * e ricostruiamo la stagione precedente con _formatSeasonId.
     *
     * ⚠️ CRITICO: questo è il punto in cui nasce il potenziale off-by-one.
     *    Il test DEVE verificare: _previousSeasonId("2026-27") === "2025-26"
     *    e MAI === "2026-27".
     *
     * @param {string} seasonId  - es. "2026-27"
     * @returns {string}         - es. "2025-26"
     */
    _previousSeasonId(seasonId) {
        // Validiamo il formato e estraiamo l'anno di inizio tramite SeasonService.
        // _startYearOf("2026-27") → 2026
        // _formatSeasonId(2026 - 1) → _formatSeasonId(2025) → "2025-26"
        const startYear = this.seasonService._startYearOf(seasonId);
        return this.seasonService._formatSeasonId(startYear - 1);
    }
}

module.exports = GoldenTotService;
