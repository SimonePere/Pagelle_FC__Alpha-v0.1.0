/**
 * 🧠 CACHE SERVICE - IL CERVELLO DEL SISTEMA
 * 
 * Strategy Pattern per gestire diversi tipi di cache:
 * - Memory Cache (sviluppo, piccoli progetti)
 * - Redis Cache (produzione, scaling)
 * 
 * Switch tramite environment variable CACHE_TYPE
 * API unificata - zero refactoring per cambio cache!
 */

const MemoryAdapter = require('../adapters/MemoryAdapter');

class CacheService {
    constructor() {
        // Leggi tipo cache da environment (default: memory)
        this.cacheType = (process.env.CACHE_TYPE || 'memory').toLowerCase();
        this.adapter = null;

        this._initializeAdapter();

        // Setup graceful shutdown
        this._setupShutdownHandlers();
    }

    /**
     * Inizializza l'adapter appropriato based su CACHE_TYPE
     */
    _initializeAdapter() {
        console.log(`🔧 Inizializzazione Cache ${this.cacheType.toUpperCase()} in corso...`);

        switch (this.cacheType) {
            case 'redis':
                try {
                    // Lazy load RedisAdapter (evita crash se ioredis non installato)
                    const RedisAdapter = require('../adapters/RedisAdapter');
                    this.adapter = new RedisAdapter();
                    console.log('✅ Servizio Cache Redis attivo e operativo');
                } catch (error) {
                    console.error('❌ Redis adapter failed to load:', error.message);
                    console.log('🔄 Passaggio a Cache Memoria come fallback...');
                    this._fallbackToMemory();
                }
                break;

            case 'memory':
            default:
                this.adapter = new MemoryAdapter();
                console.log('✅ Servizio Cache Memoria attivo e operativo');
                break;
        }

        console.log(`🎯 Sistema Cache pronto (Tipo: ${this.adapter.constructor.name})`);
    }

    /**
     * Fallback a MemoryAdapter se Redis non disponibile
     */
    _fallbackToMemory() {
        this.cacheType = 'memory';
        this.adapter = new MemoryAdapter();
        console.log('💡 Utilizzo Cache Memoria come backup di sicurezza');
    }

    /**
     * Salva un valore in cache
     * @param {string} key - Chiave univoca
     * @param {any} value - Valore da cachare
     * @param {number} ttlSeconds - Time to live in secondi (default: 1 ora)
     * @param {string[]} tags - Tags per invalidation grouping (opzionale)
     */
    async set(key, value, ttlSeconds = 3600, tags = []) {
        try {
            // Validazione input
            if (!key || typeof key !== 'string') {
                throw new Error('Cache key must be a non-empty string');
            }

            if (ttlSeconds <= 0) {
                throw new Error('TTL must be positive');
            }

            // Aggiungi metadata per debugging/monitoring
            const enrichedValue = {
                originalData: value,
                metadata: {
                    cachedAt: new Date().toISOString(),
                    ttl: ttlSeconds,
                    tags: tags,
                    cacheType: this.cacheType
                }
            };

            const result = await this.adapter.set(key, enrichedValue, ttlSeconds);

            // Log per importante cache keys
            if (this._isImportantKey(key)) {

            }

            return result;
        } catch (error) {
            console.error('❌ CacheService SET error:', error.message);
            return false;
        }
    }

    /**
     * Recupera un valore dalla cache
     * @param {string} key - Chiave da recuperare
     * @returns {any|null} Valore originale o null se non trovato
     */
    async get(key) {
        try {
            if (!key || typeof key !== 'string') {
                return null;
            }

            const cached = await this.adapter.get(key);

            if (cached && cached.originalData !== undefined) {
                // Log per importante cache keys
                if (this._isImportantKey(key)) {
                    const age = cached.metadata ?
                        Math.round((Date.now() - new Date(cached.metadata.cachedAt).getTime()) / 1000) :
                        'unknown';

                }

                return cached.originalData;
            }

            return null;
        } catch (error) {
            console.error('❌ CacheService GET error:', error.message);
            return null;
        }
    }

    /**
     * Cancella una chiave specifica
     * @param {string} key - Chiave da cancellare
     */
    async delete(key) {
        try {
            if (!key || typeof key !== 'string') {
                return false;
            }

            const result = await this.adapter.delete(key);

            if (this._isImportantKey(key)) {

            }

            return result;
        } catch (error) {
            console.error('❌ CacheService DELETE error:', error.message);
            return false;
        }
    }

    /**
     * Invalidazione intelligente per pattern
     * Utile per invalidare gruppi di cache correlate
     * 
     * Esempi:
     * - invalidatePattern('leaderboard') → cancella tutte le classifiche
     * - invalidatePattern('team:123') → cancella tutti i dati del team 123
     * 
     * @param {string} pattern - Pattern da cercare
     */
    async invalidatePattern(pattern) {
        try {
            if (!pattern || typeof pattern !== 'string') {
                return 0;
            }

            const deletedCount = await this.adapter.invalidatePattern(pattern);

            return deletedCount;
        } catch (error) {
            console.error('❌ CacheService INVALIDATE error:', error.message);
            return 0;
        }
    }

    /**
     * Invalidazione per tag (futuro con Redis)
     * @param {string} tag - Tag da invalidare
     */
    async invalidateTag(tag) {
        // Per ora usa pattern invalidation
        // Con Redis futuro potremo implementare vero tag system
        return await this.invalidatePattern(tag);
    }

    /**
     * Cancella tutta la cache
     * ATTENZIONE: Operazione irreversibile!
     */
    async flush() {
        try {
            console.log('⚠️ Flushing entire cache...');
            const result = await this.adapter.flush();

            if (result) {
                console.log('✅ Cache flush completed');
            }

            return result;
        } catch (error) {
            console.error('❌ CacheService FLUSH error:', error.message);
            return false;
        }
    }

    /**
     * Statistiche complete del cache system
     */
    async getStats() {
        try {
            const adapterStats = await this.adapter.getStats();

            return {
                cacheType: this.cacheType,
                adapterName: this.adapter.constructor.name,
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                ...adapterStats
            };
        } catch (error) {
            console.error('❌ CacheService STATS error:', error.message);
            return {
                error: error.message,
                cacheType: this.cacheType,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Health check del cache system
     */
    async healthCheck() {
        try {
            const testKey = `healthcheck:${Date.now()}`;
            const testValue = { test: true, timestamp: Date.now() };

            // Test SET
            const setResult = await this.set(testKey, testValue, 10); // 10 sec TTL

            if (!setResult) {
                throw new Error('SET operation failed');
            }

            // Test GET
            const getValue = await this.get(testKey);

            if (!getValue || getValue.test !== true) {
                throw new Error('GET operation failed');
            }

            // Cleanup
            await this.delete(testKey);

            return {
                healthy: true,
                cacheType: this.cacheType,
                timestamp: new Date().toISOString(),
                latency: Date.now() - testValue.timestamp
            };
        } catch (error) {
            return {
                healthy: false,
                error: error.message,
                cacheType: this.cacheType,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Identifica chiavi importanti per logging specifico
     */
    _isImportantKey(key) {
        const importantPatterns = [
            'leaderboard',
            'player:',
            'team:',
            'match:',
            'stats:'
        ];

        return importantPatterns.some(pattern => key.includes(pattern));
    }

    /**
     * Setup graceful shutdown handlers
     */
    _setupShutdownHandlers() {
        const shutdownHandler = async (signal) => {
            console.log(`📡 Received ${signal}, shutting down cache service...`);

            try {
                if (this.adapter && typeof this.adapter.destroy === 'function') {
                    await this.adapter.destroy();
                }
                console.log('✅ Cache service shutdown completed');
                process.exit(0);
            } catch (error) {
                console.error('❌ Cache shutdown error:', error.message);
                process.exit(1);
            }
        };

        // Graceful shutdown per vari signals
        process.on('SIGTERM', () => shutdownHandler('SIGTERM'));
        process.on('SIGINT', () => shutdownHandler('SIGINT'));

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            console.error('💥 Uncaught Exception:', error);
            shutdownHandler('uncaughtException');
        });
    }

    /**
     * Info sulla configurazione attuale
     */
    getConfig() {
        return {
            cacheType: this.cacheType,
            adapterName: this.adapter.constructor.name,
            envVar: process.env.CACHE_TYPE,
            defaultTTL: 3600,
            version: '1.0.0'
        };
    }

    // ======================================
    // 🎯 INVALIDAZIONE INTELLIGENTE POST-VOTO
    // ======================================

    /**
     * Invalida tutti i cache delle leaderboard dopo completamento voto
     * @param {string} teamId - ID del team coinvolto
     * @returns {number} Numero di cache invalidati
     */
    async invalidateLeaderboardsAfterVote(teamId) {
        try {
            let totalInvalidated = 0;

            // Invalida tutte le leaderboard per questo team
            const patterns = [
                `leaderboard:rating:${teamId}:*`,
                `leaderboard:goals:${teamId}:*`,
                `leaderboard:assists:${teamId}:*`,
                `leaderboard:playercard:${teamId}:*`,
                `leaderboard:form:${teamId}:*`
            ];

            for (const pattern of patterns) {
                totalInvalidated += await this.invalidatePattern(pattern);
            }

            return totalInvalidated;
        } catch (error) {
            console.error(`❌ Errore invalidazione leaderboard team ${teamId}:`, error.message);
            return 0;
        }
    }

    /**
     * Invalida cache PlayerCard per giocatori coinvolti nel voto
     * @param {Array} playerIds - Array di ID giocatori votati
     * @returns {number} Numero di cache invalidati
     */
    async invalidatePlayerCardsAfterVote(playerIds = []) {
        try {
            if (!Array.isArray(playerIds) || playerIds.length === 0) {
                return 0;
            }

            let totalInvalidated = 0;

            for (const playerId of playerIds) {
                const patterns = [
                    `playercard:results:${playerId}:*`,
                    `playercard:calculation:*${playerId}*`
                ];

                for (const pattern of patterns) {
                    totalInvalidated += await this.invalidatePattern(pattern);
                }
            }

            return totalInvalidated;
        } catch (error) {
            console.error(`❌ Errore invalidazione PlayerCard:`, error.message);
            return 0;
        }
    }

    /**
     * 🎯 MATCH CACHE INVALIDATION: Pulisce cache match completed per team specifico
     * @param {string} teamId - ID del team coinvolto
     * @returns {number} Numero di cache match invalidati
     */
    async invalidateMatchCacheAfterVote(teamId) {
        try {
            let totalInvalidated = 0;

            const patterns = [
                `matches:team:${teamId}:*:completed:*`,
                `match:*:details:completed`
            ];

            for (const pattern of patterns) {
                totalInvalidated += await this.invalidatePattern(pattern);
            }

            return totalInvalidated;
        } catch (error) {
            console.error(`❌ Errore invalidazione match cache team ${teamId}:`, error.message);
            return 0;
        }
    }

    /**
     * Invalidazione completa post-voto: combina leaderboard + playercard + match
     * @param {string} teamId - ID del team
     * @param {Array} playerIds - Array ID giocatori votati
     * @returns {Object} Statistiche invalidazione
     */
    async invalidateAllAfterVote(teamId, playerIds = []) {
        try {
            const leaderboardInvalidated = await this.invalidateLeaderboardsAfterVote(teamId);
            const playerCardInvalidated = await this.invalidatePlayerCardsAfterVote(playerIds);
            const matchInvalidated = await this.invalidateMatchCacheAfterVote(teamId);

            const total = leaderboardInvalidated + playerCardInvalidated + matchInvalidated;

            if (total > 0) {
                console.log(`🧹 Cache invalidata post-voto team=${teamId} | lb=${leaderboardInvalidated} pc=${playerCardInvalidated} match=${matchInvalidated}`);
            }

            return {
                total,
                leaderboard: leaderboardInvalidated,
                playerCard: playerCardInvalidated,
                match: matchInvalidated,
                teamId,
                playerIds: playerIds.length
            };
        } catch (error) {
            console.error(`❌ Errore invalidazione completa post-voto:`, error.message);
            return { total: 0, error: error.message };
        }
    }
}

// Export singleton instance
module.exports = new CacheService();