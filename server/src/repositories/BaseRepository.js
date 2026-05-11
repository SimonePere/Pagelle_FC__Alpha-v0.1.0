/**
 * BASE REPOSITORY - Classe madre per tutti i Repository
 * 
 * COSA FA IL REPOSITORY PATTERN:
 * Il Repository Pattern separa la logica di accesso ai dati (MongoDB/Mongoose) 
 * dalla business logic nei Service. Invece di:
 * 
 * Service -> Model (Diretto)
 * 
 * Ora abbiamo:
 * Service -> Repository -> Model
 * 
 * VANTAGGI:
 * - Separazione delle responsabilità
 * - Facilita i test (possiamo mockare i repository)
 * - Centralizza operazioni database comuni
 * - Rende il codice più modulare e manutenibile
 * 
 * COME FUNZIONA:
 * Ogni entità (User, Match, ecc.) avrà il suo Repository che estende BaseRepository.
 * I Service useranno i Repository invece di accedere direttamente ai Model.
 */
class BaseRepository {

    /**
     * Costruttore - inizializza il repository con il model Mongoose
     * @param {Object} model - Model Mongoose (es. User, Match, ecc.)
     */
    constructor(model) {
        this.model = model;
    }

    // ========================
    // 📋 OPERAZIONI CRUD BASE
    // ========================

    /**
     * 🔍 Trova tutti i documenti
     * @param {Object} filter - Filtri MongoDB (opzionale)
     * @param {Object} options - Opzioni query (sort, limit, populate, ecc.)
     * @returns {Array} Array di documenti
     */
    async findAll(filter = {}, options = {}) {
        try {
            let query = this.model.find(filter);

            // Applica opzioni se presenti
            if (options.sort) query = query.sort(options.sort);
            if (options.limit) query = query.limit(options.limit);
            if (options.skip) query = query.skip(options.skip);
            if (options.populate) query = query.populate(options.populate);
            if (options.select) query = query.select(options.select);

            return await query.exec();
        } catch (error) {
            throw new Error(`Errore findAll in ${this.model.modelName}: ${error.message}`);
        }
    }

    /**
     * 🔍 Trova un documento per ID
     * @param {string} id - ID del documento
     * @param {Object} options - Opzioni query (populate, select, ecc.)
     * @returns {Object|null} Documento trovato o null
     */
    async findById(id, options = {}) {
        try {
            let query = this.model.findById(id);

            if (options.populate) query = query.populate(options.populate);
            if (options.select) query = query.select(options.select);

            return await query.exec();
        } catch (error) {
            throw new Error(`Errore findById in ${this.model.modelName}: ${error.message}`);
        }
    }

    /**
     * 🔍 Trova un documento con filtri
     * @param {Object} filter - Filtri MongoDB
     * @param {Object} options - Opzioni query
     * @returns {Object|null} Primo documento trovato o null
     */
    async findOne(filter, options = {}) {
        try {
            let query = this.model.findOne(filter);

            if (options.populate) query = query.populate(options.populate);
            if (options.select) query = query.select(options.select);

            return await query.exec();
        } catch (error) {
            throw new Error(`Errore findOne in ${this.model.modelName}: ${error.message}`);
        }
    }

    /**
     * Crea un nuovo documento
     * @param {Object} data - Dati del documento da creare
     * @returns {Object} Documento creato
     */
    async create(data) {
        try {
            const document = new this.model(data);
            return await document.save();
        } catch (error) {
            throw new Error(`Errore create in ${this.model.modelName}: ${error.message}`);
        }
    }

    /**
     * Aggiorna un documento per ID
     * @param {string} id - ID del documento
     * @param {Object} updateData - Dati di aggiornamento
     * @param {Object} options - Opzioni aggiornamento
     * @returns {Object|null} Documento aggiornato o null
     */
    async updateById(id, updateData, options = {}) {
        try {
            const defaultOptions = {
                new: true,           // Ritorna il documento aggiornato
                runValidators: true  // Esegue le validazioni Mongoose
            };

            return await this.model.findByIdAndUpdate(
                id,
                updateData,
                { ...defaultOptions, ...options }
            );
        } catch (error) {
            throw new Error(`Errore updateById in ${this.model.modelName}: ${error.message}`);
        }
    }

    /**
     * Aggiorna uno o più documenti con filtri
     * @param {Object} filter - Filtri per trovare i documenti
     * @param {Object} updateData - Dati di aggiornamento
     * @param {Object} options - Opzioni aggiornamento
     * @returns {Object} Risultato dell'operazione
     */
    async updateMany(filter, updateData, options = {}) {
        try {
            return await this.model.updateMany(filter, updateData, options);
        } catch (error) {
            throw new Error(`Errore updateMany in ${this.model.modelName}: ${error.message}`);
        }
    }

    /**
     * Elimina un documento per ID
     * @param {string} id - ID del documento
     * @returns {Object|null} Documento eliminato o null
     */
    async deleteById(id) {
        try {
            return await this.model.findByIdAndDelete(id);
        } catch (error) {
            throw new Error(`Errore deleteById in ${this.model.modelName}: ${error.message}`);
        }
    }

    /**
     * Elimina uno o più documenti con filtri
     * @param {Object} filter - Filtri per trovare i documenti
     * @returns {Object} Risultato dell'operazione (deletedCount)
     */
    async deleteMany(filter) {
        try {
            return await this.model.deleteMany(filter);
        } catch (error) {
            throw new Error(`Errore deleteMany in ${this.model.modelName}: ${error.message}`);
        }
    }

    /**
     * Elimina un singolo documento con filtri
     * @param {Object} filter - Filtri per trovare il documento
     * @returns {Object} Risultato dell'operazione
     */
    async deleteOne(filter) {
        try {
            return await this.model.deleteOne(filter);
        } catch (error) {
            throw new Error(`Errore deleteOne in ${this.model.modelName}: ${error.message}`);
        }
    }

    /**
     * Trova e aggiorna un documento
     * @param {Object} filter - Filtri per trovare il documento
     * @param {Object} update - Aggiornamento da applicare
     * @param {Object} options - Opzioni (new: true, upsert, ecc.)
     * @returns {Object|null} Documento aggiornato o null
     */
    async findOneAndUpdate(filter, update, options = {}) {
        try {
            return await this.model.findOneAndUpdate(filter, update, options);
        } catch (error) {
            throw new Error(`Errore findOneAndUpdate in ${this.model.modelName}: ${error.message}`);
        }
    }

    // ===========================
    // 📊 OPERAZIONI AGGREGAZIONE
    // ===========================

    /**
     * Conta documenti che matchano i filtri
     * @param {Object} filter - Filtri MongoDB
     * @returns {number} Numero di documenti
     */
    async count(filter = {}) {
        try {
            return await this.model.countDocuments(filter);
        } catch (error) {
            throw new Error(`Errore count in ${this.model.modelName}: ${error.message}`);
        }
    }

    /**
     * Alias per count (compatibilità)
     */
    async countDocuments(filter = {}) {
        return this.count(filter);
    }

    /**
     * Esegue aggregazione personalizzata
     * @param {Array} pipeline - Pipeline di aggregazione MongoDB
     * @returns {Array} Risultati dell'aggregazione
     */
    async aggregate(pipeline) {
        try {
            return await this.model.aggregate(pipeline);
        } catch (error) {
            throw new Error(`Errore aggregate in ${this.model.modelName}: ${error.message}`);
        }
    }

    // ========================
    // 🔧 OPERAZIONI UTILITY
    // ========================

    /**
     * Verifica se esiste un documento con i filtri specificati
     * @param {Object} filter - Filtri MongoDB
     * @returns {boolean} True se esiste, false altrimenti
     */
    async exists(filter) {
        try {
            const count = await this.model.countDocuments(filter);
            return count > 0;
        } catch (error) {
            throw new Error(`Errore exists in ${this.model.modelName}: ${error.message}`);
        }
    }

    /**
     * Trova documenti con paginazione
     * @param {Object} filter - Filtri MongoDB
     * @param {Object} options - Opzioni (page, limit, sort, populate, ecc.)
     * @returns {Object} Oggetto con documents, totalPages, currentPage, ecc.
     */
    async findWithPagination(filter = {}, options = {}) {
        try {
            const {
                page = 1,
                limit = 10,
                sort = { createdAt: -1 },
                populate = null,
                select = null
            } = options;

            const skip = (page - 1) * limit;
            const totalDocuments = await this.model.countDocuments(filter);
            const totalPages = Math.ceil(totalDocuments / limit);

            let query = this.model.find(filter)
                .sort(sort)
                .skip(skip)
                .limit(limit);

            if (populate) query = query.populate(populate);
            if (select) query = query.select(select);

            const documents = await query.exec();

            return {
                documents,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalDocuments,
                    limit,
                    hasNext: page < totalPages,
                    hasPrev: page > 1
                }
            };
        } catch (error) {
            throw new Error(`Errore findWithPagination in ${this.model.modelName}: ${error.message}`);
        }
    }

    // ===============================
    // 🏷️ METODI PER OVERRIDE CUSTOM
    // ===============================

    /**
     * Salva un documento modificato
     * @param {Object} document - Documento da salvare
     * @returns {Object} Documento salvato
     */
    async save(document) {
        try {
            return await document.save();
        } catch (error) {
            throw new Error(`Errore save in ${this.model.modelName}: ${error.message}`);
        }
    }

    /**
     * Conta documenti con filtro
     * @param {Object} filter - Filtri MongoDB
     * @returns {number} Numero di documenti
     */
    async countDocuments(filter = {}) {
        try {
            return await this.model.countDocuments(filter);
        } catch (error) {
            throw new Error(`Errore countDocuments in ${this.model.modelName}: ${error.message}`);
        }
    }

    /**
     * Verifica se esistono documenti con filtro
     * @param {Object} filter - Filtri MongoDB
     * @returns {boolean} True se esistono documenti
     */
    async exists(filter = {}) {
        try {
            const document = await this.model.findOne(filter).select('_id').lean();
            return document !== null;
        } catch (error) {
            throw new Error(`Errore exists in ${this.model.modelName}: ${error.message}`);
        }
    }

    // ==============================
    // 🔍 METODI AGGREGATION E STATS
    // ==============================

    /**
     * Esegue aggregation pipeline
     * @param {Array} pipeline - Array di stage MongoDB aggregation
     * @returns {Array} Risultati aggregation
     */
    async aggregate(pipeline) {
        try {
            return await this.model.aggregate(pipeline);
        } catch (error) {
            throw new Error(`Errore aggregate in ${this.model.modelName}: ${error.message}`);
        }
    }

    /**
     * 🔍 Metodo da sovrascrivere nei repository specifici per operazioni custom
     * Es: UserRepository può avere findByEmail, MatchRepository può avere findByDate, ecc.
     */

    // I repository specifici estenderanno questa classe e aggiungeranno metodi personalizzati
    // Es: async findByEmail(email) { return this.findOne({ email }); }
}

module.exports = BaseRepository;