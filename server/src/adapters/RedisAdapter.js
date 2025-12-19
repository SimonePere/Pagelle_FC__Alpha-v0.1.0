/**
 * 🚀 REDIS CACHE ADAPTER
 * 
 * Gestisce cache tramite Redis (in-memory database)
 * - Pro: Cache persistente, scalabile, multi-server
 * - Contro: Dipendenza esterna, network latency
 * 
 * API identica al MemoryAdapter - drop-in replacement!
 */

class RedisAdapter {
    constructor() {
        // Redis client sarà inizializzato lazy (quando serve)
        this.redis = null;
        this.connected = false;

        // Statistiche per monitoring
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            errors: 0
        };

        console.log('🚀 Redis Cache Adapter initialized (lazy connection)');
    }

    /**
     * Inizializza connessione Redis (lazy loading)
     * Si connette solo quando serve la prima operazione
     */
    async _initRedis() {
        if (this.redis && this.connected) {
            return true;
        }

        try {
            // Importa ioredis solo quando serve (evita errori se non installato)
            const Redis = require('ioredis');

            this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
                // Configurazione per produzione
                retryDelayOnFailover: 100,
                maxRetriesPerRequest: 3,
                lazyConnect: true,
                enableReadyCheck: false,

                // Timeout configurations
                connectTimeout: 5000,
                commandTimeout: 3000,

                // Reconnection strategy
                retryStrategy: (times) => {
                    if (times > 3) {
                        console.error('❌ Redis: Max reconnection attempts reached');
                        return null; // Stop retrying
                    }
                    const delay = Math.min(times * 50, 2000);
                    console.log(`🔄 Redis: Reconnecting in ${delay}ms (attempt ${times})`);
                    return delay;
                }
            });

            // Event handlers
            this.redis.on('connect', () => {
                this.connected = true;
                console.log('✅ Redis connected successfully');
            });

            this.redis.on('error', (error) => {
                this.connected = false;
                this.stats.errors++;
                console.error('❌ Redis error:', error.message);
            });

            this.redis.on('close', () => {
                this.connected = false;
                console.log('🔌 Redis connection closed');
            });

            // Test connection
            await this.redis.ping();
            this.connected = true;

            console.log('🎯 Redis connection established');
            return true;
        } catch (error) {
            console.error('❌ Redis initialization failed:', error.message);
            console.log('💡 Tip: Install with "npm install ioredis" and check REDIS_URL');
            this.connected = false;
            return false;
        }
    }

    /**
     * Salva un valore in Redis con TTL
     * @param {string} key - Chiave univoca per il cache
     * @param {any} value - Valore da salvare (sarà serializzato in JSON)
     * @param {number} ttlSeconds - Time To Live in secondi
     */
    async set(key, value, ttlSeconds = 3600) {
        try {
            // Assicurati che Redis sia connesso
            if (!(await this._initRedis())) {
                console.warn('⚠️ Redis not available, skipping cache SET');
                return false;
            }

            // Serializza il valore in JSON
            const serializedValue = JSON.stringify({
                data: value,
                createdAt: Date.now(),
                ttl: ttlSeconds
            });

            // Salva in Redis con TTL
            await this.redis.setex(key, ttlSeconds, serializedValue);
            this.stats.sets++;

            console.log(`✅ Redis SET: ${key} (TTL: ${ttlSeconds}s)`);
            return true;
        } catch (error) {
            console.error('❌ Redis SET error:', error.message);
            this.stats.errors++;
            return false; // Fail gracefully
        }
    }

    /**
     * Recupera un valore da Redis
     * @param {string} key - Chiave del cache
     * @returns {any|null} Il valore salvato o null se non trovato/scaduto
     */
    async get(key) {
        try {
            // Assicurati che Redis sia connesso
            if (!(await this._initRedis())) {
                this.stats.misses++;
                return null;
            }

            const cached = await this.redis.get(key);

            if (cached) {
                const parsed = JSON.parse(cached);
                this.stats.hits++;

                const age = Math.round((Date.now() - parsed.createdAt) / 1000);
                console.log(`🎯 Redis HIT: ${key} (age: ${age}s)`);
                return parsed.data;
            }

            this.stats.misses++;
            console.log(`❌ Redis MISS: ${key}`);
            return null;
        } catch (error) {
            console.error('❌ Redis GET error:', error.message);
            this.stats.errors++;
            this.stats.misses++;
            return null; // Fail gracefully
        }
    }

    /**
     * Cancella una chiave specifica da Redis
     * @param {string} key - Chiave da cancellare
     */
    async delete(key) {
        try {
            if (!(await this._initRedis())) {
                return false;
            }

            const result = await this.redis.del(key);

            if (result > 0) {
                this.stats.deletes++;
                console.log(`🗑️ Redis DELETE: ${key}`);
            }

            return true;
        } catch (error) {
            console.error('❌ Redis DELETE error:', error.message);
            this.stats.errors++;
            return false;
        }
    }

    /**
     * Invalida tutte le chiavi che matchano un pattern
     * @param {string} pattern - Pattern da cercare nelle chiavi
     */
    async invalidatePattern(pattern) {
        try {
            if (!(await this._initRedis())) {
                return 0;
            }

            // Trova tutte le chiavi che matchano il pattern
            const keys = await this.redis.keys(`*${pattern}*`);

            if (keys.length > 0) {
                // Cancella tutte le chiavi in batch
                await this.redis.del(...keys);
                this.stats.deletes += keys.length;
                console.log(`🧹 Redis INVALIDATE PATTERN: ${pattern} (${keys.length} keys deleted)`);
            }

            return keys.length;
        } catch (error) {
            console.error('❌ Redis INVALIDATE error:', error.message);
            this.stats.errors++;
            return 0;
        }
    }

    /**
     * Cancella tutto il database Redis
     */
    async flush() {
        try {
            if (!(await this._initRedis())) {
                return false;
            }

            await this.redis.flushdb();
            console.log('🧽 Redis FLUSH: Database cleared');
            return true;
        } catch (error) {
            console.error('❌ Redis FLUSH error:', error.message);
            this.stats.errors++;
            return false;
        }
    }

    /**
     * Restituisce statistiche del cache Redis
     */
    async getStats() {
        try {
            const baseStats = {
                type: 'redis',
                connected: this.connected,
                stats: { ...this.stats },
                hitRate: this.stats.hits + this.stats.misses > 0
                    ? ((this.stats.hits / (this.stats.hits + this.stats.misses)) * 100).toFixed(2)
                    : 0
            };

            if (this.connected && this.redis) {
                // Statistiche avanzate da Redis
                const info = await this.redis.info('stats');
                const memory = await this.redis.info('memory');

                return {
                    ...baseStats,
                    redisStats: {
                        totalConnections: this._extractStat(info, 'total_connections_received'),
                        totalCommands: this._extractStat(info, 'total_commands_processed'),
                        usedMemory: this._extractStat(memory, 'used_memory_human'),
                        connectedClients: this._extractStat(info, 'connected_clients')
                    }
                };
            }

            return baseStats;
        } catch (error) {
            console.error('❌ Redis STATS error:', error.message);
            return {
                type: 'redis',
                connected: false,
                error: error.message,
                stats: { ...this.stats }
            };
        }
    }

    /**
     * Estrae una statistica dal output INFO di Redis
     */
    _extractStat(info, key) {
        const regex = new RegExp(`${key}:(\\S+)`);
        const match = info.match(regex);
        return match ? match[1] : 'N/A';
    }

    /**
     * Cleanup delle risorse (chiamato al shutdown)
     */
    async destroy() {
        console.log('🛑 Redis Cache Adapter shutting down...');
        if (this.redis) {
            try {
                await this.redis.quit();
            } catch (error) {
                console.error('❌ Redis shutdown error:', error.message);
            }
        }
    }
}

module.exports = RedisAdapter;