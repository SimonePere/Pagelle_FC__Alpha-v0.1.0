// services/MatchService.js

// 🎯 REPOSITORY PATTERN - Accesso dati tramite Repository
const {
    MatchRepository,
    TeamRepository,
    VotingSessionRepository,
    UserRepository
} = require('../repositories');

const NewsService = require('./NewsService');

const AppError = require('../utils/AppError');
const CacheService = require('./CacheService'); // Cache invalidation per match updates
const { generateInviteToken } = require('../utils/tokenGenerator');

// 🕛 Helper: dato un valore data del match (Date | ISO string), restituisce
//    un Date che rappresenta le 23:59:59.999 della stessa giornata in fuso
//    Europe/Rome. Funziona indipendentemente dal fuso del server (UTC su Render).
//
// Esempio: match.date = '2026-05-15T15:00:00.000Z' → deadline = 2026-05-15T21:59:59.999Z
//          (che corrisponde alle 23:59:59 italiane in ora legale, +02:00).
//
// Implementazione: estraiamo year/month/day usando Intl con timezone Europe/Rome,
//    poi costruiamo la stringa "YYYY-MM-DDT23:59:59" e la convertiamo a UTC
//    sottraendo l'offset corretto del fuso italiano per quella data (gestisce CET/CEST).
function computeMatchDayDeadline(rawDate) {
    if (!rawDate) return null;
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return null;

    // 1) Estrai Y/M/D nel fuso Europe/Rome
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Rome',
        year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(d);
    const get = (type) => parts.find(p => p.type === type)?.value;
    const dateStr = `${get('year')}-${get('month')}-${get('day')}`; // YYYY-MM-DD

    // 2) Calcola l'offset del fuso Europe/Rome per QUELLA giornata (gestisce CET/CEST)
    //    Trick: prendi la mezzanotte UTC di quel giorno e chiedi che ora sarebbe a Roma.
    const utcMidnight = new Date(`${dateStr}T00:00:00Z`);
    const romeOffsetMinutes = getTimezoneOffsetMinutes('Europe/Rome', utcMidnight); // es. 60 (CET) o 120 (CEST)

    // 3) Costruisci la deadline 23:59:59.999 ora italiana → converti a UTC
    //    "23:59:59 a Roma" = (23:59:59 - offsetRoma) UTC
    const deadlineUtcMs = Date.UTC(
        Number(get('year')), Number(get('month')) - 1, Number(get('day')),
        23, 59, 59, 999
    ) - (romeOffsetMinutes * 60_000);

    return new Date(deadlineUtcMs);
}

// Helper interno: minuti di offset di un timezone rispetto a UTC, per una data data.
//    Ritorna ad es. 60 per CET, 120 per CEST.
function getTimezoneOffsetMinutes(timeZone, date) {
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone }));
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    return Math.round((tzDate.getTime() - utcDate.getTime()) / 60_000);
}

/**
 * MATCH SERVICE
 * 
 * 🔄 AGGIORNATO CON REPOSITORY PATTERN:
 * - Non accede più direttamente ai Model Mongoose
 * - Usa Repository per separare data access da business logic
 * 
 * Gestisce tutta la business logic per le partite:
 * - Creazione match con auto-generazione voting session
 * - Gestione team access e permessi
 * - Paginazione e filtering matches
 * - Activation e completion match workflow
 */
class MatchService {

    /**
     * 🏗️ Costruttore - Inizializza i repository
     */
    constructor() {
        // Inizializza i repository per accesso dati
        this.matchRepository = new MatchRepository();
        this.teamRepository = new TeamRepository();
        this.votingSessionRepository = new VotingSessionRepository();
        this.userRepository = new UserRepository();
        this.newsService = new NewsService();
    }

    /**
     * Crea un nuovo match con auto-generazione della voting session
     * @param {string} userId - ID dell'utente che crea il match
     * @param {Object} matchData - Dati del match
     * @returns {Promise<Object>} Match e voting session creati
     */
    async createMatch(userId, matchData,) {

        // Input validation
        this.validateMatchCreationInput(matchData);

        const { field, date, playersCount, notes, teamMemberIds, teamId, guestPlayers = [] } = matchData;

        try {
            // 1. Create the match
            const match = await this.matchRepository.create({
                createdBy: userId,
                teamId: teamId,
                field: field,
                playersCount: playersCount,
                date: new Date(date),
                notes: notes || '',
                teamMemberIds: teamMemberIds || [userId],
                status: 'active',
                finalResults: { teamGoals: 0, opponentGoals: 0 }
            });

            // 2. Crea guest e aggiorna match (se ci sono)
            let guestResults = [];
            if (guestPlayers.length > 0) {
                guestResults = await this._createGuestPlayersForMatch(
                    match._id, teamId, guestPlayers, userId
                );
                // Aggiorna match.teamMemberIds con i guest IDs
                const guestIds = guestResults.map(g => g.userId);
                await this.matchRepository.updateById(match._id, {
                    $push: { teamMemberIds: { $each: guestIds } }
                });
                match.teamMemberIds = [...match.teamMemberIds, ...guestIds]; // aggiorna locale
            }



            // 3. Auto-create voting session
            const votingSession = await this.createAutoVotingSession(match, userId, matchData.abstainedMembers || []);

            // Recupera i nomi dalla voting session appena creata
            const sessionWithNames = await this.votingSessionRepository.findByIdWithUsernames(votingSession._id);

            // 4. 🗞️ Genera news per creazione match
            // console.log(`✅ Match creato con ID ${match._id} e VotingSession ${votingSession._id} da user ${userId}`);
            try {
                const newsData = {
                    teamId: match.teamId,
                    matchId: match._id,
                    field: match.field,
                    playersCount: match.playersCount,
                    date: match.date,
                    createdBy: userId,
                    teamMemberIds: match.teamMemberIds,
                    type: 'general', // Default type, può essere parametrizzato
                    eligibleVotersNames: sessionWithNames.eligibleVoters,
                    abstainedUsersNames: sessionWithNames.abstainedUsers
                };

                const creationNews = await this.newsService.createNewsOnCreateMatch(newsData);
                // console.log('🎉 News creazione match generata:', creationNews?._id || 'News created');
            } catch (newsError) {
                console.error('⚠️ Errore generazione news creazione match:', newsError.message);
                // Non bloccare la creazione match per errori news
            }

            return {
                success: true,
                message: 'Match e sessione di votazione creati con successo!',
                match: {
                    id: match._id,
                    field: match.field,
                    playersCount: match.playersCount,
                    date: match.date,
                    status: match.status,
                    createdAt: match.createdAt
                },
                votingSession: {
                    id: votingSession._id,
                    title: votingSession.title,
                    status: votingSession.status,
                    type: votingSession.type
                },
                guestPlayers: guestResults // Ritorna i guest player creati con invite token
            };

        } catch (error) {
            throw new AppError(`Failed to create match: ${error.message}`, 500);
        }
    }

    /**
     * Valida i dati per l'update di un match
     * @param {Object} updateData - Dati da validare
     */
    validateMatchUpdateData(updateData) {
        const { date, field, playersCount, notes, teamMemberIds } = updateData;

        if (date && (!date.trim() || date.length < 8)) {
            throw new AppError('Data match non valida', 400);
        }

        if (field && (!field.trim() || field.length < 2 || field.length > 100)) {
            throw new AppError('Nome campo deve essere tra 2 e 100 caratteri', 400);
        }

        if (playersCount && ![5, 8, 11].includes(playersCount)) {
            throw new AppError('Numero giocatori deve essere 5, 8 o 11', 400);
        }

        if (notes && notes.length > 500) {
            throw new AppError('Le note non possono superare i 500 caratteri', 400);
        }

        if (teamMemberIds && !Array.isArray(teamMemberIds)) {
            throw new AppError('teamMemberIds deve essere un array', 400);
        }
    }

    /**
     * Ottiene i match di un team con paginazione
     * @param {string} teamId - ID del team
     * @param {string} userId - ID dell'utente richiedente
     * @param {Object} options - Opzioni paginazione {page, limit}
     * @returns {Promise<Object>} Lista match paginata
     */
    async getTeamMatches(teamId, userId, options = {}) {
        // Input validation
        this.validateTeamId(teamId);
        this.validateUserId(userId);

        const { page = 1, limit = 10 } = options;
        const skip = (page - 1) * limit;

        try {
            // Check team access
            await this.validateTeamAccess(teamId, userId);

            // 🎯 USA IL NUOVO METODO CON POPULATION AUTOMATICA
            const matches = await this.matchRepository.findWithUsers({ teamId }, {
                page,
                limit,
                sort: { date: -1 }
            });

            // Count total usando BaseRepository per consistency
            const totalMatches = await this.matchRepository.countDocuments({ teamId });

            // Format matches for response
            const formattedMatches = await Promise.all(
                matches.map(async (match) => {
                    // Check for active voting sessions
                    const activeVoting = await this.votingSessionRepository.findOne({
                        targetId: match._id,
                        type: 'match_rating',
                        status: 'active'
                    });

                    return {
                        id: match._id,
                        date: match.date,
                        field: match.field,
                        playersCount: match.playersCount,
                        weather: match.weather,
                        notes: match.notes,
                        status: match.status,
                        createdBy: match.createdBy,
                        teamMemberIds: match.teamMemberIds,
                        createdAt: match.createdAt,
                        updatedAt: match.updatedAt,
                        hasActiveVoting: !!activeVoting,
                        votingSessionsCount: activeVoting ? 1 : 0
                    };
                })
            );

            return {
                success: true,
                matches: formattedMatches,
                pagination: {
                    page,
                    limit,
                    total: totalMatches,
                    pages: Math.ceil(totalMatches / limit)
                }
            };

        } catch (error) {
            throw new AppError(`Failed to fetch team matches: ${error.message}`, 500);
        }
    }

    /**
     * Ottiene i dettagli di un singolo match
     * @param {string} matchId - ID del match
     * @param {string} userId - ID dell'utente richiedente
     * @returns {Promise<Object>} Dettagli completi del match
     */
    async getMatchDetails(matchId, userId) {
        // Input validation
        this.validateMatchId(matchId);
        this.validateUserId(userId);

        try {
            // 🎯 USA IL NUOVO METODO SPECIFICO PER SINGOLO MATCH
            const match = await this.matchRepository.findByIdWithUsers(matchId);

            if (!match) {
                throw new AppError('Match not found', 404);
            }

            // Check team access
            await this.validateTeamAccess(match.teamId, userId);

            // Get related voting session
            const votingSession = await this.votingSessionRepository.findOne({
                targetId: matchId,
                type: 'match_rating'
            });

            return {
                success: true,
                match: {
                    id: match._id,
                    teamId: match.teamId,
                    date: match.date,
                    field: match.field,
                    playersCount: match.playersCount,
                    weather: match.weather,
                    notes: match.notes,
                    status: match.status,
                    createdBy: match.createdBy,
                    teamMemberIds: match.teamMemberIds,
                    createdAt: match.createdAt,
                    updatedAt: match.updatedAt,
                    finalResults: match.finalResults || {},

                    // Voting session data
                    votingSession: votingSession ? {
                        id: votingSession._id,
                        status: votingSession.status,
                        totalSubmissions: votingSession.summary?.totalSubmissions || 0,
                        participationRate: votingSession.summary?.participationRate || 0,
                        requiredVotes: votingSession.requiredVotes || 0
                    } : null,

                    // Future enhancements
                    activeVotingSessions: [],
                    completedVotingSessions: [],
                    canStartVoting: match.status === 'active'
                }
            };

        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError(`Failed to fetch match details: ${error.message}`, 500);
        }
    }

    /**
     * Attiva un match per iniziare le votazioni
     * @param {string} matchId - ID del match
     * @param {string} userId - ID dell'utente richiedente (admin)
     * @returns {Promise<Object>} Match attivato
     */
    async activateMatch(matchId, userId) {
        // Input validation
        this.validateMatchId(matchId);
        this.validateUserId(userId);

        try {
            const match = await this.matchRepository.findById(matchId);
            if (!match) {
                throw new AppError('Match not found', 404);
            }

            // Check admin access
            await this.validateAdminAccess(match.teamId, userId);

            // Business rule validation
            if (match.status !== 'draft') {
                throw new AppError('Can only activate draft matches', 400);
            }

            // Activate match
            match.status = 'active';
            await this.matchRepository.save(match);

            return {
                success: true,
                message: 'Match activated for voting',
                match: {
                    id: match._id,
                    status: match.status,
                    updatedAt: match.updatedAt
                }
            };

        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError(`Failed to activate match: ${error.message}`, 500);
        }
    }

    /**
     * Completa un match e chiude le votazioni
     * @param {string} matchId - ID del match
     * @param {string} userId - ID dell'utente richiedente (admin)
     * @returns {Promise<Object>} Match completato
     */
    async completeMatch(matchId, userId) {
        // Input validation
        this.validateMatchId(matchId);
        this.validateUserId(userId);

        try {
            const match = await this.matchRepository.findById(matchId);
            if (!match) {
                throw new AppError('Match not found', 404);
            }

            // Check admin access
            await this.validateAdminAccess(match.teamId, userId);

            // Business rule validation
            if (match.status === 'completed') {
                throw new AppError('Match already completed', 400);
            }

            // Complete match
            match.status = 'completed';
            await this.matchRepository.save(match);

            // Future: Close all VotingSessions and calculate final results
            // await VotingSession.updateMany({targetId: matchId}, {status: 'completed'});

            return {
                success: true,
                message: 'Match completed',
                match: {
                    id: match._id,
                    status: match.status,
                    updatedAt: match.updatedAt
                }
            };

        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError(`Failed to complete match: ${error.message}`, 500);
        }
    }

    /**
     * HELPER METHODS
     */

    /**
     * Crea automaticamente una voting session per il match
     */
    async createAutoVotingSession(match, creatorId, abstainedMembers = []) {
        try {
            // TUTTI i membri del team sono eligible voters (anche chi si astiene)
            const allMembers = match.teamMemberIds || [];
            const eligibleVoters = allMembers; // ✅ Includi tutti, anche gli astenuti

            // Prepara gli abstained users con metadata
            const abstainedUsers = abstainedMembers.map(abs => ({
                userId: abs.userId,
                abstainedBy: abs.abstainedBy || creatorId,
                abstainedAt: new Date()
            }));

            // 🕛 DEADLINE DEFAULT: 23:59:59 (Europe/Rome) della SERA STESSA del match.
            //    Esempio: match il 15/05/2026 → deadline 15/05/2026 23:59:59 ora italiana.
            //    Calcolo robusto al fuso: prendo la data del match nel fuso italiano,
            //    poi imposto manualmente l'orario 23:59:59. Funziona anche su server UTC.
            const deadline = computeMatchDayDeadline(match.date);

            const votingSession = await this.votingSessionRepository.create({
                type: 'match_rating',
                targetId: match._id,
                teamId: match.teamId,
                title: `⚽ Vota la partita del ${new Date(match.date).toLocaleDateString('it-IT')}`,
                description: `Valuta le prestazioni dei tuoi compagni nella partita ${match.field ? `al ${match.field}` : ''}`,
                eligibleVoters: eligibleVoters,
                abstainedUsers: abstainedUsers,
                requiredVotes: allMembers.length - abstainedMembers.length, // ✅ Numero di votanti richiesti (attivi)
                createdBy: creatorId,
                status: 'active',
                deadline // 🕛 Default 23:59 sera match (vedi sopra)
            });

            return votingSession;
        } catch (error) {
            throw new AppError(`Failed to create voting session: ${error.message}`, 500);
        }
    }

    /**
     * Verifica che l'utente abbia accesso al team
     */
    async validateTeamAccess(teamId, userId) {
        const team = await this.teamRepository.findById(teamId);
        if (!team) {
            throw new AppError('Team not found', 404);
        }

        if (!team.isMember(userId)) {
            throw new AppError('Access denied', 403);
        }

        return team;
    }

    /**
     * - Crea Guest Player
     * - Lo aggiunge al Team
     * - Ritorna i dati del Guest Player creato
     * - Ritorna inviteToken e InviteUrl
     */

    async _createGuestPlayersForMatch(matchId, teamId, guestPlayers, creatorId) {
        const results = [];

        // Recupera il nome del team una sola volta per tutti i guest
        const team = await this.teamRepository.findById(teamId);
        const teamName = team ? team.name : '';

        for (const guestData of guestPlayers) {
            // Genera token unico
            const inviteToken = generateInviteToken();

            // Crea User guest nel DB (teamName incluso per coerenza con utenti normali)
            const guestUser = await this.userRepository.create({
                name: guestData.name.trim(),
                isGuest: true,
                teamIds: [teamId],
                teamName,
                inviteToken,
                inviteTokenMatchId: matchId,
                guestCreatedBy: creatorId,
                profile: { position: guestData.position || 'UTIL' }
            });

            // Aggiungi al Team
            await this.teamRepository.findOneAndUpdate(
                { _id: teamId },
                { $addToSet: { memberIds: guestUser._id } }
            );

            results.push({
                userId: guestUser._id,
                name: guestUser.name,
                inviteToken,
                inviteUrl: `/join?token=${inviteToken}`
            });
        }
        return results;
    }


    /**
     * INPUT VALIDATION METHODS
     */

    validateMatchCreationInput(matchData) {
        if (!matchData.field || !matchData.date) {
            throw new AppError('Field and date are required', 400);
        }

        if (!matchData.teamId) {
            throw new AppError('Team ID is required', 400);
        }

        // Validate date format
        const date = new Date(matchData.date);
        if (isNaN(date.getTime())) {
            throw new AppError('Invalid date format', 400);
        }

        //  === VALIDAZIONE ASTENSIONI // ===
        if (matchData.abstainedMembers && !Array.isArray(matchData.abstainedMembers)) {
            throw new AppError('abstainedMembers must be an array', 400);
        }

        // Validazione minimo 2 partecipanti (registrati + guest)
        const participatingCount = (matchData.teamMemberIds || []).length +
            (matchData.guestPlayers || []).length -
            (matchData.abstainedMembers || []).length;

        if (participatingCount < 2) {
            throw new AppError('Almeno 2 giocatori devono partecipare alla votazione', 400);
        }
    }

    validateTeamId(teamId) {
        if (!teamId || typeof teamId !== 'string') {
            throw new AppError('Team ID is required and must be a string', 400);
        }
    }

    validateUserId(userId) {
        if (!userId || typeof userId !== 'string') {
            throw new AppError('User ID is required and must be a string', 400);
        }
    }

    validateMatchId(matchId) {
        if (!matchId || typeof matchId !== 'string') {
            throw new AppError('Match ID is required and must be a string', 400);
        }
    }

    /**
     * Modifica un match esistente
     * @param {string} matchId - ID del match da aggiornare
     * @param {string} userId - ID dell'utente che richiede l'update
     * @param {Object} updateData - Dati da aggiornare
     * @returns {Promise<Object>} Match aggiornato
     */
    async updateMatch(matchId, userId, updateData) {
        try {
            // 1. Verifica che il match esista
            const existingMatch = await this.matchRepository.findById(matchId);
            if (!existingMatch) {
                throw new AppError('Match non trovato', 404);
            }

            // 2. Verifica permessi (solo membri del team)
            const isTeamMember = existingMatch.teamMemberIds.some(
                memberId => memberId.toString() === userId
            );
            if (!isTeamMember) {
                throw new AppError('Non hai i permessi: non sei membro di questo team', 403);
            }

            // 3. Valida dati input
            this.validateMatchUpdateData(updateData);

            // 4. Aggiorna il match usando BaseRepository
            const updatedMatch = await this.matchRepository.updateById(matchId, updateData);

            console.log(`✅ Match ${matchId} aggiornato con successo da user ${userId}`);

            // 🧹 CACHE INVALIDATION: Pulisce cache per team dopo update match
            try {
                await CacheService.invalidateMatchCacheAfterVote(updatedMatch.teamId);
                console.log(`🧹 Cache match team ${updatedMatch.teamId} invalidata dopo update`);
            } catch (cacheError) {
                console.warn(`⚠️ Cache invalidation fallita (non critico):`, cacheError.message);
            }

            return {
                success: true,
                message: 'Match aggiornato con successo',
                match: updatedMatch
            };

        } catch (error) {
            console.error('❌ Errore update match:', error.message);
            throw error;
        }
    }


    /**
 * Riattiva un utente astenuto in una sessione di voto
 * @param {string} matchId - ID del match  
 * @param {string} userIdToReactivate - ID utente da riattivare
 * @param {string} reactivatingUserId - ID utente che riattiva
 * @returns {Promise<Object>} Risultato operazione
 */
    async reactivateVoter(matchId, userIdToReactivate, reactivatingUserId) {
        try {
            // 1. Trova il match
            const match = await this.matchRepository.findById(matchId);
            if (!match) {
                throw new AppError('Match not found', 404);
            }

            // 2. Verifica che il riattivatore sia membro del team
            if (!match.teamMemberIds.includes(reactivatingUserId)) {
                throw new AppError('Access denied', 403);
            }

            // 3. Trova la sessione di votazione
            const votingSession = await this.votingSessionRepository.findOne({
                type: 'match_rating',
                targetId: matchId,
                status: 'active'
            });

            if (!votingSession) {
                throw new AppError('Nessuna sessione di votazione attiva trovata', 404);
            }

            // 4. Verifica che l'utente sia effettivamente astenuto
            if (!votingSession.isUserAbstained(userIdToReactivate)) {
                throw new AppError('L\'utente non è astenuto', 400);
            }

            // 5. Riattiva l'utente
            votingSession.reactivateUser(userIdToReactivate, reactivatingUserId);
            await this.votingSessionRepository.save(votingSession);

            return {
                success: true,
                message: 'Utente riattivato con successo',
                sessionId: votingSession._id,
                reactivatedUserId: userIdToReactivate
            };

        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError(`Failed to reactivate voter: ${error.message}`, 500);
        }
    }

    /**
     * Elimina un match esistente
     * @param {string} matchId - ID del match da eliminare
     * @param {string} userId - ID dell'utente che richiede l'eliminazione
     * @returns {Promise<Object>} Conferma eliminazione
     */
    async deleteMatch(matchId, userId) {
        try {
            // 1. Verifica che il match esista
            const existingMatch = await this.matchRepository.findById(matchId);
            if (!existingMatch) {
                throw new AppError('Match non trovato', 404);
            }

            // 2. Verifica permessi (solo membri del team)
            const isTeamMember = existingMatch.teamMemberIds.some(
                memberId => memberId.toString() === userId
            );
            if (!isTeamMember) {
                throw new AppError('Non hai i permessi: non sei membro di questo team', 403);
            }

            // 3. Valida dati input (se necessario)
            this.validateMatchId(matchId);

            // 🗑️ ELIMINAZIONE CASCATA: Prima elimina i dati collegati per aggiornare automaticamente le statistiche
            console.log(`📄 Eliminando dati collegati al match ${matchId}...`);

            // Importa i modelli necessari
            const VotingSession = require('../models/VotingSession');
            const VoteResult = require('../models/VoteResult');
            const VoteSubmission = require('../models/VoteSubmission');

            // Trova tutte le sessioni di voto collegate al match
            const votingSessions = await VotingSession.find({ targetId: matchId });
            console.log(`📄 Trovate ${votingSessions.length} sessioni di voto da eliminare`);

            let eliminatedVoteResults = 0;
            let eliminatedVoteSubmissions = 0;

            for (const session of votingSessions) {
                // Elimina VoteResult (questo triggerà il pre-remove hook che aggiorna le leaderboard)
                const voteResultDeleted = await VoteResult.deleteMany({ votingSessionId: session._id });
                eliminatedVoteResults += voteResultDeleted.deletedCount;

                // Elimina VoteSubmission
                const voteSubmissionsDeleted = await VoteSubmission.deleteMany({ votingSessionId: session._id });
                eliminatedVoteSubmissions += voteSubmissionsDeleted.deletedCount;

                console.log(`📄 Eliminati ${voteResultDeleted.deletedCount} VoteResult e ${voteSubmissionsDeleted.deletedCount} VoteSubmission per sessione ${session._id}`);
            }

            // Elimina VotingSession
            const votingSessionsDeleted = await VotingSession.deleteMany({ targetId: matchId });
            console.log(`📄 Eliminate ${votingSessionsDeleted.deletedCount} VotingSession`);

            console.log(`✅ PULIZIA CASCATA COMPLETATA:`)
            console.log(`   📄 VoteResult: ${eliminatedVoteResults}`)
            console.log(`   📄 VoteSubmission: ${eliminatedVoteSubmissions}`)
            console.log(`   📄 VotingSession: ${votingSessionsDeleted.deletedCount}`)

            // 4. Elimina il match usando BaseRepository
            await this.matchRepository.deleteById(matchId);

            console.log(`🗑️ Match ${matchId} eliminato con successo da user ${userId}`);

            // 🧹 CACHE INVALIDATION: Invalida TUTTO dopo delete match (come nel VotingService)
            try {
                // Converte i teamMemberIds in stringhe per sicurezza
                const playerIds = existingMatch.teamMemberIds.map(id => id.toString());
                console.log(`🔍 DEBUG CACHE: Invalidando cache per team ${existingMatch.teamId} e ${playerIds.length} giocatori:`, playerIds);

                // Invalida leaderboard, match cache E playercard per tutti i giocatori coinvolti
                await CacheService.invalidateAllAfterVote(existingMatch.teamId, playerIds);
                console.log(`🧹 Cache completa invalidata per team ${existingMatch.teamId} dopo delete match`);
            } catch (cacheError) {
                console.error(`❌ Cache invalidation fallita:`, cacheError.message);
                console.warn(`⚠️ Cache invalidation fallita (non critico):`, cacheError.message);
            }

            return {
                success: true,
                message: 'Match e dati collegati eliminati con successo',
                deletedMatch: {
                    id: existingMatch._id,
                    field: existingMatch.field,
                    date: existingMatch.date,
                    playersCount: existingMatch.playersCount,
                    status: existingMatch.status,
                    notes: existingMatch.notes,
                    teamId: existingMatch.teamId,
                    createdAt: existingMatch.createdAt,
                    deletedAt: new Date()
                },
                cascadeDeleted: {
                    voteResults: eliminatedVoteResults,
                    voteSubmissions: eliminatedVoteSubmissions,
                    votingSessions: votingSessionsDeleted.deletedCount
                }
            };

        } catch (error) {
            console.error('❌ Errore delete match:', error.message);
            throw error;
        }
    }

    // ============================================================
    // 👥 GESTIONE ROSTER POST-CREAZIONE (add/remove player + guest)
    // ============================================================

    /**
     * 🔒 Guard: verifica che il roster del match sia ancora modificabile.
     *    Modificabile se: status == 'draft' || 'active' AND nessuna VoteSubmission attiva (nessuno ha gia fatto un voto).
     * @param {string} matchId
     * @returns {Promise<{ match: Object, votingSessionId: string|null }>}
     */
    async assertMatchEditableRoster(matchId) {
        const match = await this.matchRepository.findById(matchId);
        if (!match) throw new AppError('Match non trovato', 404);

        if (match.status === 'completed' || match.status === 'cancelled') {
            throw new AppError(
                `Roster non modificabile: il match è ${match.status}`,
                403
            );
        }

        // Trova la voting session collegata (se esiste)
        const votingSession = await this.votingSessionRepository.findOne({
            type: 'match_rating',
            targetId: matchId
        });

        if (votingSession) {
            const VoteSubmission = require('../models/VoteSubmission');
            const submittedCount = await VoteSubmission.countDocuments({
                votingSessionId: votingSession._id,
                isActive: true
            });
            if (submittedCount > 0) {
                throw new AppError(
                    'Roster non modificabile: sono già stati inviati voti per questa partita',
                    403
                );
            }
        }

        return { match, votingSessionId: votingSession?._id || null };
    }

    /**
     * 🔄 Sincronizza la VotingSession del match dopo una mutazione del roster.
     *    Garante invariante: eligibleVoters della session = teamMemberIds del match
     *    MENO gli utenti astenuti (che restano in abstainedUsers).
     *
     *    Chiamato dopo add/remove player. Sicuro perché il guard
     *    assertMatchEditableRoster ha già verificato che NESSUN voto è stato inviato:
     *    quindi non esistono VoteSubmission orfane da gestire.
     *
     * @param {string} matchId
     */
    async _syncVotingSessionWithRoster(matchId) {
        const match = await this.matchRepository.findById(matchId);
        if (!match) return;

        const session = await this.votingSessionRepository.findOne({
            type: 'match_rating',
            targetId: matchId
        });
        if (!session) return;

        const teamMemberIds = (match.teamMemberIds || []).map((id) => String(id));
        const teamMembersSet = new Set(teamMemberIds);

        // Astenuti: tieni solo quelli ancora nel roster
        session.abstainedUsers = (session.abstainedUsers || []).filter((abs) =>
            teamMembersSet.has(String(abs.userId))
        );
        const abstainedSet = new Set(
            session.abstainedUsers.map((abs) => String(abs.userId))
        );

        // Eligible voters = roster - astenuti
        session.eligibleVoters = teamMemberIds.filter((id) => !abstainedSet.has(id));

        // requiredVotes = numero di votanti attivi (almeno 1, schema impone min:1)
        session.requiredVotes = Math.max(1, session.eligibleVoters.length);

        await this.votingSessionRepository.save(session);
    }

    /**
     * 📊 Stato di editabilità del roster (per la UI: bottoni abilitati/disabilitati).
     * @param {string} matchId
     * @returns {Promise<{ editable: boolean, reason: string|null }>}
     */
    async getRosterEditableStatus(matchId) {
        try {
            await this.assertMatchEditableRoster(matchId);
            return { editable: true, reason: null };
        } catch (err) {
            if (err instanceof AppError) {
                return { editable: false, reason: err.message };
            }
            throw err;
        }
    }

    /**
     * ➕ Aggiunge un utente registrato (o guest già esistente) al roster del match.
     *    Non crea nessun nuovo User: si limita a $addToSet su teamMemberIds.
     * @param {string} matchId
     * @param {string} userIdToAdd
     * @returns {Promise<Object>} match aggiornato
     */
    async addRegisteredPlayerToMatch(matchId, userIdToAdd) {
        const { match } = await this.assertMatchEditableRoster(matchId);

        // Verifica che l'utente esista
        const user = await this.userRepository.findById(userIdToAdd);
        if (!user) throw new AppError('Utente da aggiungere non trovato', 404);

        // L'utente deve appartenere al team della partita
        const belongsToTeam = (user.teamIds || []).some(
            (tid) => String(tid) === String(match.teamId)
        );
        if (!belongsToTeam) {
            throw new AppError(
                'L\'utente non appartiene al team di questa partita',
                400
            );
        }

        // Già nel roster?
        const alreadyIn = (match.teamMemberIds || []).some(
            (id) => String(id) === String(userIdToAdd)
        );
        if (alreadyIn) {
            throw new AppError('Il giocatore è già nel roster della partita', 409);
        }

        const updatedMatch = await this.matchRepository.findOneAndUpdate(
            { _id: matchId },
            { $addToSet: { teamMemberIds: userIdToAdd } },
            { new: true }
        );

        // 🔄 Allinea la VotingSession (eligibleVoters / requiredVotes)
        await this._syncVotingSessionWithRoster(matchId);

        // Cache invalidation coerente con updateMatch
        try {
            await CacheService.invalidateMatchCacheAfterVote(updatedMatch.teamId);
        } catch (cacheError) {
            console.warn('⚠️ Cache invalidation roster add (non critico):', cacheError.message);
        }

        return {
            success: true,
            message: 'Giocatore aggiunto al roster',
            match: updatedMatch
        };
    }

    /**
     * ➕👤 Crea un nuovo guest player e lo aggiunge al roster del match
     *    + lo aggiunge anche a Team.memberIds (così è riusabile in futuro).
     *    Riusa _createGuestPlayersForMatch per coerenza con CreateMatch.
     * @param {string} matchId
     * @param {{ name: string, position?: string }} guestData
     * @param {string} requesterId - chi sta creando il guest (admin)
     * @returns {Promise<Object>} match aggiornato + dati invito
     */
    async addGuestPlayerToMatch(matchId, guestData, requesterId) {
        if (!guestData || !guestData.name || !guestData.name.trim()) {
            throw new AppError('Il nome del guest è obbligatorio', 400);
        }

        const { match } = await this.assertMatchEditableRoster(matchId);

        // Riusa il metodo già esistente — crea User guest + lo aggiunge a Team.memberIds
        const created = await this._createGuestPlayersForMatch(
            matchId,
            match.teamId,
            [{ name: guestData.name, position: guestData.position }],
            requesterId
        );
        const guest = created[0];

        // Aggiungi al roster del match
        const updatedMatch = await this.matchRepository.findOneAndUpdate(
            { _id: matchId },
            { $addToSet: { teamMemberIds: guest.userId } },
            { new: true }
        );

        // 🔄 Allinea la VotingSession (eligibleVoters / requiredVotes)
        await this._syncVotingSessionWithRoster(matchId);

        try {
            await CacheService.invalidateMatchCacheAfterVote(updatedMatch.teamId);
        } catch (cacheError) {
            console.warn('⚠️ Cache invalidation guest add (non critico):', cacheError.message);
        }

        return {
            success: true,
            message: 'Guest player creato e aggiunto al roster',
            match: updatedMatch,
            guest
        };
    }

    /**
     * ➖ Rimuove un giocatore (registrato o guest) dal roster del match.
     *    NON tocca l'entità User: fa solo $pull da match.teamMemberIds.
     * @param {string} matchId
     * @param {string} playerIdToRemove
     * @returns {Promise<Object>} match aggiornato
     */
    async removePlayerFromMatch(matchId, playerIdToRemove) {
        const { match } = await this.assertMatchEditableRoster(matchId);

        const isInRoster = (match.teamMemberIds || []).some(
            (id) => String(id) === String(playerIdToRemove)
        );
        if (!isInRoster) {
            throw new AppError('Il giocatore non è nel roster di questa partita', 404);
        }

        // Mantieni almeno 2 partecipanti (coerente con validateMatchCreationInput)
        if ((match.teamMemberIds || []).length <= 2) {
            throw new AppError(
                'Impossibile rimuovere: la partita deve avere almeno 2 partecipanti',
                400
            );
        }

        const updatedMatch = await this.matchRepository.findOneAndUpdate(
            { _id: matchId },
            { $pull: { teamMemberIds: playerIdToRemove } },
            { new: true }
        );

        // 🔄 Allinea la VotingSession: rimuove il player da eligibleVoters/abstainedUsers
        //    e ricalcola requiredVotes. Sicuro perché il guard impone zero voti inviati.
        await this._syncVotingSessionWithRoster(matchId);

        try {
            await CacheService.invalidateMatchCacheAfterVote(updatedMatch.teamId);
        } catch (cacheError) {
            console.warn('⚠️ Cache invalidation roster remove (non critico):', cacheError.message);
        }

        return {
            success: true,
            message: 'Giocatore rimosso dal roster',
            match: updatedMatch
        };
    }
}

module.exports = MatchService;