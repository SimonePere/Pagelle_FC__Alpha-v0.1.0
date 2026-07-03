const {
    VotingSessionRepository,
    VoteResultRepository,
    VoteSubmissionRepository,
    AwardRepository,
    UserRepository,
    MatchRepository,
} = require('../repositories');

const SeasonService = require('./SeasonService');

// Renderer: converte Award PENDING → PNG → upload → READY
// Lazy-require per evitare errori circolari e ritardare il caricamento dei font
let _renderAndUpload = null;
function getRenderAndUpload() {
    if (!_renderAndUpload) {
        _renderAndUpload = require('../renderer/renderAward').renderAndUpload;
    }
    return _renderAndUpload;
}

// const { NewsService } = require('./NewsService'); TODO: integrare NewsService per creare notizie su MVP, Recap, ecc.

/**
 *   AWARDSERVICE - Creazione e gestione de Pagelle FC Award (MVP Mese, Recap, Pallone d'Oro, Scarpa d'Oro)
 * 
 * - Crea e aggiorna documenti Award basati sui risultati delle VotingSession
 * - Fornisce metodi per recuperare Award pronti per la visualizzazione (READY) e per triggerare la generazione (PENDING)
 * - Interagisce con VotingSessionRepository per ottenere i dati necessari alla generazione degli Award
 * - Gestisce la logica di business per determinare i vincitori degli Award
 * - (In futuro) Interagisce con NewsService per creare notizie basate sugli Award generati
 * 
 *   METODI PRINCIPALI:
 * - async createMatchRecapAward(matchId): Crea un Award di tipo MATCH_RECAP (podio della partita, cioe migliori 3 giocatori) basato sui risultati di una VotingSession di un match specifico. Semplice calcolo user MAX Voto partita
 *   Chiamato da VotingService.completeSession()
 * 
 * - async createMonthlyMVPAward(teamId, month): Crea un Award di tipo MONTHLY_MVP (migliore del mese) basato sui risultati aggregati delle VotingSession del team in un dato mese. Semplice calcolo user MAX Voto mese
 *   Chiamato dal cron mensile
 * 
 * - async createBallonDorAward(teamId, season): Crea un Award di tipo BALLON_DOR (migliore della stagione) basato sui risultati aggregati delle VotingSession del team in una data stagione. Semplice calcolo user MAX Voto. Decide fine stagione da campo "seasonEndDate" in Team (di default al 30 Giugno).
 *  Chiamato dal cron stagionale
 * 
 * - async createGoldenBootAward(teamId, season): Crea un Award di tipo GOLDEN_BOOT (capocannoniere della stagione) basato sui risultati aggregati delle VotingSession del team in una data stagione. Semplice calcolo user MAX Goal. Decide fine stagione da campo "seasonEndDate" in Team (di default al 30 Giugno).
 *  Chiamato dal cron stagionale
 * 
 * METODI LOGICA BUSINESS REGOLE GENERAZIONE AWARD 
 * (per rendere meritocratiche le premiazioni ed evitare che un giocatore con pochi voti ma tutti alti possa battere un giocatore con molti voti ma media leggermente inferiore, applichiamo una regola di "quorum minimo" per la validità dell'Award):
 * 
 * - MATCH_RECAP	Affluenza voti ≥ 50% AND voto del 1° ≥ 5.0
 * - MONTHLY_MVP	Protagonista ≥ 3 partite nel mese AND team ≥ 2 partite chiuse nel mese
 * - BALLON_DOR	    Protagonista ≥ 50% partite stagione AND stagione ≥ 10 partite
 * - GOLDEN_BOOT	Protagonista ≥ 5 gol stagione AND stagione ≥ 10 partite
 * 
 * TIE-BREAKER (in caso di parità di voto medio, si applicano i seguenti criteri in ordine, L'autovoto resta incluso nella media voto base (scelta di prodotto), ma è escluso dai criteri di tie-breaker)
 * Applicata sia al podio (MATCH_RECAP) sia al protagonista delle card Hero:
 *
 * 1. Media voto / gol più alti
 * 2. Numero di preferenze ricevute (escluso autovoto)
 * 3. Voto singolo più alto ricevuto da altri (escluso autovoto)
 * 4. Numero di partite giocate
 * 5. Ordine alfabetico del nickname (fallback estremo)
 * 
 * Gestione guest:
 * 1. Il guest è trattato esattamente come un iscritto ai fini della card.
 * 2. Sul podio/hero compare con il nome registrato dall'admin, senza marker speciali.
 * 3. Nessuna privacy distinta: appartenenza al team = visibilità sulla card.
 * 
 */

class AwardService {
    /**
     * Costruttore - Inizializza i repository
     */
    constructor() {
        this.VotingSessionRepository = new VotingSessionRepository();
        this.VoteResultRepository = new VoteResultRepository();
        this.VoteSubmissionRepository = new VoteSubmissionRepository();
        this.AwardRepository = new AwardRepository();
        this.UserRepository = new UserRepository();
        this.MatchRepository = new MatchRepository();
        this.seasonService = new SeasonService();
        // this.newsService = new NewsService(); TODO: integrare NewsService per creare notizie su MVP, Recap, ecc.
    }


    // ========================
    //  METODI PRINCIPALI  
    // ========================


    /**
    * Crea un Award di tipo MATCH_RECAP
    * @param {Object} matchId - ID del match per cui generare il recap
    * @returns {Object} Award MATCH_RECAP
    */
    async createMatchRecapAward(matchId) {

        // 1. Trova VotingSession dal match
        const votingSession = await this.VotingSessionRepository.findOne({
            type: 'match_rating',
            targetId: matchId,
            status: 'completed'
        });
        if (!votingSession) {
            console.info(`Nessuna VotingSession completata trovata per matchId: ${matchId}`);
            return null;
        }

        //2. Controllo (anti-duplicato)
        // se esiste già un Award MATCH_RECAP per questo match 
        const existingAward = await this.AwardRepository.findByTeamAndRef(
            votingSession.teamId,
            matchId,
            'MATCH_RECAP'
        );
        if (existingAward) {
            return existingAward;
        }

        // 3. Carica VoteResult e VoteSubmissions
        const voteResult = await this.VoteResultRepository.findByVotingSession(votingSession._id);
        if (!voteResult) {
            console.warn(`[Award] VoteResult mancante per session=${votingSession._id}`);
            return null;
        }
        const submissions = await this.VoteSubmissionRepository.findAll({
            votingSessionId: votingSession._id,
            isActive: true
        });
        if (!submissions?.length) {
            console.warn(`[Award] Nessuna submission per session=${votingSession._id}`);
            return null;
        }

        // 4. Controllo quorum (logica di business per evitare award non meritocratici)
        const eligibleCount = votingSession.eligibleVoters.length;
        const totalVoters = voteResult.statistics.voteCount;
        const turnoutPct = eligibleCount > 0 ? (totalVoters / eligibleCount) * 100 : 0;

        const playerStats = Array.from(voteResult.matchRatingResults.values());
        playerStats.sort((a, b) => b.averageRating - a.averageRating);
        const topPlayer = playerStats[0];

        if (turnoutPct < 50 || !topPlayer || topPlayer.averageRating < 5.0) {
            console.info(
                `[Award] MATCH_RECAP sotto soglia: turnout=${turnoutPct.toFixed(1)}%, ` +
                `topAvg=${topPlayer?.averageRating}. Skip.`
            );
            return null;
        }

        // 5. Carica gli User dei giocatori coinvolti (una SOLA query batch per nickname/avatar)
        //    Pattern: invece di N findById in loop, prendiamo tutto con $in e poi
        //    costruiamo una Map per lookup O(1) (chiave = id stringa, perché ObjectId
        //    non è confrontabile con === essendo un oggetto).
        const playerIds = Array.from(voteResult.matchRatingResults.keys());
        const users = await this.UserRepository.findAll({ _id: { $in: playerIds } });
        const userMap = new Map(users.map(u => [u._id.toString(), u]));

        // 6. Costruisci i CANDIDATI arricchiti con le metriche per il tie-breaker.
        //
        //    Da voteResult abbiamo già media + voteCount (autovoto INCLUSO, scelta di prodotto).
        //    Dalle submissions calcoliamo:
        //      - votersExclSelf:  quante persone ≠ il giocatore stesso lo hanno votato (criterio #2)
        //      - maxVoteExclSelf: voto massimo ricevuto DA ALTRI                       (criterio #3)
        const candidates = this._buildCandidates(
            voteResult.matchRatingResults,
            submissions,
            userMap
        );

        // 7. Guard: serve un podio "pieno", quindi minimo 3 candidati con almeno un voto.
        //    Se la partita ha avuto pochi giocatori votati, niente card (decisione di prodotto).
        if (candidates.length < 3) {
            console.info(
                `[Award] MATCH_RECAP saltato: solo ${candidates.length} candidati ` +
                `(minimo 3 per popolare il podio)`
            );
            return null;
        }

        // 8. Ordinamento a CASCATA con i 5 criteri ufficiali.
        const ranked = this._rankByTieBreaker(candidates);

        // 9. Costruisci il PODIO finale (top 3) nel formato del payload Award.
        //    mvpStreakCount: ha senso SOLO per il #1 (gli altri oggi non sono MVP).
        //    Per il #1: cerco gli Award MATCH_RECAP precedenti consecutivi in cui era #1
        //    e sommo +1 per la partita corrente.
        const streakOfFirst = await this._computeMvpStreak(votingSession.teamId, ranked[0].playerId);
        const podium = ranked.slice(0, 3).map((p, i) => ({
            position: i + 1,
            playerId: p.playerId,
            name: p.name,
            avatar: p.avatar,
            avg: Number(p.avg.toFixed(2)),   // arrotonda a 2 decimali per il render
            votersCount: p.votersCount,
            mvpStreakCount: i === 0 ? streakOfFirst : 0
        }));

        // 9.5. Costruisci HIGHLIGHTS narrativi (max 2, in ordine di priorità).
        //      Si basano su podio + dati grezzi già in memoria (nessuna query extra).
        const highlights = this._computeHighlights({
            podium,
            candidates: ranked,
            matchRatingResults: voteResult.matchRatingResults,
            mvpStreakOfFirst: streakOfFirst
        });

        // 10. Costruisci il PAYLOAD snapshot immutabile dell'award.
        //     Nota: la card userà SOLO questo payload, mai i dati live → se domani
        //     il giocatore cambia nome o lascia il team, la card resta storica.
        //     IMPORTANTE: la data del period deve riflettere la data EFFETTIVA della
        //     partita (Match.date), non il momento di generazione dell'award.
        //     Fallback: votingSession.createdAt → new Date() (ultima spiaggia).
        const matchDoc = await this.MatchRepository.findById(matchId);
        const matchDate = matchDoc?.date || votingSession.createdAt || new Date();
        const payload = {
            seasonId: this.seasonService.resolveSeasonId(matchDate),
            period: {
                label: this._formatItalianDate(matchDate),     // "16 Maggio 2026"
                dateFrom: matchDate,
                dateTo: matchDate
            },
            podium,
            highlights,
            totalVoters: totalVoters,
            eligibleVoters: eligibleCount,
            autoVoteExcluded: true                             // i tie-breaker hanno escluso l'autovoto
        };

        // 11. Crea l'Award in stato PENDING.
        //     Il renderer (Satori) lo prenderà in carico in seguito e lo porterà a READY
        //     popolando imageUrl/imageSquareUrl/imageThumbUrl/shareUrl.
        const award = await this.AwardRepository.create({
            teamId: votingSession.teamId,
            type: 'MATCH_RECAP',
            refId: String(matchId),
            seasonId: this.seasonService.resolveSeasonId(matchDate),
            status: 'PENDING',
            generatedAt: new Date(),
            payload
        });

        console.info(
            `[Award] MATCH_RECAP creato id=${award._id} team=${votingSession.teamId} ` +
            `match=${matchId} podio=[${podium.map(p => p.name).join(', ')}]`
        );

        // Fire-and-forget: renderizza e carica immagine (PENDING → READY)
        getRenderAndUpload()(award).catch(err =>
            console.error(`[Award] Render MATCH_RECAP fallito id=${award._id}: ${err.message}`)
        );

        return award;
    }


    // ============================================
    // 🧮 HELPER PRIVATI (riutilizzabili per MVP/Pallone/Scarpa)
    // ============================================

    /**
     * Costruisce l'array di candidati arricchito con metriche per il tie-breaker.
     *
     * Per ogni player presente in matchRatingResults:
     *  - copia media + voteCount totale (autovoto INCLUSO)
     *  - calcola dai voti grezzi (submissions) le metriche "esclusione autovoto":
     *      votersExclSelf  → numero votanti diversi dal giocatore stesso
     *      maxVoteExclSelf → voto massimo ricevuto da altri
     *  - aggiunge nome/avatar dall'userMap (fallback se utente cancellato)
     *
     * @param {Map}   matchRatingResults  Map playerId → { averageRating, voteCount, ... }
     * @param {Array} submissions         lista di VoteSubmission grezze
     * @param {Map}   userMap             Map idString → User (per nickname/avatar)
     * @returns {Array<Object>}           array di candidati pronti per il sort
     */
    _buildCandidates(matchRatingResults, submissions, userMap) {
        const candidates = [];

        // matchRatingResults è una Map Mongoose: itero come una Map standard.
        for (const [playerIdStr, stat] of matchRatingResults.entries()) {
            const playerObjectId = stat.playerId;

            let votersExclSelf = 0;
            let maxVoteExclSelf = 0;
            let minVoteExclSelf = Infinity;   // per UNANIMOUS_MVP highlight

            // Scorri tutte le submissions: ognuna è di UN votante che ha votato N player.
            for (const sub of submissions) {
                // Trova il rating dato da questo votante a questo player (se esiste).
                const rating = sub.voteData?.playerRatings?.find(r =>
                    r.playerId && r.playerId.equals(playerObjectId)
                );
                if (!rating) continue;                  // non l'ha votato

                // Salta l'autovoto SOLO per i criteri di tie-breaker (#2, #3) e per highlight unanime.
                // .equals() perché entrambi sono ObjectId: === non funziona.
                if (sub.voterId && sub.voterId.equals(playerObjectId)) continue;

                votersExclSelf += 1;
                if (rating.rating > maxVoteExclSelf) maxVoteExclSelf = rating.rating;
                if (rating.rating < minVoteExclSelf) minVoteExclSelf = rating.rating;
            }

            const user = userMap.get(playerIdStr);
            candidates.push({
                playerId: playerObjectId,
                name: user?.name || 'Sconosciuto',
                avatar: user?.profile?.avatar || null,
                avg: stat.averageRating,
                votersCount: stat.voteCount,
                votersExclSelf,
                maxVoteExclSelf,
                minVoteExclSelf: minVoteExclSelf === Infinity ? null : minVoteExclSelf,
                goals: stat.goals || 0,
                assists: stat.assists || 0,
                matchesPlayed: 1                          // placeholder per MATCH_RECAP
            });
        }

        return candidates;
    }

    /**
     * Ordinamento a CASCATA secondo i 5 criteri ufficiali del documento di design.
     *
     *   1. Media voto più alta            (autovoto incluso)      [oppure GOL più alti per GOLDEN_BOOT]
     *   2. N° preferenze ricevute         (escluso autovoto)
     *   3. Voto singolo max ricevuto      (escluso autovoto)
     *   4. N° partite giocate
     *   5. Ordine alfabetico nickname     (fallback estremo, locale italiano)
     *
     * Pattern: ogni criterio confronta; se differenza ≠ 0 si ritorna subito,
     * altrimenti si passa al successivo. Per i numeri (b - a) = ordine DESC.
     * Per le stringhe localeCompare('it') ordina correttamente le accentate.
     *
     * @param {Array<Object>} candidates
     * @param {'avg'|'goals'} primaryKey  criterio #1: 'avg' (default) o 'goals' per GOLDEN_BOOT
     * @returns {Array<Object>} nuovo array ordinato (non muta l'input)
     */
    _rankByTieBreaker(candidates, primaryKey = 'avg') {
        return [...candidates].sort((a, b) => {
            // Criterio #1 (variabile in base al tipo di award)
            if (b[primaryKey] !== a[primaryKey]) return b[primaryKey] - a[primaryKey];
            // Per GOLDEN_BOOT a parità di gol, la media voto è un buon "criterio 1.5" naturale
            if (primaryKey === 'goals' && b.avg !== a.avg) return b.avg - a.avg;
            // Criteri #2 → #5 (sempre uguali)
            if (b.votersExclSelf !== a.votersExclSelf) return b.votersExclSelf - a.votersExclSelf;
            if (b.maxVoteExclSelf !== a.maxVoteExclSelf) return b.maxVoteExclSelf - a.maxVoteExclSelf;
            if (b.matchesPlayed !== a.matchesPlayed) return b.matchesPlayed - a.matchesPlayed;
            // Criterio #6: nome alfabetico (italiano)
            const nameOrder = a.name.localeCompare(b.name, 'it');
            if (nameOrder !== 0) return nameOrder;
            // Criterio #7 (safety): playerId come stringa — deterministico al 100%
            // anche nel caso (rarissimo) di due giocatori con identico nome.
            // Garantisce che GoldenTotService.applyBonusesForSeason trovi sempre
            // un unico vincitore stabile via payload.hero.playerId.
            return a.playerId.toString().localeCompare(b.playerId.toString());
        });
    }

    /**
     * Formatta una data in italiano leggibile per la label del periodo.
     * Esempio: 2026-05-16 → "16 Maggio 2026"
     */
    _formatItalianDate(date) {
        const d = new Date(date);
        const mesi = [
            'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
            'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
        ];
        return `${d.getDate()} ${mesi[d.getMonth()]} ${d.getFullYear()}`;
    }

    /**
     * Formatta solo "Mese ANNO" (es. "Maggio 2026") per MONTHLY_MVP.
     */
    _formatItalianMonth(date) {
        return this._formatItalianDate(date).replace(/^\d+\s/, '');
    }

    /**
     * Etichetta stagione "Stagione 2025/26" calcolata dalla data di fine stagione.
     */
    _formatSeasonLabel(seasonEndDate) {
        const end = new Date(seasonEndDate);
        const endYear = end.getFullYear();
        const startYear = endYear - 1;
        return `Stagione ${startYear}/${String(endYear).slice(2)}`;
    }


    // ============================================================
    //  HELPER: STREAK MVP
    // ============================================================

    /**
     * Calcola da quante partite consecutive un giocatore è MVP (= podium[0] in MATCH_RECAP).
     *
     * Logica:
     *  - prende gli ultimi MATCH_RECAP del team in ordine cronologico DESC
     *  - scorre uno per uno, +1 se podium[0].playerId === playerId, BREAK al primo che no
     *  - ritorna count + 1 (perché si include la partita corrente che sta per essere salvata)
     *
     * Nota: la partita corrente NON è ancora salvata quando questo metodo viene chiamato,
     *       quindi l'iterazione parte dall'award precedente più recente.
     *
     * @param {string|ObjectId} teamId
     * @param {string|ObjectId} playerId
     * @returns {Promise<number>} streak inclusiva della partita corrente (≥ 1)
     */
    async _computeMvpStreak(teamId, playerId) {
        const recent = await this.AwardRepository.findByTeam(teamId, {
            type: 'MATCH_RECAP',
            limit: 50   // soglia di sicurezza: difficile avere streak > 50 partite
        });

        let streak = 0;
        for (const past of recent) {
            const topPlayerId = past.payload?.podium?.[0]?.playerId;
            if (topPlayerId && topPlayerId.equals(playerId)) {
                streak += 1;
            } else {
                break;   // la striscia si rompe alla prima partita in cui non era MVP
            }
        }
        return streak + 1;   // include la partita corrente
    }


    // ============================================================
    //  HELPER: HIGHLIGHTS NARRATIVI
    // ============================================================

    /**
     * Calcola gli highlights da mostrare sulla card MATCH_RECAP.
     *
     * REGOLE (ordine di priorità decrescente, max 2 highlight per card):
     *   1. STREAK_MVP      → mvpStreakOfFirst >= 2
     *   2. BEST_BY_MILES   → podium[0].avg - podium[1].avg >= 1.0
     *   3. UNANIMOUS_MVP   → tutti i voti ricevuti dal #1 (esclusi autovoto) sono >= 8.0
     *                        E ha almeno 2 votanti esterni (per evitare "unanime con 1 solo voto")
     *   4. GOAL_MACHINE    → qualcuno ha segnato >= 3 gol nella partita
     *
     * @param {Object} args
     * @param {Array}  args.podium             podium finale [{position, playerId, name, avg, ...}]
     * @param {Array}  args.candidates         array completo candidati ordinati (per accedere a minVoteExclSelf, ecc.)
     * @param {Map}    args.matchRatingResults Map playerId → { goals, ... }
     * @param {number} args.mvpStreakOfFirst   streak già calcolata per podium[0]
     * @returns {Array<Object>} highlight payload pronti per lo schema
     */
    _computeHighlights({ podium, candidates, matchRatingResults, mvpStreakOfFirst }) {
        const out = [];
        const MAX_HIGHLIGHTS = 2;

        const first = podium[0];
        const second = podium[1];
        // Trovo i candidati completi (servono minVoteExclSelf, votersExclSelf)
        const firstCandidate = candidates.find(c => c.playerId.equals(first.playerId));

        // 1. STREAK_MVP
        if (mvpStreakOfFirst >= 2) {
            out.push({
                code: 'STREAK_MVP',
                text: ['MVP', `Per la ${mvpStreakOfFirst}ª volta di fila`],
                colorAccent: '#FF6B35',
                playerId: first.playerId
            });
        }

        // 2. BEST_BY_MILES
        if (second && (first.avg - second.avg) >= 1.0) {
            const gap = (first.avg - second.avg).toFixed(1);
            out.push({
                code: 'BEST_BY_MILES',
                text: ['DOMINIO', `+${gap} sul 2°`],
                colorAccent: '#FFD700',
                playerId: first.playerId
            });
        }

        // 3. UNANIMOUS_MVP
        if (
            firstCandidate &&
            firstCandidate.votersExclSelf >= 2 &&
            firstCandidate.minVoteExclSelf !== null &&
            firstCandidate.minVoteExclSelf >= 8.0
        ) {
            out.push({
                code: 'UNANIMOUS_MVP',
                text: ['VOTO', 'UNANIME'],
                colorAccent: '#9B59B6',
                playerId: first.playerId
            });
        }

        // 4. GOAL_MACHINE: chi ha segnato di più nella partita, se >= 3
        let topScorer = null;
        for (const [, stat] of matchRatingResults.entries()) {
            const goals = stat.goals || 0;
            if (goals >= 3 && (!topScorer || goals > topScorer.goals)) {
                topScorer = { playerId: stat.playerId, goals };
            }
        }
        if (topScorer) {
            out.push({
                code: 'GOAL_MACHINE',
                text: ['BOMBER', `${topScorer.goals} gol`],
                colorAccent: '#27AE60',
                playerId: topScorer.playerId
            });
        }

        // Cap a MAX_HIGHLIGHTS rispettando la priorità
        return out.slice(0, MAX_HIGHLIGHTS);
    }


    // ============================================================
    //  METODI AGGREGATI (MONTHLY_MVP, BALLON_DOR, GOLDEN_BOOT)
    // ============================================================

    /**
     * Crea un Award di tipo MONTHLY_MVP
     *
     * Soglia: protagonista ≥ 3 partite nel mese AND team ≥ 2 partite chiuse nel mese
     *
     * @param {string|ObjectId} teamId
     * @param {string} month  formato "YYYY-MM" (es. "2026-05")
     * @returns {Object|null} Award MONTHLY_MVP o null se sotto soglia
     */
    async createMonthlyMVPAward(teamId, month) {
        // 1. Calcolo finestra temporale [dateFrom, dateTo)
        const [year, mm] = month.split('-').map(Number);
        const dateFrom = new Date(year, mm - 1, 1, 0, 0, 0, 0);
        const dateTo = new Date(year, mm, 1, 0, 0, 0, 0); // 1° giorno mese successivo (esclusivo)

        // 2. Anti-duplicato
        const existing = await this.AwardRepository.findByTeamAndRef(teamId, month, 'MONTHLY_MVP');
        if (existing) return existing;

        // 3. Aggrega statistiche player nel periodo (helper unico riusato per tutti gli aggregati)
        const { candidates, totalTeamMatches } = await this._aggregatePlayerStatsForPeriod(
            teamId, dateFrom, dateTo
        );

        // 4. Quorum team: minimo 2 partite chiuse nel mese
        if (totalTeamMatches < 2) {
            console.info(`[Award] MONTHLY_MVP skip: team con ${totalTeamMatches} partite (min 2) ${month}`);
            return null;
        }

        // 5. Filtro candidati per soglia individuale: ≥ 3 partite nel mese
        const eligible = candidates.filter(c => c.matchesPlayed >= 3);
        if (eligible.length === 0) {
            console.info(`[Award] MONTHLY_MVP skip: nessun protagonista con ≥3 partite ${month}`);
            return null;
        }

        // 6. Ranking + scelta del protagonista (Hero, non podio)
        const winner = this._rankByTieBreaker(eligible, 'avg')[0];
        const monthLabel = this._formatItalianMonth(dateFrom);                  // "Maggio 2026"
        const monthLabelUpper = monthLabel.toUpperCase();
        const participationPct = winner._totalTeamMatches > 0
            ? Math.round((winner.matchesPlayed / winner._totalTeamMatches) * 100)
            : 0;

        // 7. Costruisci payload Hero
        const payload = {
            seasonId: this.seasonService.resolveSeasonId(dateFrom),
            period: {
                label: monthLabel,                                              // "Maggio 2026"
                dateFrom,
                dateTo
            },
            hero: {
                playerId: winner.playerId,
                name: winner.name,
                avatar: winner.avatar,
                mainValue: winner.avg.toFixed(1),                               // "8.4"
                mainLabel: `MEDIA VOTO · ${monthLabelUpper.split(' ')[0]}`,      // "MEDIA VOTO · MAGGIO"
                stats: [
                    { value: String(winner.matchesPlayed), label: 'PARTITE GIOCATE' },
                    { value: String(winner.mvpCount), label: 'VOLTE MVP' },
                    { value: winner.maxAvgInPeriod.toFixed(1), label: 'VOTO PIÙ ALTO' },
                    { value: `${participationPct}%`, label: 'PARTECIPAZIONE' }
                ]
            },
            highlights: [],
            totalVoters: winner.votersCount,
            eligibleVoters: null,           // non significativo per aggregati periodo
            autoVoteExcluded: true
        };

        // 8. Crea Award PENDING
        const award = await this.AwardRepository.create({
            teamId,
            type: 'MONTHLY_MVP',
            refId: month,
            seasonId: this.seasonService.resolveSeasonId(dateFrom),
            status: 'PENDING',
            generatedAt: new Date(),
            payload
        });

        console.info(`[Award] MONTHLY_MVP creato id=${award._id} team=${teamId} mese=${month} hero=${winner.name}`);

        // Fire-and-forget: renderizza e carica immagine (PENDING → READY)
        getRenderAndUpload()(award).catch(err =>
            console.error(`[Award] Render MONTHLY_MVP fallito id=${award._id}: ${err.message}`)
        );

        return award;
    }


    /**
     * Crea un Award di tipo BALLON_DOR (miglior media stagione)
     *
     * Soglia: protagonista ≥ 50% partite stagione AND stagione ≥ 10 partite
     *
     * @param {string|ObjectId} teamId
     * @param {Object} season  { seasonId, seasonStart: Date, seasonEnd: Date }
     */
    async createBallonDorAward(teamId, season) {
        return this._createSeasonAward(teamId, season, {
            type: 'BALLON_DOR',
            primaryKey: 'avg',
            // Condizione di eleggibilità individuale (chiamata con info team già aggregate)
            eligibilityFn: (c, totalTeamMatches) => c.matchesPlayed >= totalTeamMatches * 0.5,
            eligibilityWhyNot: (c, totalTeamMatches) =>
                `partite=${c.matchesPlayed} < ${Math.ceil(totalTeamMatches * 0.5)} (50% di ${totalTeamMatches})`,
            buildHero: (winner, seasonLabel) => {
                const participationPct = winner._totalTeamMatches > 0
                    ? Math.round((winner.matchesPlayed / winner._totalTeamMatches) * 100)
                    : 0;
                return {
                    playerId: winner.playerId,
                    name: winner.name,
                    avatar: winner.avatar,
                    mainValue: winner.avg.toFixed(1),                       // "8.1"
                    mainLabel: 'MEDIA STAGIONALE',
                    stats: [
                        { value: String(winner.matchesPlayed), label: 'PARTITE GIOCATE' },
                        { value: String(winner.mvpCount), label: 'VOLTE MVP' },
                        { value: winner.maxAvgInPeriod.toFixed(1), label: 'VOTO PIÙ ALTO' },
                        { value: `${participationPct}%`, label: 'PARTECIPAZIONE' }
                    ]
                };
            }
        });
    }


    /**
     * Crea un Award di tipo GOLDEN_BOOT (capocannoniere stagione)
     *
     * Soglia: protagonista ≥ 5 gol stagione AND stagione ≥ 10 partite
     */
    async createGoldenBootAward(teamId, season) {
        return this._createSeasonAward(teamId, season, {
            type: 'GOLDEN_BOOT',
            primaryKey: 'goals',
            eligibilityFn: (c) => c.goals >= 5,
            eligibilityWhyNot: (c) => `gol=${c.goals} < 5`,
            buildHero: (winner, seasonLabel) => {
                const goalsPerMatch = winner.matchesPlayed > 0
                    ? (winner.goals / winner.matchesPlayed).toFixed(2)
                    : '0.00';
                return {
                    playerId: winner.playerId,
                    name: winner.name,
                    avatar: winner.avatar,
                    mainValue: String(winner.goals),                        // "24"
                    mainLabel: 'GOL IN STAGIONE',
                    stats: [
                        { value: String(winner.matchesPlayed), label: 'PARTITE GIOCATE' },
                        { value: goalsPerMatch, label: 'GOL A PARTITA' },
                        { value: String(winner.triplets), label: 'TRIPLETTE' },
                        { value: String(winner.assists), label: 'ASSIST' }
                    ]
                };
            }
        });
    }


    /**
     * Generatore comune per Award STAGIONALI (BALLON_DOR + GOLDEN_BOOT).
     * Stessa pipeline: differiscono solo per criterio di ranking, soglia individuale, e payload hero.
     *
     * @param {Object} season  { seasonId, seasonStart, seasonEnd }
     * @param {Object} opts    { type, primaryKey, eligibilityFn, eligibilityWhyNot, buildHero }
     */
    async _createSeasonAward(teamId, season, opts) {
        const refId = `season-${season.seasonId}`;
        const seasonLabel = this._formatSeasonLabel(season.seasonEnd);

        // 1. Anti-duplicato
        const existing = await this.AwardRepository.findByTeamAndRef(teamId, refId, opts.type);
        if (existing) return existing;

        // 2. Aggrega stagione
        const { candidates, totalTeamMatches } = await this._aggregatePlayerStatsForPeriod(
            teamId, season.seasonStart, season.seasonEnd
        );

        // 3. Quorum team: minimo 10 partite nella stagione
        if (totalTeamMatches < 10) {
            console.info(`[Award] ${opts.type} skip: team con ${totalTeamMatches} partite stagione (min 10)`);
            return null;
        }

        // 4. Filtro eleggibilità individuale (varia per tipo)
        const eligible = candidates.filter(c => opts.eligibilityFn(c, totalTeamMatches));
        if (eligible.length === 0) {
            console.info(`[Award] ${opts.type} skip: nessun candidato eleggibile (esempio: ${candidates[0] ? opts.eligibilityWhyNot(candidates[0], totalTeamMatches) : 'zero candidati'})`);
            return null;
        }

        // 5. Ranking
        const winner = this._rankByTieBreaker(eligible, opts.primaryKey)[0];

        // 6. Payload
        const payload = {
            seasonId: season.seasonId,
            period: {
                label: seasonLabel,
                dateFrom: season.seasonStart,
                dateTo: season.seasonEnd
            },
            hero: opts.buildHero(winner, seasonLabel),
            highlights: [],
            totalVoters: winner.votersCount,
            eligibleVoters: null,
            autoVoteExcluded: true
        };

        const award = await this.AwardRepository.create({
            teamId,
            type: opts.type,
            refId,
            seasonId: season.seasonId,
            status: 'PENDING',
            generatedAt: new Date(),
            payload
        });

        console.info(`[Award] ${opts.type} creato id=${award._id} team=${teamId} stagione=${seasonLabel} hero=${winner.name}`);

        // Fire-and-forget: renderizza e carica immagine (PENDING → READY)
        getRenderAndUpload()(award).catch(err =>
            console.error(`[Award] Render ${opts.type} fallito id=${award._id}: ${err.message}`)
        );

        return award;
    }


    // ============================================================
    //  HELPER: aggregazione statistiche su PERIODO
    // ============================================================

    /**
     * Carica TUTTI i match completati di un team in un intervallo [dateFrom, dateTo)
     * e aggrega per player le statistiche necessarie agli Award aggregati:
     *   avg              → MEDIA delle medie partita, pesata per voteCount
     *   goals            → somma gol nel periodo
     *   assists          → somma assist nel periodo
     *   matchesPlayed    → conteggio partite in cui il giocatore ha ricevuto voti
     *   voteCount        → somma totale voti ricevuti (autovoto incluso)
     *   votersExclSelf   → somma voti ricevuti da altri (tutte le partite del periodo)
     *   maxVoteExclSelf  → voto massimo ricevuto da altri nel periodo
     *
     * NOTA: Match.date è una STRING (legacy frontend). Carichiamo tutti i match completed
     * del team e filtriamo in JS per ParseDate sicuro. Per team con < 200 match/anno è ok.
     *
     * @returns {Promise<{ candidates: Array, totalTeamMatches: number }>}
     */
    async _aggregatePlayerStatsForPeriod(teamId, dateFrom, dateTo) {
        // 1. Carica match completed del team
        const allMatches = await this.MatchRepository.findAll({
            teamId: String(teamId),
            status: 'completed'
        });

        // 2. Filtra per periodo (Match.date è stringa, parse sicuro)
        const matchesInPeriod = allMatches.filter(m => {
            const d = new Date(m.date);
            if (isNaN(d.getTime())) return false;
            return d >= dateFrom && d < dateTo;
        });
        const totalTeamMatches = matchesInPeriod.length;
        if (totalTeamMatches === 0) {
            return { candidates: [], totalTeamMatches: 0 };
        }

        // 3. Carica in BATCH tutte le VotingSession completed di questi match
        const matchIds = matchesInPeriod.map(m => m._id);
        const sessions = await this.VotingSessionRepository.findAll({
            type: 'match_rating',
            targetId: { $in: matchIds },
            status: 'completed'
        });
        if (sessions.length === 0) return { candidates: [], totalTeamMatches };

        const sessionIds = sessions.map(s => s._id);

        // 4. Carica in BATCH tutti i VoteResult e tutte le VoteSubmission
        const [results, submissions] = await Promise.all([
            this.VoteResultRepository.findAll({ votingSessionId: { $in: sessionIds } }),
            this.VoteSubmissionRepository.findAll({ votingSessionId: { $in: sessionIds }, isActive: true })
        ]);

        // Indicizza submissions per sessionId (per non scorrerle tutte ogni volta)
        const submissionsBySession = new Map();
        for (const sub of submissions) {
            const k = sub.votingSessionId.toString();
            if (!submissionsBySession.has(k)) submissionsBySession.set(k, []);
            submissionsBySession.get(k).push(sub);
        }

        // 5. Accumula statistiche per player attraversando tutti i risultati
        //    Struttura accumulator: Map<playerIdStr, { ratingWeightedSum, voteCountSum, goals, ... }>
        const acc = new Map();

        const ensureBucket = (idStr, objectId) => {
            if (!acc.has(idStr)) {
                acc.set(idStr, {
                    playerId: objectId,
                    ratingWeightedSum: 0,
                    voteCountSum: 0,
                    goals: 0,
                    assists: 0,
                    matchesPlayed: 0,
                    votersExclSelf: 0,
                    maxVoteExclSelf: 0,
                    maxAvgInPeriod: 0,    // miglior media voto in una singola partita del periodo
                    triplets: 0,          // n. partite con goals >= 3
                    mvpCount: 0           // n. volte MVP (cioè podium[0] di un MATCH_RECAP del periodo)
                });
            }
            return acc.get(idStr);
        };

        // 5.bis. Pre-carica gli Award MATCH_RECAP del team nel periodo per calcolare "volte MVP".
        //        Questo allinea il conteggio agli MVP "ufficiali" (sopra soglia turnout),
        //        evitando di dover ri-implementare i tie-breaker partita per partita.
        const recapAwards = await this.AwardRepository.findAll({
            teamId: String(teamId),
            type: 'MATCH_RECAP',
            generatedAt: { $gte: dateFrom, $lt: dateTo }
        });
        const mvpCountMap = new Map();   // playerIdStr → count
        for (const aw of recapAwards) {
            const mvpId = aw.payload?.podium?.[0]?.playerId;
            if (!mvpId) continue;
            const k = mvpId.toString();
            mvpCountMap.set(k, (mvpCountMap.get(k) || 0) + 1);
        }

        for (const result of results) {
            const subs = submissionsBySession.get(result.votingSessionId.toString()) || [];

            for (const [playerIdStr, stat] of result.matchRatingResults.entries()) {
                const b = ensureBucket(playerIdStr, stat.playerId);

                // Media pesata per voti (player con più voti pesa di più sulla media periodo)
                b.ratingWeightedSum += stat.averageRating * stat.voteCount;
                b.voteCountSum += stat.voteCount;
                b.goals += stat.goals || 0;
                b.assists += stat.assists || 0;
                b.matchesPlayed += 1;

                // Tracker per stat aggiuntive delle card hero
                if (stat.averageRating > b.maxAvgInPeriod) b.maxAvgInPeriod = stat.averageRating;
                if ((stat.goals || 0) >= 3) b.triplets += 1;

                // Metriche tie-breaker da submissions grezze
                for (const sub of subs) {
                    const rating = sub.voteData?.playerRatings?.find(r =>
                        r.playerId && r.playerId.equals(stat.playerId)
                    );
                    if (!rating) continue;
                    if (sub.voterId && sub.voterId.equals(stat.playerId)) continue; // skip autovoto

                    b.votersExclSelf += 1;
                    if (rating.rating > b.maxVoteExclSelf) b.maxVoteExclSelf = rating.rating;
                }
            }
        }

        // Iniezione mvpCount dai recapAwards pre-caricati
        for (const [idStr, b] of acc.entries()) {
            b.mvpCount = mvpCountMap.get(idStr) || 0;
        }

        // 6. Carica gli User in batch per nickname/avatar
        const playerIds = Array.from(acc.keys());
        const users = await this.UserRepository.findAll({ _id: { $in: playerIds } });
        const userMap = new Map(users.map(u => [u._id.toString(), u]));

        // 7. Materializza l'array candidates con campi finali
        const candidates = [];
        for (const [idStr, b] of acc.entries()) {
            const user = userMap.get(idStr);
            candidates.push({
                playerId: b.playerId,
                name: user?.name || 'Sconosciuto',
                avatar: user?.profile?.avatar || null,
                avg: b.voteCountSum > 0 ? b.ratingWeightedSum / b.voteCountSum : 0,
                votersCount: b.voteCountSum,
                votersExclSelf: b.votersExclSelf,
                maxVoteExclSelf: b.maxVoteExclSelf,
                matchesPlayed: b.matchesPlayed,
                goals: b.goals,
                assists: b.assists,
                maxAvgInPeriod: b.maxAvgInPeriod,
                triplets: b.triplets,
                mvpCount: b.mvpCount
            });
        }

        // Attach totalTeamMatches ai candidates per facilitare il calcolo "partecipazione %"
        // dentro i builder hero senza dover passare un secondo argomento.
        for (const c of candidates) c._totalTeamMatches = totalTeamMatches;

        return { candidates, totalTeamMatches };
    }
}

module.exports = AwardService;