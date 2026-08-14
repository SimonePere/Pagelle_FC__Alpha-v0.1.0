const AvatarService = require('../services/AvatarService');
const AppError = require('../utils/AppError');

const avatarService = new AvatarService();

/**
 * AVATAR CONTROLLER
 * 
 * Endpoint per upload/gestione avatar di utenti e team.
 * Delega tutta la business logic ad AvatarService.
 */

// ====== UTENTE ======

/**
 * @desc    Upload/replace foto profilo utente
 * @route   POST /api/v1/users/me/avatar
 * @access  Private (self)
 */
const uploadMyAvatar = async (req, res, next) => {
    try {
        if (!req.file) {
            throw new AppError('No file uploaded', 400);
        }

        const { buffer, mimetype } = req.file;
        const userId = req.user.id;

        const result = await avatarService.setAvatar('user', userId, buffer, mimetype);

        res.status(201).json({
            success: true,
            avatarUpdatedAt: result.avatarUpdatedAt,
            user: result.owner
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Rimuove foto profilo utente
 * @route   DELETE /api/v1/users/me/avatar
 * @access  Private (self)
 */
const deleteMyAvatar = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const user = await avatarService.deleteAvatar('user', userId);

        res.status(200).json({
            success: true,
            message: 'Avatar deleted',
            user
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Recupera foto profilo (pubblica)
 * @route   GET /api/v1/users/:id/avatar
 * @access  Public
 */
const getUserAvatar = async (req, res, next) => {
    try {
        const { id } = req.params;

        const avatarData = await avatarService.getAvatar('user', id);

        if (!avatarData) {
            return res.status(404).json({
                success: false,
                message: 'Avatar not found'
            });
        }

        // Header cache immutable + CORS / CORP headers per asset pubblici
        res.set({
            'Content-Type': avatarData.contentType,
            'Cache-Control': 'public, max-age=31536000, immutable',
            'ETag': `"${avatarData.byteSize}"`,
            'Cross-Origin-Resource-Policy': 'cross-origin',
            'Access-Control-Allow-Origin': '*'
        });

        res.send(avatarData.data);
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Admin team rimuove avatar di un membro (moderazione)
 * @route   DELETE /api/v1/users/:id/avatar
 * @access  Private (admin di team)
 */
const adminDeleteUserAvatar = async (req, res, next) => {
    try {
        const { id: targetUserId } = req.params;
        const { teamId } = req.body; // L'admin specifica il team

        if (!teamId) {
            throw new AppError('teamId is required', 400);
        }

        // Verifica che l'utente richiedente sia admin del team
        const Team = require('../models/Team');
        const team = await Team.findById(teamId);

        if (!team) {
            throw new AppError('Team not found', 404);
        }

        if (!team.isAdmin(req.user.id)) {
            throw new AppError('Not authorized to moderate this team', 403);
        }

        // Se il target non è membro del team, nega
        if (!team.isMember(targetUserId)) {
            throw new AppError('User is not a member of this team', 400);
        }

        const user = await avatarService.deleteAvatar('user', targetUserId);

        res.status(200).json({
            success: true,
            message: 'User avatar removed by admin',
            user
        });
    } catch (error) {
        next(error);
    }
};

// ====== TEAM ======

/**
 * @desc    Upload/replace stemma team (admin only)
 * @route   POST /api/v1/teams/:id/avatar
 * @access  Private (admin del team)
 */
const uploadTeamAvatar = async (req, res, next) => {
    try {
        if (!req.file) {
            throw new AppError('No file uploaded', 400);
        }

        const { id: teamId } = req.params;
        const { buffer, mimetype } = req.file;

        // Verifica autorizzazione
        const Team = require('../models/Team');
        const team = await Team.findById(teamId);

        if (!team) {
            throw new AppError('Team not found', 404);
        }

        if (!team.isAdmin(req.user.id)) {
            throw new AppError('Not authorized to upload avatar for this team', 403);
        }

        const result = await avatarService.setAvatar('team', teamId, buffer, mimetype);

        res.status(201).json({
            success: true,
            avatarUpdatedAt: result.avatarUpdatedAt,
            team: result.owner
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Rimuove stemma team (admin only)
 * @route   DELETE /api/v1/teams/:id/avatar
 * @access  Private (admin del team)
 */
const deleteTeamAvatar = async (req, res, next) => {
    try {
        const { id: teamId } = req.params;

        // Verifica autorizzazione
        const Team = require('../models/Team');
        const team = await Team.findById(teamId);

        if (!team) {
            throw new AppError('Team not found', 404);
        }

        if (!team.isAdmin(req.user.id)) {
            throw new AppError('Not authorized to delete avatar for this team', 403);
        }

        const updatedTeam = await avatarService.deleteAvatar('team', teamId);

        res.status(200).json({
            success: true,
            message: 'Team avatar deleted',
            team: updatedTeam
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Recupera stemma team (pubblica)
 * @route   GET /api/v1/teams/:id/avatar
 * @access  Public
 */
const getTeamAvatar = async (req, res, next) => {
    try {
        const { id: teamId } = req.params;

        const avatarData = await avatarService.getAvatar('team', teamId);

        if (!avatarData) {
            return res.status(404).json({
                success: false,
                message: 'Avatar not found'
            });
        }

        // Header cache immutable + CORS / CORP headers per asset pubblici
        res.set({
            'Content-Type': avatarData.contentType,
            'Cache-Control': 'public, max-age=31536000, immutable',
            'ETag': `"${avatarData.byteSize}"`,
            'Cross-Origin-Resource-Policy': 'cross-origin',
            'Access-Control-Allow-Origin': '*'
        });

        res.send(avatarData.data);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    // User
    uploadMyAvatar,
    deleteMyAvatar,
    getUserAvatar,
    adminDeleteUserAvatar,
    // Team
    uploadTeamAvatar,
    deleteTeamAvatar,
    getTeamAvatar
};
