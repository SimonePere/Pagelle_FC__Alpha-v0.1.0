// services/TeamService.js

// 🎯 REPOSITORY PATTERN - Accesso dati tramite Repository
const {
    TeamRepository,
    UserRepository
} = require('../repositories');

const AppError = require('../utils/AppError');

const PlayerCardService = require('./PlayerCardService');

/**
 * TEAM SERVICE
 * 
 * 🔄 AGGIORNATO CON REPOSITORY PATTERN:
 * - Non accede più direttamente ai Model Mongoose
 * - Usa Repository per separare data access da business logic
 * 
 * Gestisce tutta la business logic per i team:
 * - Creazione team con invite code generation
 * - Team membership management (join/leave)
 * - Team access control (public/private)
 * - User-team relationships
 * - Team ownership and admin management
 */
class TeamService {

    /**
     * 🏗️ Costruttore - Inizializza i repository
     */
    constructor() {
        // Inizializza i repository per accesso dati
        this.teamRepository = new TeamRepository();
        this.userRepository = new UserRepository();
        this.playerCardService = new PlayerCardService();
    }

    /**
     * Crea un nuovo team con l'utente come admin e membro
     * @param {string} userId - ID dell'utente che crea il team
     * @param {Object} teamData - Dati del team
     * @returns {Promise<Object>} Team creato con invite code
     */
    async createTeam(userId, teamData) {
        // Input validation
        this.validateTeamCreationInput(teamData);

        const { name, description, settings } = teamData;

        try {
            // Check if team name already exists
            const existingTeam = await this.teamRepository.findOne({ name: name.trim() });
            if (existingTeam) {
                throw new AppError('Team name already exists', 400);
            }

            // Create team with explicit admin/member setup
            const teamData = {
                name: name.trim(),
                description: description?.trim(),
                createdBy: userId,
                adminIds: [userId],    // Creator as explicit admin
                memberIds: [userId],   // Creator as explicit member
                settings: settings || {},
            };

            // Generate unique invite code
            teamData.inviteCode = await this.generateUniqueInviteCode();

            const team = await this.teamRepository.create(teamData);

            // Update user's teamIds
            await this.userRepository.updateById(userId, {
                $addToSet: { teamIds: team._id }
            });

            return {
                success: true,
                team: {
                    id: team._id,
                    name: team.name,
                    description: team.description,
                    inviteCode: team.inviteCode,
                    createdBy: team.createdBy,
                    totalMembers: team.totalMembers,
                    settings: team.settings,
                    stats: team.stats,
                    colors: team.colors
                }
            };

        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError(`Failed to create team: ${error.message}`, 500);
        }
    }

    /**
     * Ottiene tutti i team pubblici con paginazione
     * @param {Object} options - Opzioni query {page, limit, search}
     * @returns {Promise<Object>} Lista team pubblici paginata
     */
    async getAllPublicTeams(options = {}) {
        const { page = 1, limit = 20, search = '' } = options;
        const skip = (page - 1) * limit;

        try {
            // Build query for public teams only
            const query = {
                'settings.isPrivate': { $ne: true }, // Non privati (inclusi undefined)
                isActive: true
            };

            // Add search filter if provided
            if (search) {
                query.name = { $regex: search, $options: 'i' };
            }

            const teams = await this.teamRepository.findAll(query, {
                select: 'name description memberIds stats colors createdAt',
                sort: { createdAt: -1 },
                skip: skip,
                limit: limit
            });

            const totalTeams = await this.teamRepository.countDocuments(query);

            return {
                success: true,
                teams: teams.map(team => ({
                    id: team._id,
                    name: team.name,
                    description: team.description,
                    totalMembers: team.memberIds ? team.memberIds.length : 0,
                    stats: team.stats,
                    colors: team.colors,
                    createdAt: team.createdAt
                })),
                pagination: {
                    page,
                    limit,
                    total: totalTeams,
                    pages: Math.ceil(totalTeams / limit)
                }
            };

        } catch (error) {
            throw new AppError(`Failed to fetch public teams: ${error.message}`, 500);
        }
    }

    /**
     * Ottiene i dettagli di un team con controlli di accesso
     * @param {string} teamId - ID del team
     * @param {string} userId - ID dell'utente richiedente
     * @returns {Promise<Object>} Dettagli del team
     */
    async getTeamDetails(teamId, userId) {
        // Input validation
        this.validateTeamId(teamId);
        this.validateUserId(userId);

        try {
            const team = await this.teamRepository.findById(teamId, {
                populate: [
                    { path: 'memberIds', select: 'name email birthdate profile.position profile.avatarUpdatedAt stats teamName isGuest canPromoteToPlayer role' },
                    { path: 'adminIds', select: 'name email birthdate teamName' },
                    { path: 'createdBy', select: 'name email birthdate teamName' }
                ]
            });

            if (!team) {
                throw new AppError('Team not found', 404);
            }

            // Check if user is member or team is public
            const isMember = team.isMember(userId);
            const isPublic = !team.settings.isPrivate;

            if (!isMember && !isPublic) {
                throw new AppError('Access denied - private team', 403);
            }

            return {
                success: true,
                team: {
                    id: team._id,
                    name: team.name,
                    description: team.description,
                    city: team.city,
                    inviteCode: isMember ? team.inviteCode : undefined, // Solo membri vedono il codice
                    createdBy: team.createdBy,
                    memberIds: team.memberIds,
                    adminIds: team.adminIds,
                    totalMembers: team.totalMembers,
                    isFull: team.isFull,
                    settings: team.settings,
                    stats: team.stats,
                    colors: team.colors,
                    avatar: team.avatar,
                    isActive: team.isActive,
                    isUserMember: isMember,
                    isUserAdmin: team.isAdmin(userId),
                    createdAt: team.createdAt,
                    updatedAt: team.updatedAt
                }
            };

        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError(`Failed to fetch team details: ${error.message}`, 500);
        }
    }

    /**
     * Unisce un utente a un team tramite codice invito e crea automaticamente una PlayerCardSession
     * @param {string} userId - ID dell'utente
     * @param {string} inviteCode - Codice invito del team
     * @returns {Promise<Object>} Risultato join team, creazione con playerCardRequest e votingSession
     */
    async joinTeam(userId, inviteCode) {

        // Input validation
        this.validateUserId(userId);
        this.validateInviteCode(inviteCode);

        try {
            // Find team by invite code
            const team = await this.teamRepository.findOne({ inviteCode: inviteCode.toUpperCase() });
            if (!team) {
                throw new AppError('Invalid invite code', 404);
            }

            // Business rules validation
            if (team.isMember(userId)) {
                throw new AppError('You are already a member of this team', 400);
            }

            if (team.isFull) {
                throw new AppError('Team has reached maximum members limit', 400);
            }

            // Add user to team
            team.addMember(userId);
            await this.teamRepository.save(team);

            // Update user's teamIds
            await this.userRepository.updateById(userId, {
                $addToSet: { teamIds: team._id }
            });

            // 🎯 Crea in automatico PlayerCardSession
            try {
                await this.playerCardService.createPlayerCardSession(userId, {
                    targetPlayerId: userId,
                    title: `Benvenuto in ${team.name}! Valuta le tue abilità`,
                    description: `Inizia a valutare le tue abilità nel team ${team.name}`,
                    deadline: null,
                    teamId: team._id
                });
            } catch (error) {
                // Log ma non bloccare il join
                console.error('Errore creazione PlayerCardSession:', error.message);
            }



            return {
                success: true,
                message: `Utente aggiunto con successo al Team ${team.name} e creata PlayerCardSession `,
                team: {
                    id: team._id,
                    name: team.name,
                    description: team.description,
                    totalMembers: team.totalMembers
                }
            };

        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError(`Failed to join team: ${error.message}`, 500);
        }
    }

    /**
     * Ottiene tutti i team di un utente
     * @param {string} userId - ID dell'utente
     * @returns {Promise<Object>} Lista team dell'utente
     */
    async getUserTeams(userId) {
        // Input validation
        this.validateUserId(userId);

        try {
            const user = await this.userRepository.findById(userId, { populate: [{ path: 'teamIds', select: 'name description totalMembers stats colors' }] });

            if (!user) {
                throw new AppError('User not found', 404);
            }

            return {
                success: true,
                teams: user.teamIds.map(team => ({
                    id: team._id,
                    name: team.name,
                    description: team.description,
                    totalMembers: team.totalMembers,
                    stats: team.stats,
                    colors: team.colors
                }))
            };

        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError(`Failed to fetch user teams: ${error.message}`, 500);
        }
    }

    /**
     * Rimuove un utente da un team con gestione ownership
     * @param {string} teamId - ID del team
     * @param {string} userId - ID dell'utente che lascia
     * @returns {Promise<Object>} Risultato leave team
     */
    async leaveTeam(teamId, userId) {
        // Input validation
        this.validateTeamId(teamId);
        this.validateUserId(userId);

        try {
            const team = await this.teamRepository.findById(teamId);
            if (!team) {
                throw new AppError('Team not found', 404);
            }

            // Check if user is member
            if (!team.isMember(userId)) {
                throw new AppError('You are not a member of this team', 400);
            }

            let message = 'Successfully left the team';

            // Handle different leave scenarios
            if (team.createdBy.equals(userId) && team.totalMembers === 1) {
                // Delete the team if creator is last member
                await this.teamRepository.findByIdAndDelete(team._id);
                message = 'Team deleted as you were the last member';
            } else if (team.createdBy.equals(userId)) {
                // Transfer ownership to first admin or member
                const newOwner = team.adminIds.find(id => !id.equals(userId)) ||
                    team.memberIds.find(id => !id.equals(userId));

                if (newOwner) {
                    team.createdBy = newOwner;
                    if (!team.isAdmin(newOwner)) {
                        team.adminIds.push(newOwner);
                    }
                }

                team.removeMember(userId);
                await this.teamRepository.save(team);
                message = 'Team ownership transferred and you left the team';
            } else {
                // Just remove user
                team.removeMember(userId);
                await team.save();
            }

            // Update user's teamIds
            await this.userRepository.updateById(userId, {
                $pull: { teamIds: team._id }
            });

            return {
                success: true,
                message: message
            };

        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError(`Failed to leave team: ${error.message}`, 500);
        }
    }

    /**
     * HELPER METHODS
     */

    /**
     * Genera un codice invito unico per il team
     */
    async generateUniqueInviteCode() {
        let codeExists = true;
        let inviteCode;

        while (codeExists) {
            // Generate 6-character alphanumeric code
            inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            const existingCode = await this.teamRepository.findOne({ inviteCode });
            codeExists = !!existingCode;
        }

        return inviteCode;
    }

    /**
     * INPUT VALIDATION METHODS
     */

    validateTeamCreationInput(teamData) {
        if (!teamData.name || teamData.name.trim().length < 2) {
            throw new AppError('Team name must be at least 2 characters long', 400);
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

    validateInviteCode(inviteCode) {
        if (!inviteCode || typeof inviteCode !== 'string') {
            throw new AppError('Invite code is required', 400);
        }
    }

    // === ALIAS METHODS ===
    // Per mantenere consistenza con gli altri controller

    async getAllTeams(options) {
        return this.getAllPublicTeams(options);
    }

    async getTeam(teamId, userId) {
        return this.getTeamDetails(teamId, userId);
    }

    async getMyTeams(userId) {
        return this.getUserTeams(userId);
    }

    /**
     * Aggiorna i dettagli di un team (solo admin)
     * @param {string} teamId - ID del team
     * @param {string} userId - ID dell'utente che fa la modifica
     * @param {Object} updateData - Campi da aggiornare (name, description, city)
     * @returns {Promise<Object>} Team aggiornato
     */
    async updateTeam(teamId, userId, updateData) {
        this.validateTeamId(teamId);
        this.validateUserId(userId);

        try {
            const team = await this.teamRepository.findById(teamId);
            if (!team) {
                throw new AppError('Team not found', 404);
            }

            // Solo admin e god possono modificare il team
            if (!team.isAdmin(userId) && userId !== 'god') {
                throw new AppError('Only team admins and god users can update team details', 403);
            }

            // Whitelist dei campi modificabili
            const allowedFields = ['name', 'description', 'city', 'avatar'];
            const sanitizedUpdate = {};
            for (const key of allowedFields) {
                if (updateData[key] !== undefined) {
                    sanitizedUpdate[key] = typeof updateData[key] === 'string'
                        ? updateData[key].trim()
                        : updateData[key];
                }
            }

            // Gestione settings (oggetto nested, solo booleani)
            if (updateData.settings && typeof updateData.settings === 'object') {
                const settingsUpdate = {};
                if (typeof updateData.settings.autoApprove === 'boolean') {
                    settingsUpdate['settings.autoApprove'] = updateData.settings.autoApprove;
                }
                if (typeof updateData.settings.allowGuestVoting === 'boolean') {
                    settingsUpdate['settings.allowGuestVoting'] = updateData.settings.allowGuestVoting;
                }
                if (Object.keys(settingsUpdate).length > 0) {
                    Object.assign(sanitizedUpdate, settingsUpdate);
                }
            }

            // Gestione colors (oggetto nested)
            if (updateData.colors && typeof updateData.colors === 'object') {
                const colorUpdate = {};
                if (updateData.colors.primary && /^#[0-9A-F]{6}$/i.test(updateData.colors.primary)) {
                    colorUpdate.primary = updateData.colors.primary;
                }
                if (updateData.colors.secondary && /^#[0-9A-F]{6}$/i.test(updateData.colors.secondary)) {
                    colorUpdate.secondary = updateData.colors.secondary;
                }
                if (Object.keys(colorUpdate).length > 0) {
                    sanitizedUpdate.colors = colorUpdate;
                }
            }

            if (Object.keys(sanitizedUpdate).length === 0) {
                throw new AppError('No valid fields to update', 400);
            }

            // Se si sta cambiando il nome, verifica unicità
            if (sanitizedUpdate.name) {
                if (sanitizedUpdate.name.length < 2) {
                    throw new AppError('Team name must be at least 2 characters long', 400);
                }
                const existingTeam = await this.teamRepository.findOne({
                    name: sanitizedUpdate.name,
                    _id: { $ne: teamId }
                });
                if (existingTeam) {
                    throw new AppError('Team name already exists', 400);
                }
            }

            const updatedTeam = await this.teamRepository.updateById(teamId, sanitizedUpdate);

            return {
                success: true,
                message: 'Team updated successfully',
                team: {
                    id: updatedTeam._id,
                    name: updatedTeam.name,
                    description: updatedTeam.description,
                    city: updatedTeam.city,
                    inviteCode: updatedTeam.inviteCode,
                    totalMembers: updatedTeam.totalMembers,
                    settings: updatedTeam.settings,
                    stats: updatedTeam.stats,
                    colors: updatedTeam.colors,
                    avatar: updatedTeam.avatar
                }
            };

        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError(`Failed to update team: ${error.message}`, 500);
        }
    }

    /**
     * Rimuove un membro dal team (solo admin)
     * @param {string} teamId - ID del team
     * @param {string} adminUserId - ID dell'admin che esegue la rimozione
     * @param {string} targetUserId - ID del membro da rimuovere
     * @returns {Promise<Object>} Risultato rimozione
     */
    async removeMember(teamId, adminUserId, targetUserId) {
        this.validateTeamId(teamId);
        this.validateUserId(adminUserId);
        this.validateUserId(targetUserId);

        try {
            const team = await this.teamRepository.findById(teamId);
            if (!team) {
                throw new AppError('Team not found', 404);
            }

            // Solo admin possono rimuovere membri
            if (!team.isAdmin(adminUserId) && adminUserId !== 'god') {
                throw new AppError('Only team admins can remove members', 403);
            }

            // Non puoi rimuovere te stesso (usa leaveTeam)
            if (adminUserId === targetUserId) {
                throw new AppError('Use leave team to remove yourself', 400);
            }

            // Verifica che il target sia membro
            if (!team.isMember(targetUserId)) {
                throw new AppError('User is not a member of this team', 400);
            }

            // Rimuovi il membro
            team.removeMember(targetUserId);
            await this.teamRepository.save(team);

            // Aggiorna teamIds dell'utente rimosso
            await this.userRepository.updateById(targetUserId, {
                $pull: { teamIds: team._id }
            });

            return {
                success: true,
                message: 'Member removed successfully'
            };

        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError(`Failed to remove member: ${error.message}`, 500);
        }
    }

    /**
     * Lista i guest associati a un team (utenti con isGuest=true e teamIds includes teamId).
     * Solo team-admin o admin globale possono ottenerla — il check di autorizzazione
     * è già fatto dal middleware requireTeamAdmin a monte.
     *
     * @param {string} teamId - ID del team
     * @returns {Promise<Array>} Lista guest con campi essenziali
     */
    async listTeamGuests(teamId) {
        this.validateTeamId(teamId);

        const guests = await this.userRepository.findAll(
            { isGuest: true, teamIds: teamId },
            { select: 'name profile.position canPromoteToPlayer canPromoteToPlayerSetAt inviteTokenMatchId guestCreatedBy createdAt' }
        );

        return (guests || []).map(g => ({
            id: g._id,
            name: g.name,
            position: g.profile?.position || null,
            canPromoteToPlayer: !!g.canPromoteToPlayer,
            canPromoteToPlayerSetAt: g.canPromoteToPlayerSetAt || null,
            inviteTokenMatchId: g.inviteTokenMatchId || null,
            guestCreatedBy: g.guestCreatedBy || null,
            createdAt: g.createdAt
        }));
    }

    /**
     * Abilita o disabilita la possibilità per un guest di auto-promuoversi
     * a utente registrato (role: player).
     *
     * Quando `allowed=true`:
     *   - il guest vedrà le CTA "Registrati" lato UI
     *   - i flussi /auth/promote-guest-by-invite-token e /auth/promote-guest-by-id risponderanno OK
     *
     * Quando `allowed=false`:
     *   - le CTA spariscono
     *   - il backend respinge i merge con 403
     *
     * @param {string} teamId - ID del team del guest (per audit/scope)
     * @param {string} guestUserId - ID dell'utente guest
     * @param {boolean} allowed - Nuovo valore del flag
     * @param {string} requesterId - ID dell'admin che esegue l'azione
     * @returns {Promise<Object>} Stato aggiornato
     */
    async setGuestPromotionAllowed(teamId, guestUserId, allowed, requesterId) {
        this.validateTeamId(teamId);
        this.validateUserId(guestUserId);
        this.validateUserId(requesterId);

        if (typeof allowed !== 'boolean') {
            throw new AppError('Il campo "allowed" è richiesto e deve essere booleano', 400);
        }

        const guest = await this.userRepository.findById(guestUserId);
        if (!guest) throw new AppError('Guest non trovato', 404);
        if (!guest.isGuest) throw new AppError('L\'utente non è un ospite', 400);

        // Verifica che il guest appartenga davvero al team indicato
        const belongsToTeam = (guest.teamIds || []).some(id => id.toString() === teamId.toString());
        if (!belongsToTeam) {
            throw new AppError('Il guest non appartiene a questo team', 400);
        }

        const updated = await this.userRepository.updateById(guestUserId, {
            canPromoteToPlayer: allowed,
            canPromoteToPlayerSetBy: requesterId,
            canPromoteToPlayerSetAt: new Date()
        });

        return {
            success: true,
            guest: {
                id: updated._id,
                name: updated.name,
                canPromoteToPlayer: !!updated.canPromoteToPlayer,
                canPromoteToPlayerSetAt: updated.canPromoteToPlayerSetAt
            }
        };
    }
}

module.exports = TeamService;