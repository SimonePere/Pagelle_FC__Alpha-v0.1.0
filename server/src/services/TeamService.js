// services/TeamService.js

// 🎯 REPOSITORY PATTERN - Accesso dati tramite Repository
const {
    TeamRepository,
    UserRepository
} = require('../repositories');

const AppError = require('../utils/AppError');

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
                    { path: 'memberIds', select: 'name email birthdate profile.position stats teamName' },
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
                    inviteCode: isMember ? team.inviteCode : undefined, // Solo membri vedono il codice
                    createdBy: team.createdBy,
                    memberIds: team.memberIds,
                    adminIds: team.adminIds,
                    totalMembers: team.totalMembers,
                    isFull: team.isFull,
                    settings: team.settings,
                    stats: team.stats,
                    colors: team.colors,
                    isUserMember: isMember,
                    isUserAdmin: team.isAdmin(userId)
                }
            };

        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError(`Failed to fetch team details: ${error.message}`, 500);
        }
    }

    /**
     * Unisce un utente a un team tramite codice invito
     * @param {string} userId - ID dell'utente
     * @param {string} inviteCode - Codice invito del team
     * @returns {Promise<Object>} Risultato join team
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
            await this.userRepository.findByIdAndUpdate(userId, {
                $addToSet: { teamIds: team._id }
            });

            return {
                success: true,
                message: `Successfully joined ${team.name}`,
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
            await this.userRepository.findByIdAndUpdate(userId, {
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
}

module.exports = TeamService;