/**
 * 🧠 MEMORY CACHE ADAPTER
 * 
 * Gestisce cache in memoria del processo Node.js
 * - Pro: Zero setup, velocissimo, gratis
 * - Contro: Cache si perde al restart server
 * 
 * Utilizzato come fallback e per development
 */

class MemoryAdapter {
    constructor() {
        // Map per salvare i dati effettivi
        this.cache = new Map();

        // Map per gestire i timer di scadenza
        this.timers = new Map();

        // Statistiche per monitoring
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0
        };

        console.log('📦 Adapter Cache Memoria inizializzato con successo');
        console.log('💡 ATTENZIONE: Cache verrà resettata al riavvio del server');
    }

    /**
     * Salva un valore in cache con TTL
     * @param {string} key - Chiave univoca per il cache
     * @param {any} value - Valore da salvare (object, array, string, etc.)
     * @param {number} ttlSeconds - Time To Live in secondi
     */
    async set(key, value, ttlSeconds = 3600) {
        try {
            // Salva il dato con metadata
            this.cache.set(key, {
                data: value,
                createdAt: Date.now(),
                ttl: ttlSeconds
            });

            // Cancella timer precedente se esiste
            if (this.timers.has(key)) {
                clearTimeout(this.timers.get(key));
            }

            // Imposta timer per auto-cancellazione
            const timer = setTimeout(() => {
                this.cache.delete(key);
                this.timers.delete(key);
            }, ttlSeconds * 1000);

            this.timers.set(key, timer);
            this.stats.sets++;
            return true;
        } catch (error) {
            console.error('❌ Memory cache SET error:', error.message);
            return false;
        }
    }

    /**
     * Recupera un valore dalla cache
     * @param {string} key - Chiave del cache
     * @returns {any|null} Il valore salvato o null se non trovato/scaduto
     */
    async get(key) {
        try {
            const cached = this.cache.get(key);

            if (cached) {
                this.stats.hits++;
                return cached.data;
            }

            this.stats.misses++;
            return null;
        } catch (error) {
            console.error('❌ Memory cache GET error:', error.message);
            this.stats.misses++;
            return null;
        }
    }

    /**
     * Cancella una chiave specifica dalla cache
     * @param {string} key - Chiave da cancellare
     */
    async delete(key) {
        try {
            const existed = this.cache.has(key);

            // Rimuovi dalla cache
            this.cache.delete(key);

            // Cancella timer se esiste
            if (this.timers.has(key)) {
                clearTimeout(this.timers.get(key));
                this.timers.delete(key);
            }

            if (existed) {
                this.stats.deletes++;
            }

            return true;
        } catch (error) {
            console.error('❌ Memory cache DELETE error:', error.message);
            return false;
        }
    }

    /**
     * Invalida tutte le chiavi che matchano un pattern (supporta wildcard *)
     * @param {string} pattern - Pattern con wildcard (es: "user:*", "cache:user:123:*")
     * @returns {number} Numero di chiavi eliminate
     */
    async invalidatePattern(pattern) {
        try {
            const keysToDelete = [];

            // Converti pattern wildcard in RegExp
            // Esempio: "leaderboard:rating:team123:*" → /^leaderboard:rating:team123:.*$/
            const escapedPattern = pattern
                .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape caratteri speciali regex
                .replace(/\\\*/g, '.*'); // Converti \* in .*
            const regex = new RegExp(`^${escapedPattern}$`);

            // Trova tutte le chiavi che matchano il pattern
            for (const key of this.cache.keys()) {
                if (regex.test(key)) {
                    keysToDelete.push(key);
                }
            }

            // Cancella tutte le chiavi trovate
            for (const key of keysToDelete) {
                await this.delete(key);
            }

            return keysToDelete.length;
        } catch (error) {
            console.error('❌ Memory cache INVALIDATE error:', error.message);
            return 0;
        }
    }

    /**
     * Cancella tutta la cache
     */
    async flush() {
        try {
            // Cancella tutti i timer
            for (const timer of this.timers.values()) {
                clearTimeout(timer);
            }

            const size = this.cache.size;
            this.cache.clear();
            this.timers.clear();

            console.log(`🧽 Cache FLUSH: ${size} keys cleared`);
            return true;
        } catch (error) {
            console.error('❌ Memory cache FLUSH error:', error.message);
            return false;
        }
    }

    /**
     * Restituisce statistiche del cache
     */
    getStats() {
        const memoryUsage = process.memoryUsage();

        return {
            type: 'memory',
            size: this.cache.size,
            activeTimers: this.timers.size,
            stats: { ...this.stats },
            hitRate: this.stats.hits + this.stats.misses > 0
                ? ((this.stats.hits / (this.stats.hits + this.stats.misses)) * 100).toFixed(2)
                : 0,
            memoryUsage: {
                heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
                heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB'
            },
            keys: Array.from(this.cache.keys()).slice(0, 10) // Primi 10 per debug
        };
    }

    /**
     * Cleanup delle risorse (chiamato al shutdown)
     */
    destroy() {
        console.log('🛑 Memory Cache Adapter shutting down...');
        this.flush();
    }
}

module.exports = MemoryAdapter;