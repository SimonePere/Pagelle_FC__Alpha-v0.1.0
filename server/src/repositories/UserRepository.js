const BaseRepository = require('./BaseRepository');
const User = require('../models/User');

/**
 * 👤 USER REPOSITORY - Gestione accesso dati User
 * 
 * 📝 RESPONSABILITÀ:
 * - Operazioni CRUD su User
 * - Query specifiche per autenticazione
 * - Ricerca utenti per email, username, ecc.
 */
class UserRepository extends BaseRepository {

    constructor() {
        super(User);
    }

    // =============================
    // 🎯 METODI SPECIFICI PER USER
    // =============================

    /**
     * 🔍 Trova utente per email
     * @param {string} email - Email utente
     * @returns {Object|null} Utente o null
     */
    async findByEmail(email) {
        return this.findOne({ email });
    }

    /**
     * 🔍 Trova utente per username
     * @param {string} username - Username utente
     * @returns {Object|null} Utente o null
     */
    async findByUsername(username) {
        return this.findOne({ username });
    }

    /**
     * 🔍 Trova utenti attivi
     * @returns {Array} Lista utenti attivi
     */
    async findActiveUsers() {
        return this.findAll({
            isActive: true,
            isDeleted: { $ne: true }
        }, {
            sort: { username: 1 },
            select: 'username email isActive createdAt'
        });
    }

    /**
     * Verifica se email esiste già
     * @param {string} email - Email da verificare
     * @param {string} excludeId - ID utente da escludere (per update)
     * @returns {boolean} True se email già in uso
     */
    async emailExists(email, excludeId = null) {
        const filter = { email };
        if (excludeId) {
            filter._id = { $ne: excludeId };
        }
        return this.exists(filter);
    }

    /**
     * Verifica se username esiste già
     * @param {string} username - Username da verificare
     * @param {string} excludeId - ID utente da escludere (per update)
     * @returns {boolean} True se username già in uso
     */
    async usernameExists(username, excludeId = null) {
        const filter = { username };
        if (excludeId) {
            filter._id = { $ne: excludeId };
        }
        return this.exists(filter);
    }

    /**
     * Aggiorna ultimo accesso
     * @param {string} userId - ID utente
     * @returns {Object|null} Utente aggiornato
     */
    async updateLastLogin(userId) {
        return this.updateById(userId, {
            lastLogin: new Date()
        });
    }
}

module.exports = UserRepository;