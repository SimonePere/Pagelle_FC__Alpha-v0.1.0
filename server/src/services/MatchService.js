// services/MatchService.js

// 🎯 REPOSITORY PATTERN - Accesso dati tramite Repository
const {
    MatchRepository,
    TeamRepository,
    VotingSessionRepository
} = require('../repositories');

const AppError = require('../utils/AppError');
const CacheService = require('./CacheService'); // 🆕 Cache invalidation per match updates

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
    }

    /**
     * Crea un nuovo match con auto-generazione della voting session
     * @param {string} userId - ID dell'utente che crea il match
     * @param {Object} matchData - Dati del match
     * @returns {Promise<Object>} Match e voting session creati
     */
    async createMatch(userId, matchData) {
        // Input validation
        this.validateMatchCreationInput(matchData);

        const { field, date, playersCount, notes, teamMemberIds, teamId } = matchData;

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

            // 2. Auto-create voting session
            const votingSession = await this.createAutoVotingSession(match, userId);

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
                }
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

            // Get matches usando metodo specifico Repository invece di findAll generico
            const matches = await this.matchRepository.findByTeam(teamId, {
                populate: [
                    { path: 'createdBy', select: 'name birthdate teamName' },
                    { path: 'teamMemberIds', select: 'name birthdate profile.position teamName' }
                ],
                sort: { date: -1 },
                skip: skip,
                limit: limit
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
            const match = await this.matchRepository.findById(matchId, {
                populate: [
                    { path: 'createdBy', select: 'name email birthdate teamName' },
                    { path: 'teamMemberIds', select: 'name email birthdate profile.position teamName' }
                ]
            });

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
    async createAutoVotingSession(match, userId) {
        const votingSession = await this.votingSessionRepository.create({
            type: 'match_rating',
            targetType: 'match',
            targetId: match._id,
            teamId: match.teamId,
            createdBy: userId,
            title: `📊 Creazione sessione votazione per Partita a ${match.playersCount}`,
            description: `Valuta i tuoi compagni nella partita a ${match.field} del ${new Date(match.date).toLocaleDateString('it-IT')}`,
            status: 'active',
            eligibleVoters: match.teamMemberIds || [userId],
            tags: ['auto-generated', 'match-linked'],
            environment: 'production'
        });

        return votingSession;
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

            // 4. Elimina il match usando BaseRepository
            await this.matchRepository.deleteById(matchId);

            console.log(`🗑️ Match ${matchId} eliminato con successo da user ${userId}`);

            // 🧹 CACHE INVALIDATION: Pulisce cache per team dopo delete match
            try {
                await CacheService.invalidateMatchCacheAfterVote(existingMatch.teamId);
                console.log(`🧹 Cache match team ${existingMatch.teamId} invalidata dopo delete`);
            } catch (cacheError) {
                console.warn(`⚠️ Cache invalidation fallita (non critico):`, cacheError.message);
            }

            return {
                success: true,
                message: 'Match eliminato con successo',
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
                }
            };

        } catch (error) {
            console.error('❌ Errore delete match:', error.message);
            throw error;
        }
    }
}

module.exports = MatchService;