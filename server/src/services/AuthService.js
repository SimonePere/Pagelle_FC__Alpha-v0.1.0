// services/AuthService.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const AppError = require('../utils/AppError');

// 🎯 REPOSITORY PATTERN - Accesso dati tramite Repository
const {
    UserRepository,
    MatchRepository,
    PlayerCardResultRepository,
    PlayerLeaderboardStatsRepository,
    TeamRepository
} = require('../repositories');

/**
 * AuthService - Business Logic Layer per Autenticazione
 * 
 * 🔄 AGGIORNATO CON REPOSITORY PATTERN:
 * - Non accede più direttamente ai Model Mongoose
 * - Usa Repository per separare data access da business logic
 * 
 * Responsabilità:
 * - Autenticazione e autorizzazione utenti
 * - Registrazione e validazione
 * - Gestione JWT tokens
 * - Profili utente e statistiche
 */
class AuthService {

    /**
     * 🏗️ Costruttore - Inizializza i repository
     */
    constructor() {
        // Inizializza i repository per accesso dati
        this.userRepository = new UserRepository();
        this.matchRepository = new MatchRepository();
        this.playerCardResultRepository = new PlayerCardResultRepository();
        this.playerStatsRepository = new PlayerLeaderboardStatsRepository();
        this.teamRepository = new TeamRepository();
    }
    /**
     * Generate JWT Token
     * @param {string} userId - User ID
     * @returns {string} JWT token
     */
    generateToken(userId) {
        const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        });
        return token;
    }

    /**
     * Validate registration input
     * @param {Object} data - Registration data
     * @param {string} data.name - User name
     * @param {string} data.email - User email  
     * @param {string} data.password - User password
     * @throws {Error} If validation fails
     */
    validateRegistrationInput({ name, email, password }) {
        if (!name || !email || !password) {
            throw new Error('Please provide name, email, and password');
        }

        if (name.trim().length < 2) {
            throw new Error('Name must be at least 2 characters long');
        }

        if (password.length < 6) {
            throw new Error('Password must be at least 6 characters long');
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new Error('Please provide a valid email address');
        }
    }

    /**
     * Validate login input
     * @param {Object} data - Login data
     * @param {string} data.email - User email
     * @param {string} data.password - User password
     * @throws {Error} If validation fails
     */
    validateLoginInput({ email, password }) {
        if (!email || !password) {
            throw new Error('Please provide email and password');
        }
    }

    /**
    * VALIDAZIONI PROFILO UTENTE
    */
    validateProfileUpdateData(updateData) {
        const { name, email, birthdate } = updateData;

        if (name && (!name.trim() || name.length < 2 || name.length > 50)) {
            throw new AppError('Nome deve essere tra 2 e 50 caratteri', 400);
        }

        if (email && !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
            throw new AppError('Email non valida', 400);
        }

        if (birthdate && !/^\d{4}-\d{2}-\d{2}$/.test(birthdate)) {
            throw new AppError('Data nascita deve essere nel formato YYYY-MM-DD', 400);
        }
    }

    /**
     * Valida password
     */
    validatePassword(password) {
        if (!password || password.length < 6) {
            throw new AppError('Password deve essere di almeno 6 caratteri', 400);
        }

        if (!/[A-Z]/.test(password)) {
            throw new AppError('Password deve contenere almeno una lettera maiuscola', 400);
        }

        if (!/[a-z]/.test(password)) {
            throw new AppError('Password deve contenere almeno una lettera minuscola', 400);
        }

        if (!/\d/.test(password)) {
            throw new AppError('Password deve contenere almeno un numero', 400);
        }

        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            throw new AppError('Password deve contenere almeno un carattere speciale (!@#$%^&*)', 400);
        }
    }
    /**
     * Check if user exists by email
     * @param {string} email - User email
     * @returns {Promise<boolean>} True if user exists
     */
    async userExistsByEmail(email) {
        const existingUser = await this.userRepository.findOne({
            email: email.toLowerCase()
        });
        return !!existingUser;
    }

    /**
     * Hash password using bcrypt
     * @param {string} password - Plain text password
     * @returns {Promise<string>} Hashed password
     */
    async hashPassword(password) {
        const salt = await bcrypt.genSalt(10);
        return await bcrypt.hash(password, salt);
    }

    /**
     * Register new user with business logic
     * @param {Object} userData - User registration data
     * @param {string} userData.name - User name
     * @param {string} userData.email - User email
     * @param {string} userData.password - User password
     * @param {string} userData.birthdate - User birthdate (optional)
     * @param {string} userData.existingTeamId - Existing team ID to join (optional)
     * @returns {Promise<Object>} Created user and token
     */
    async registerUser({ name, email, password, birthdate, existingTeamId }) {
        // 1. Input validation
        this.validateRegistrationInput({ name, email, password });

        // 2. Check if user exists
        const userExists = await this.userExistsByEmail(email);
        if (userExists) {
            throw new Error('User already exists with this email');
        }

        // 3. Hash password
        const hashedPassword = await this.hashPassword(password);

        // 4. Create user with default profile
        const user = await this.userRepository.create({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            birthdate: birthdate,
            password: hashedPassword,
            teamIds: [], // Nessun team inizialmente
            profile: {
                position: 'UTIL', // Default position
                preferredFoot: 'right'
            }
        });

        // 5. Generate token
        const token = this.generateToken(user._id);

        // 6. Team join opzionale
        let teamJoined = null;
        if (existingTeamId) {
            teamJoined = await this.joinUserToTeam(user._id, existingTeamId);
        }

        return {
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                birthdate: user.birthdate,
                teamIds: user.teamIds,
                teamName: user.teamName,
                role: user.role,
                profile: user.profile,
                totalTeams: user.totalTeams
            },
            team: teamJoined
        };
    }

    /**
 * Unisce un utente a un team esistente (con validazione completa)
 * @param {string} userId - ID dell'utente 
 * @param {string} teamId - ID del team
 * @returns {Promise<Object>} Info del team unito
 */
    async joinUserToTeam(userId, teamId) {
        try {
            // 1. Validazione input
            if (!teamId || !mongoose.isValidObjectId(teamId)) {
                throw new Error('Team ID non valido');
            }

            // 2. Verifica esistenza team
            const team = await this.teamRepository.findById(teamId);
            if (!team) {
                throw new Error('Team non trovato');
            }

            // 3. Verifica che il team sia attivo e pubblico
            if (!team.isActive) {
                throw new Error('Team non attivo');
            }
            if (team.settings?.isPrivate === true) {
                throw new Error('Team privato, usa il codice invito');
            }

            // 4. Aggiungi utente al team
            await this.teamRepository.updateById(teamId, {
                $addToSet: { memberIds: userId }
            });

            // 5. Aggiorna teamIds dell'utente  
            await this.userRepository.updateById(userId, {
                $addToSet: { teamIds: teamId }
            });

            // 6. Restituisci info team
            return {
                id: team._id,
                name: team.name,
                description: team.description,
                totalMembers: (team.memberIds?.length || 0) + 1
            };

        } catch (error) {
            throw new Error(`Errore team join: ${error.message}`);
        }
    }

    /**
 * Aggiorna il profilo utente
 * @param {string} userId - ID dell'utente
 * @param {Object} updateData - Dati da aggiornare
 * @returns {Promise<Object>} Profilo aggiornato
 */
    async updateProfile(userId, updateData) {
        try {
            // 1. Valida dati input
            this.validateProfileUpdateData(updateData);

            // 2. Verifica che l'utente esista
            const existingUser = await this.userRepository.findById(userId);
            if (!existingUser) {
                throw new AppError('Utente non trovato', 404);
            }

            // 3. Se cambia email, verifica che non sia già usata
            if (updateData.email && updateData.email !== existingUser.email) {
                const emailExists = await this.userRepository.findByEmail(updateData.email);
                if (emailExists) {
                    throw new AppError('Email già utilizzata da un altro utente', 400);
                }
            }

            // 4. Aggiorna usando BaseRepository
            const updatedUser = await this.userRepository.updateById(userId, updateData);

            console.log(`✅ Profilo utente ${userId} aggiornato con successo`);

            return {
                success: true,
                message: 'Profilo aggiornato con successo',
                user: {
                    id: updatedUser._id,
                    name: updatedUser.name,
                    email: updatedUser.email,
                    birthdate: updatedUser.birthdate,
                    updatedAt: updatedUser.updatedAt
                }
            };

        } catch (error) {
            console.error('❌ Errore update profilo:', error.message);
            throw error;
        }
    }

    /**
 * Cambia password utente
 * @param {string} userId - ID dell'utente
 * @param {string} oldPassword - Password attuale
 * @param {string} newPassword - Nuova password
 * @returns {Promise<Object>} Conferma cambio password
 */
    async changePassword(userId, oldPassword, newPassword) {
        try {
            // 1. Trova utente con password
            const user = await this.userRepository.findById(userId, { select: '+password' });
            if (!user) {
                throw new AppError('Utente non trovato', 404);
            }

            // 2. Verifica password attuale
            const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
            if (!isOldPasswordValid) {
                throw new AppError('Password attuale non corretta', 400);
            }

            // 3. Valida nuova password
            this.validatePassword(newPassword);

            // 4. Hash nuova password
            const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
            const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

            // 5. Aggiorna password
            await this.userRepository.updateById(userId, { password: hashedNewPassword });

            console.log(`🔐 Password utente ${userId} cambiata con successo`);

            return {
                success: true,
                message: 'Password cambiata con successo'
            };

        } catch (error) {
            console.error('❌ Errore cambio password:', error.message);
            throw error;
        }
    }
    /**
     * Find user by email for login
     * @param {string} email - User email or name
     * @returns {Promise<Object|null>} User with password field
     */
    async findUserForLogin(email) {
        return await this.userRepository.findOne({
            $or: [
                { email: email.toLowerCase().trim() },
            ]
        }, {
            select: '+password'
        });
    }

    /**
     * Verify password against hash
     * @param {string} plainPassword - Plain text password
     * @param {string} hashedPassword - Hashed password from database
     * @returns {Promise<boolean>} True if password matches
     */
    async verifyPassword(plainPassword, hashedPassword) {
        return await bcrypt.compare(plainPassword, hashedPassword);
    }

    /**
     * Login user with business logic
     * @param {Object} loginData - Login credentials
     * @param {string} loginData.email - User email
     * @param {string} loginData.password - User password
     * @returns {Promise<Object>} User data and token
     */
    async loginUser({ email, password }) {
        // 1. Input validation
        this.validateLoginInput({ email, password });

        // 2. Find user
        const user = await this.findUserForLogin(email);
        if (!user) {
            throw new Error('Invalid credentials');
        }

        // 3. Check password
        const isPasswordCorrect = await this.verifyPassword(password, user.password);
        if (!isPasswordCorrect) {
            throw new Error('Invalid credentials');
        }

        // 4. Generate token
        const token = this.generateToken(user._id);

        return {
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                birthdate: user.birthdate,
                teamIds: user.teamIds,
                teamName: user.teamName,
                role: user.role,
                profile: user.profile,
                totalTeams: user.totalTeams
            }
        };
    }

    /**
     * Get user personal stats from PlayerLeaderboardStats
     * @param {string} userId - User ID
     * @returns {Promise<Object>} User statistics
     */
    async getUserPersonalStats(userId) {
        const userStats = await this.playerStatsRepository.findOne({
            playerId: userId
        });

        return userStats ? {
            totalMatches: userStats.totalMatches,
            totalGoals: userStats.totalGoals,
            totalAssists: userStats.totalAssists,
            averageRating: userStats.averageRating,
            bestRating: userStats.bestRating,
            worstRating: userStats.worstRating
        } : {
            totalMatches: 0,
            totalGoals: 0,
            totalAssists: 0,
            averageRating: 0,
            bestRating: null,
            worstRating: null
        };
    }

    /**
     * Calculate dynamic team stats for user teams
     * @param {Array} teamIds - Array of team objects with _id
     * @returns {Promise<void>} Modifies teams in place with stats
     */
    async calculateTeamStats(teams) {
        if (!teams || teams.length === 0) return;

        for (let team of teams) {
            // Calcola stats team dinamiche
            const [totalMatches, teamStats, lastMatch] = await Promise.all([
                // Conta match del team
                this.matchRepository.countDocuments({ teamId: team._id }),

                // Somma stats di tutti i membri del team
                this.playerStatsRepository.aggregate([
                    { $match: { teamId: team._id, isActive: true } },
                    {
                        $group: {
                            _id: null,
                            totalGoals: { $sum: '$totalGoals' },
                            totalAssists: { $sum: '$totalAssists' },
                            avgRating: { $avg: '$averageRating' },
                            activePlayers: { $sum: 1 }
                        }
                    }
                ]),

                // Ultima partita del team
                this.matchRepository.findOne(
                    { teamId: team._id },
                    { select: 'date', sort: { date: -1 }, lean: true }
                )
            ]);

            const teamStatsData = teamStats[0] || {
                totalGoals: 0,
                totalAssists: 0,
                avgRating: 0,
                activePlayers: 0
            };

            // Aggiungi stats dinamiche al team
            team._doc.teamStats = {
                totalMatches: totalMatches,
                totalGoals: teamStatsData.totalGoals,
                totalAssists: teamStatsData.totalAssists,
                averageRating: Math.round(teamStatsData.avgRating * 10) / 10 || 0,
                activePlayers: teamStatsData.activePlayers,
                lastMatchDate: lastMatch ? lastMatch.date : null
            };

            // Rimuovi le stats statiche non aggiornate  
            delete team._doc.stats;
        }
    }

    /**
     * Get user's latest player card information
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Player card info
     */
    async getUserPlayerCardInfo(userId) {
        const latestPlayerCard = await this.playerCardResultRepository.findOne({
            targetPlayerId: userId
        }, {
            sort: { createdAt: -1 },
            populate: [{ path: 'votingSessionId', select: 'title createdAt completedAt' }]
        });

        // 🛠️ FIX: Gestisce il caso in cui votingSessionId è null dopo populate
        if (!latestPlayerCard) {
            return {
                hasPlayerCard: false,
                latestCard: null
            };
        }

        // Se votingSession non esiste più (dati corrotti), usa dati di fallback
        const sessionInfo = latestPlayerCard.votingSessionId || {};

        return {
            hasPlayerCard: true,
            latestCard: {
                id: latestPlayerCard._id,
                sessionTitle: sessionInfo.title || 'PlayerCard Session',
                finalOverallRating: latestPlayerCard.finalOverallRating,
                consensusProfile: latestPlayerCard.consensusProfile,
                createdAt: latestPlayerCard.createdAt,
                completedAt: sessionInfo.completedAt || latestPlayerCard.createdAt,
                finalAttributes: {
                    tir: latestPlayerCard.finalAttributes.tir,
                    pas: latestPlayerCard.finalAttributes.pas,
                    dri: latestPlayerCard.finalAttributes.dri,
                    fin: latestPlayerCard.finalAttributes.fin,
                    vis: latestPlayerCard.finalAttributes.vis,
                    res: latestPlayerCard.finalAttributes.res,
                    for: latestPlayerCard.finalAttributes.for
                },
                finalAdditionalAttributes: {
                    piedeDebole: latestPlayerCard.finalAdditionalAttributes?.piedeDebole || null,
                    skill: latestPlayerCard.finalAdditionalAttributes?.skill || null
                }
            }
        };
    }

    /**
     * Get complete user profile with stats and teams
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Complete user profile
     */
    async getUserProfile(userId) {
        // 1. Get user with teams populated
        // 🎯 USA REPOSITORY per trovare utente
        const user = await this.userRepository.findById(userId, {
            select: '-password',
            populate: 'teamIds'
        });

        if (!user) {
            throw new Error('User not found');
        }

        // 2. Get personal stats
        const personalStats = await this.getUserPersonalStats(userId);

        // 3. Calculate team stats
        await this.calculateTeamStats(user.teamIds);

        // 4. Get player card info
        const playerCardInfo = await this.getUserPlayerCardInfo(userId);

        return {
            // === INFORMAZIONI BASE UTENTE ===
            id: user._id,
            name: user.name,
            email: user.email,
            birthdate: user.birthdate,
            role: user.role,
            profile: user.profile,
            isActive: user.isActive,
            displayName: user.displayName,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,

            // === STATISTICHE PERSONALI ===
            personalStats,

            // === PLAYER CARD ===
            playerCard: playerCardInfo,

            // === TEAM INFORMATION ===
            teams: user.teamIds,
            totalTeams: user.totalTeams,
            hasTeams: user.hasTeams
        };
    }
}

module.exports = new AuthService();