const Avatar = require('../models/Avatar');
const User = require('../models/User');
const Team = require('../models/Team');

/**
 * AvatarService — Gestisce il caricamento, recupero e rimozione degli avatar
 * 
 * Validazione:
 * - MIME whitelist: image/webp, image/jpeg, image/png
 * - Dimensione: ≤ 200KB (hard cap)
 * 
 * Usa AppError per errori coerenti
 */
class AvatarService {
    /**
     * Salva o aggiorna l'avatar di un utente/team
     * @param {string} ownerType - 'user' | 'team'
     * @param {ObjectId} ownerId - ID dell'owner
     * @param {Buffer} buffer - byte dell'immagine
     * @param {string} contentType - MIME type (es. 'image/webp')
     * @throws {AppError} se validazione fallisce
     * @returns {Object} Avatar salvato + User/Team con avatarUpdatedAt aggiornato
     */
    async setAvatar(ownerType, ownerId, buffer, contentType) {
        // 1. Validazione MIME whitelist
        const allowedMimeTypes = ['image/webp', 'image/jpeg', 'image/png'];
        if (!allowedMimeTypes.includes(contentType)) {
            const AppError = require('../utils/AppError');
            throw new AppError(`Unsupported MIME type: ${contentType}. Allowed: ${allowedMimeTypes.join(', ')}`, 400);
        }

        // 2. Validazione dimensione
        const byteSize = buffer.length;
        const maxBytes = 200000; // 200KB
        if (byteSize > maxBytes) {
            const AppError = require('../utils/AppError');
            throw new AppError(`Avatar too large: ${byteSize} bytes. Maximum: ${maxBytes} bytes`, 413);
        }
        if (byteSize < 1) {
            const AppError = require('../utils/AppError');
            throw new AppError('Avatar is empty', 400);
        }

        // 3. Upsert Avatar
        const avatar = await Avatar.findOneAndUpdate(
            { ownerId, ownerType },
            {
                data: buffer,
                contentType,
                byteSize
            },
            { upsert: true, new: true, runValidators: true }
        );

        // 4. Aggiorna avatarUpdatedAt sull'owner (User o Team)
        const now = new Date();
        let owner;
        if (ownerType === 'user') {
            owner = await User.findByIdAndUpdate(
                ownerId,
                { 'profile.avatarUpdatedAt': now },
                { new: true }
            );
        } else if (ownerType === 'team') {
            owner = await Team.findByIdAndUpdate(
                ownerId,
                { avatarUpdatedAt: now },
                { new: true }
            );
        } else {
            const AppError = require('../utils/AppError');
            throw new AppError('Invalid ownerType', 400);
        }

        return { avatar, owner, avatarUpdatedAt: now };
    }

    /**
     * Recupera l'avatar (buffer + metadati)
     * @param {string} ownerType - 'user' | 'team'
     * @param {ObjectId} ownerId - ID dell'owner
     * @returns {Object|null} { data (Buffer), contentType, byteSize } o null se non esiste
     */
    async getAvatar(ownerType, ownerId) {
        const avatar = await Avatar.findOne({ ownerId, ownerType }).select('+data');
        return avatar
            ? {
                data: avatar.data,
                contentType: avatar.contentType,
                byteSize: avatar.byteSize
            }
            : null;
    }

    /**
     * Rimuove l'avatar
     * @param {string} ownerType - 'user' | 'team'
     * @param {ObjectId} ownerId - ID dell'owner
     * @returns {Object} User/Team con avatarUpdatedAt = null
     */
    async deleteAvatar(ownerType, ownerId) {
        // 1. Rimuovi il record Avatar
        await Avatar.deleteOne({ ownerId, ownerType });

        // 2. Azzera avatarUpdatedAt sull'owner
        let owner;
        if (ownerType === 'user') {
            owner = await User.findByIdAndUpdate(
                ownerId,
                { 'profile.avatarUpdatedAt': null },
                { new: true }
            );
        } else if (ownerType === 'team') {
            owner = await Team.findByIdAndUpdate(
                ownerId,
                { avatarUpdatedAt: null },
                { new: true }
            );
        } else {
            const AppError = require('../utils/AppError');
            throw new AppError('Invalid ownerType', 400);
        }

        return owner;
    }

    /**
     * Recupera solo il Buffer (per embedding in Award data URI)
     * @param {string} ownerType
     * @param {ObjectId} ownerId
     * @returns {Buffer|null}
     */
    async getAvatarBuffer(ownerType, ownerId) {
        const avatar = await Avatar.findOne({ ownerId, ownerType }).select('+data');
        return avatar ? avatar.data : null;
    }
}

module.exports = AvatarService;
