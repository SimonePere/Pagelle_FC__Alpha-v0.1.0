// services/NewsService.js

// 🎯 REPOSITORY PATTERN - Accesso dati tramite Repository
const {
    NewsRepository,
    TeamRepository
} = require('../repositories');

const AppError = require('../utils/AppError');
const NewsGenerator = require('../utils/NewsGenerator');

/**
 * NEWS SERVICE
 * Gestisce tutta la business logic per le notizie generate dal sistema:
 * - Creazione e gestione news con auto-generazione
 * - Analisi eventi (match creation, completion, leaderboard changes)
 * - Recupero news filtrate per team e categoria
 * - Cache integration per performance
 * - Template-based news generation
 */

// ==============================
// SERVICE -> LOGICA BUSINESS 
// ==============================

class NewsService {
    constructor() {
        this.newsGenerator = new NewsGenerator();
        this.newsRepository = new NewsRepository();
        this.teamRepository = new TeamRepository();
    }


    /**
     * Crea un nuovo news sui seguenti eventi:
     * - Creazione match
     * - Completamento match
     * - Cambiamenti leaderboard
     * @param {string} teamId - ID del Team che crea il match
     * @param {Object} newsData - Dati della news relativa al match
     * @returns {Promise<Object>} News creata
     */

    async createNewsOnCreateMatch(newsData) {
        const { field, date, playersCount, notes, teamMemberIds } = newsData;

        // TODO: aggiungere logica per varianti di news:
        // - news diversa per numero partecipanti
        // - meteo diverso

        try {
            // Prepariamo l'oggetto per creare la news
            newsToGenerate = {
                teamId: teamId,
                field: field || 'campo',
                playersCount: playersCount || teamMemberIds?.length || 0,
                date: new Date(date).toLocaleDateString('it-IT'),
                notes: notes,
                teamMemberIds: teamMemberIds,
                notes: notes || ''
            }

            // Diamo l'oggetto creato al generatore per ottenere il testo della news
            const newsData =
                this.newsGenerator.generateMatchCreationNews(newsToGenerate);

            // Crea oggetto news
            const news = {
                teamId: teamId,
                category: 'match_creation',
                title: '⚽ Nuova News match creata!',
                content: newsData,
                priority: 'normal',
                icon: '⚽',
                style: 'primary',
                relatedEntityId: newsToGenerate._id,
                relatedEntityType: 'match',
                isRead: false,
                createdAt: new Date()
            };

            // Salva nel database
            const savedNews = await this.createNews(news);
            console.log('✅ Create-Match-News created successfully:', savedNews._id);

            return savedNews;

        } catch (error) {
            console.error('❌ Error handling match creation news:', error);
            throw error;
        }


    }


    /**
     * 📊 GESTIONE EVENTI MATCH COMPLETION
     * Genera e salva notizie quando un match viene completato con i voti
     * @param {Object} completionData - Dati del match completato
     * @returns {Promise<News>} News generata e salvata
     */
    async createNewsOnCompleteMatch(completitionData) {

        try {
            const { matchId, teamId, totalPlayers, totalGoals, totalAssists, playerCards } = completitionData;

            // Converti playerCards in array se necessario
            const playerArray = Array.isArray(playerCards) ? playerCards : Object.values(playerCards || {});

            // Placeholder comuni
            const commonPlaceholders = {
                totalPlayers,
                matchType: totalPlayers >= 10 ? '11vs11' : totalPlayers >= 6 ? '7vs7' : '5vs5',
                totalGoals,
                totalAssists,
                playersCount: totalPlayers
            };

            // Ordina per rating (dal più alto al più basso)
            const sortedByRating = playerArray.sort((a, b) => b.averageRating - a.averageRating);

            // Trova migliore e peggiore
            const bestPlayer = sortedByRating[0];
            const worstPlayer = sortedByRating[sortedByRating.length - 1];

            // Trova chi non ha votato (rating = 0)
            const nonVoters = playerArray.filter(player => player.averageRating === 0);

            // Placeholder specifici
            const specificPlaceholders = {
                ...commonPlaceholders,
                teamAverage: teamAverage.toFixed(1),
                bestPlayerName: bestPlayer?.name || 'Sconosciuto',
                bestPlayerRating: bestPlayer?.averageRating?.toFixed(1) || '0.0',
                worstPlayerName: worstPlayer?.name || 'Sconosciuto',
                worstPlayerRating: worstPlayer?.averageRating?.toFixed(1) || '0.0',
                nonVotersCount: nonVoters.length,
                nonVotersList: nonVoters.map(p => p.name).join(', '),
                playersWithGoals: playerArray.filter(p => p.goals > 0).length,
                playersWithAssists: playerArray.filter(p => p.assists > 0).length
            };

            // Genera il testo della news
            const newsText = this.newsGenerator.generateMatchCompletedNews(specificPlaceholders);

            // Crea oggetto news
            const newsData = {
                teamId: teamId,
                category: 'match_completed',
                title: '🏆 Match completato!',
                content: newsText,
                priority: 'high',
                icon: '🏆',
                style: 'success',
                relatedEntityId: matchId,
                relatedEntityType: 'match',
                isRead: false,
                createdAt: new Date()
            };

            // Salva nel database
            const savedNews = await this.createNews(newsData);
            console.log('✅ Match completion news created successfully:', savedNews._id);

            return savedNews;
        } catch (error) {
            console.error('❌ Error handling match completion news:', error);
            throw error;
        }



    }

    /**
     * 📈 GESTIONE EVENTI LEADERBOARD CHANGES
     * Genera e salva notizie quando ci sono cambiamenti significativi in classifica
     * @param {Object} leaderboardData - Dati dei cambiamenti in classifica
     * @returns {Promise<News>} News generata e salvata
     */
    async createNewsOnLeaderboardChanges(leaderboardData) {
        try {
            console.log('📈 Generating news for leaderboard changes:', leaderboardData.teamId);

            const {
                teamId,
                topPerformers,
                underPerformers,
                newLeader,
                biggestGainer,
                totalPlayers,
                averageTeamRating
            } = leaderboardData;

            // Crea placeholder per il template  
            const placeholders = {
                teamId,
                totalPlayers: totalPlayers || 0,
                averageTeamRating: averageTeamRating?.toFixed(1) || '0.0',
                newLeaderName: newLeader?.name || 'Il giocatore',
                newLeaderRating: newLeader?.averageRating?.toFixed(1) || '0.0',
                biggestGainerName: biggestGainer?.name || 'Il giocatore',
                biggestGainerImprovement: biggestGainer?.improvement?.toFixed(1) || '0.0',
                topPerformersCount: topPerformers?.length || 0,
                topPerformersList: topPerformers?.map(p => `${p.name} (${p.averageRating?.toFixed(1)})`).join(', ') || '',
                underPerformersCount: underPerformers?.length || 0,
                underPerformersList: underPerformers?.map(p => `${p.name} (${p.averageRating?.toFixed(1)})`).join(', ') || ''
            };

            // Genera il testo della news
            const newsText = this.newsGenerator.generateLeaderboardNews(placeholders);

            // Crea oggetto news
            const newsData = {
                teamId: teamId,
                category: 'leaderboard',
                title: '📊 Aggiornamento classifica!',
                content: newsText,
                priority: 'medium',
                icon: '📊',
                style: 'info',
                relatedEntityId: null,
                relatedEntityType: 'leaderboard',
                isRead: false,
                createdAt: new Date()
            };

            // Salva nel database
            const savedNews = await this.createNews(newsData);
            console.log('✅ Leaderboard news created successfully:', savedNews._id);

            return savedNews;
        } catch (error) {
            console.error('❌ Error handling leaderboard news:', error);
            throw error;
        }
    }

    /**
     * 👤 ANALIZZA E GENERA NEWS PER CREAZIONE PLAYER CARD
     * Analizza dati player card completata e genera array di news items
     * @param {Object} playerCardData - Dati della player card {playerId, overallRating, consensusPosition, attributes}
     * @returns {Promise<Object>} {success, generated, count, metadata}
     */
    async createNewsOnPlayerCardCreation(playerCardData) {
        try {
            console.log('👤 Analyzing player card creation for news generation:', playerCardData.playerId);

            const {
                playerId,
                overallRating,
                consensusPosition,
                attributes,
                playerName,
                position
            } = playerCardData;

            // Crea placeholder per il template
            const placeholders = {
                playerId,
                teamId,
                playerName: playerName || 'Nuovo giocatore',
                position: position || 'Non specificato',
                favoriteNumber: favoriteNumber || 'N/A',
                overallRating: overallRating || 0,
            };

            // Genera il testo della news
            const newsText = this.newsGenerator.generatePlayerCardCreationNews(placeholders);

            // Crea oggetto news
            const newsData = {
                teamId: teamId,
                category: 'playercard_creation',
                title: '👤 Nuova player card creata!',
                content: newsText,
                priority: 'low',
                icon: '👤',
                style: 'secondary',
                relatedEntityId: playerId,
                relatedEntityType: 'playercard',
                isRead: false,
                createdAt: new Date()
            };

            // Salva nel database
            const savedNews = await this.createNews(newsData);
            console.log('✅ Player card creation news created successfully:', savedNews._id);

            return savedNews;
        }

        catch (error) {
            console.error('❌ Error handling player card creation news:', error);
            throw error;
        }
    }




    /**
     * ======= SERVICE NEWS ESCLUSIVI DI CHIAMATE API ======
     * 
     * Siccome le news vengono create internamente dal sistema,
     * Le API servono principalmente per il recupero delle stesse, che
     * vengono appunto create dal newsgenerator e salvate nel database.
    /**
     
    

    * Recupera le news recenti per un team specifico
    * @param {string} teamId - ID del team
    * @param {number} limit - Numero massimo di news da recuperare
    * @returns {Promise<Object>} Array di news con metadata
    */
    async getRecentNews(teamId, limit = 20) {
        // Input validation
        teamId = this.validateTeamId(teamId);

        if (limit > 50) {
            throw new AppError('Limit cannot exceed 50', 400);
        }

        try {
            // Verifica che il team esista
            const team = await this.teamRepository.findById(teamId);
            if (!team) {
                throw new AppError('Team not found', 404);
            }

            // Usa metodo esistente del repository
            const news = await this.newsRepository.findFreshNewsByTeam(teamId, limit);

            return {
                success: true,
                data: news,
                count: news.length,
                teamId: teamId
            };

        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError(`Failed to fetch recent news: ${error.message}`, 500);
        }
    }


    /**
    * Recupera le news un team specifico con opzioni anche per categoria e priorità
    * @param {string} teamId - ID del team
    * @param {Object} options - Opzioni {limit, category, priority}
    * @returns {Promise<Object>} Array di news con metadata
    */
    async getNewsByCategory(teamId, options = {}) {
        // Input validation
        teamId = this.validateTeamId(teamId);

        const { limit = 10, category = null, priority = null } = options;

        if (limit > 50) {
            throw new AppError('Limit cannot exceed 50', 400);
        }

        try {
            // Verifica che il team esista
            const team = await this.teamRepository.findById(teamId);
            if (!team) {
                throw new AppError('Team not found', 404);
            }

            let news = [];

            // Filtra per categoria se specificata
            if (category) {
                news = await this.newsRepository.findNewsByCategory(teamId, category, limit);
            }
            // Filtra per priorità se specificata
            else if (priority) {
                news = await this.newsRepository.findNewsByPriority(teamId, priority, limit);
            }
            // Altrimenti news generiche del team
            else {
                news = await this.newsRepository.findFreshNewsByTeam(teamId, limit);
            }

            return {
                success: true,
                data: news,
                count: news.length,
                teamId: teamId,
                filters: { category, priority }
            };

        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError(`Failed to fetch team news: ${error.message}`, 500);
        }
    }
}

module.exports = NewsService;





