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

        try {
            const { field, date, playersCount, teamId } = newsData;

            // TODO: aggiungere logica per varianti di news:
            // - news diversa per numero partecipanti
            // - meteo diverso
            // ✅ Genera news multiple per creazione match
            const newsItems = [];

            console.log("DEBUG - createNewsOnCreateMatch === Tutto il newsData ricevuto:", newsData);

            // Helper per formattare la data in italiano
            const formatDateItalian = (dateString) => {
                const months = [
                    'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
                    'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'
                ];
                const dateObj = new Date(dateString);
                const day = dateObj.getDate();
                const month = months[dateObj.getMonth()];
                return `${day} ${month}`;
            };

            // Helper per descrizione tipo di partita
            const getPlayersTypeDescription = (playersCount) => {
                if (playersCount <= 5) return 'calcio a 5';
                if (playersCount <= 8) return 'calcio a 8';
                return 'calcio a 11';
            };

            // Placeholder comuni
            const commonPlaceholders = {
                teamId: teamId,
                playersCount: playersCount, // campo a 5, 8, 11
                playersType: getPlayersTypeDescription(playersCount),
                date: formatDateItalian(date),
                field: field,
            };

            // 1. News principale creazione
            const mainNews = this.newsGenerator.generateMatchCreationNews({
                ...commonPlaceholders,
                type: 'general'
            });

            console.log('xxxxxx   ==>>>  DEBUG CREATEnewsOnCreateMatch COMMON PLACEHOLDERS :', commonPlaceholders);


            if (mainNews) {
                const mainNewsData = {
                    teamId: teamId,
                    text: mainNews.text,
                    category: mainNews.category,
                    type: mainNews.type,
                    priority: mainNews.priority,
                    icon: mainNews.icon,
                    style: mainNews.style,
                    eventData: newsData
                };
                const savedMainNews = await this.newsRepository.create(mainNewsData);
                newsItems.push(savedMainNews);
            }

            // 2. News stagionale/tempo se appropriato
            const currentMonth = new Date().getMonth() + 1; // 1-12

            // Mapping diretto mese -> type specifico
            const monthlyTypes = [
                'weather_january',    // 1
                'weather_february',   // 2
                'weather_march',      // 3
                'weather_april',      // 4
                'weather_may',        // 5
                'weather_june',       // 6
                'weather_july',       // 7
                'weather_august',     // 8
                'weather_september',  // 9
                'weather_october',    // 10
                'weather_november',   // 11
                'weather_december'    // 12
            ];

            const seasonalType = monthlyTypes[currentMonth - 1]; // -1 perché array è 0-indexed

            if (seasonalType && Math.random() < 0.3) { // 30% chance
                const seasonalNews = this.newsGenerator.generateMatchCreationNews({
                    ...commonPlaceholders,
                    type: seasonalType
                });
                if (seasonalNews) {
                    const seasonalNewsData = {
                        teamId: teamId,
                        text: seasonalNews.text,
                        category: seasonalNews.category,
                        type: seasonalNews.type,
                        priority: seasonalNews.priority,
                        icon: seasonalNews.icon,
                        style: seasonalNews.style,
                        eventData: { matchId: null, field, date, playersCount }
                    };
                    const savedSeasonalNews = await this.newsRepository.create(seasonalNewsData);
                    newsItems.push(savedSeasonalNews);
                }
            }



            console.log(`✅ Generated ${newsItems.length} match creation news items`);
            return newsItems; // Ritorna tutto l'array

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
            const { matchId, teamId, teamName, teamMemberIds, playersCount, field, date, totalGoals, totalAssists, playerCards } = completitionData;

            console.log("DEBUG - createNewsOnCompleteMatch === Tutto il completitionData ricevuto:", completitionData);

            // Calcola totalPlayers contando i teamMemberIds effettivi
            const totalPlayers = teamMemberIds?.length || 0;

            // Converti playerCards in array se necessario e validazione
            const playerArray = Array.isArray(playerCards) ? playerCards : Object.values(playerCards || {});

            // Validazione: se non ci sono giocatori, evita calcoli
            if (!playerArray || playerArray.length === 0) {
                console.log('⚠️ Nessun giocatore trovato per generare news di completamento match');
                return [];
            }

            // Helper per formattare la data in italiano
            const formatDateItalian = (dateString) => {
                const months = [
                    'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
                    'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'
                ];
                const dateObj = new Date(dateString);
                const day = dateObj.getDate();
                const month = months[dateObj.getMonth()];
                return `${day} ${month}`;
            };

            // Helper per descrizione tipo di partita
            const getPlayersTypeDescription = (playersCount) => {
                if (playersCount <= 5) return 'calcio a 5';
                if (playersCount <= 8) return 'calcio a 8';
                return 'calcio a 11';
            };



            // Placeholder comuni
            const commonPlaceholders = {
                teamName,
                teamMemberIds: teamMemberIds,
                field: field,
                totalPlayers,
                matchType: playersCount >= 10 ? '11vs11' : playersCount >= 6 ? '8vs8' : '5vs5',
                totalGoals,
                totalAssists,
                playersCount: playersCount,
                playersType: getPlayersTypeDescription(playersCount),
                date: formatDateItalian(date)

            };

            // Ordina per rating (dal più alto al più basso)
            const sortedByRating = playerArray.sort((a, b) => b.averageRating - a.averageRating);

            // Calcola media squadra - VALIDAZIONE per evitare NaN
            const teamAverage = playerArray.length > 0
                ? playerArray.reduce((sum, p) => sum + (p.averageRating || 0), 0) / playerArray.length
                : 0;

            // Trova migliore e peggiore
            const bestPlayer = sortedByRating[0];
            const worstPlayer = sortedByRating[sortedByRating.length - 1];

            // Trova chi non ha votato (rating = 0)
            const nonVoters = playerArray.filter(player => player.averageRating === 0);

            // Placeholder specifici
            const specificPlaceholders = {
                ...commonPlaceholders,
                teamAverage: (isNaN(teamAverage) ? 0 : teamAverage).toFixed(1),
                bestPlayerName: bestPlayer?.name || 'Sconosciuto',
                bestPlayerRating: bestPlayer?.averageRating ? bestPlayer.averageRating.toFixed(1) : '0.0',
                worstPlayerName: worstPlayer?.name || 'Sconosciuto',
                worstPlayerRating: worstPlayer?.averageRating ? worstPlayer.averageRating.toFixed(1) : '0.0',
                nonVotersCount: nonVoters.length,
                nonVotersList: nonVoters.map(p => p.name).join(', '),
                playersWithGoals: playerArray.filter(p => p.goals > 0).length,
                playersWithAssists: playerArray.filter(p => p.assists > 0).length
            };

            console.log('🔍 DEBUG commonPlaceholders:', commonPlaceholders);
            console.log('🔍 DEBUG specificPlaceholders:', specificPlaceholders);

            // ✅ GENERIAMO DIVERSI TIPI DI NEWS PER IL COMPLETAMENTO MATCH
            const newsItems = [];

            // 1. News principale completamento match
            const mainNews = this.newsGenerator.generateMatchCompletedNews({
                ...specificPlaceholders,
                type: 'team_performance'
            });
            if (mainNews) {
                const mainNewsData = {
                    teamId,
                    text: mainNews.text,
                    category: mainNews.category,
                    type: mainNews.type,
                    priority: mainNews.priority,
                    icon: mainNews.icon,
                    style: mainNews.style,
                    eventData: { matchId }
                };
                const savedMainNews = await this.newsRepository.create(mainNewsData);
                newsItems.push(savedMainNews);
            }


            // 2. News miglior giocatore (se esiste)
            console.log('🔍 DEBUG bestPlayer:', bestPlayer);
            console.log('🔍 DEBUG bestPlayer.averageRating:', bestPlayer ? bestPlayer.averageRating : 'Non arriva il bestplayer average rating');
            if (bestPlayer && bestPlayer.averageRating >= 7.5) {
                const bestPlayerNews = this.newsGenerator.generateMatchCompletedNews({
                    ...specificPlaceholders,
                    type: 'mvp_performance',
                    playerName: bestPlayer.name,
                    rating: bestPlayer.averageRating ? bestPlayer.averageRating.toFixed(1) : '0.0'
                });

                console.log('🔍 DEBUG bestPlayerNews:', bestPlayerNews);
                if (bestPlayerNews) {
                    const bestPlayerNewsData = {
                        teamId,
                        text: bestPlayerNews.text,
                        category: bestPlayerNews.category,
                        type: bestPlayerNews.type,
                        priority: bestPlayerNews.priority,
                        icon: bestPlayerNews.icon,
                        style: bestPlayerNews.style,
                        eventData: { matchId }
                    };
                    const savedBestPlayerNews = await this.newsRepository.create(bestPlayerNewsData);
                    newsItems.push(savedBestPlayerNews);
                }
            }

            // 3. News riassunto gol (se ci sono gol)
            if (totalGoals > 5) {
                const goalScorerCount = playerArray.filter(p => p.goals > 0).length;
                const goalsNews = this.newsGenerator.generateMatchCompletedNews({
                    ...specificPlaceholders,
                    // oppure type "high_scoring"
                    type: 'goals_fest',
                    goals: totalGoals,
                    goalScorerCount,
                    playersCount: goalScorerCount
                });
                if (goalsNews) {
                    const goalsNewsData = {
                        teamId,
                        text: goalsNews.text,
                        category: goalsNews.category,
                        type: goalsNews.type,
                        priority: goalsNews.priority,
                        icon: goalsNews.icon,
                        style: goalsNews.style,
                        eventData: { matchId }
                    };
                    const savedGoalsNews = await this.newsRepository.create(goalsNewsData);
                    newsItems.push(savedGoalsNews);
                }
            }

            // 4. News prestazione eccezionale (se 2+ giocatori con voto 8+)
            const excellentPlayers = playerArray.filter(p => p.averageRating >= 8.0);
            if (excellentPlayers.length >= 2) {
                const exceptionalNews = this.newsGenerator.generateMatchCompletedNews({
                    ...specificPlaceholders,
                    type: 'multiple_high_ratings',
                    player1: excellentPlayers[0]?.name || 'Giocatore',
                    rating1: excellentPlayers[0]?.averageRating ? excellentPlayers[0].averageRating.toFixed(1) : '0.0',
                    player2: excellentPlayers[1]?.name || 'Giocatore',
                    rating2: excellentPlayers[1]?.averageRating ? excellentPlayers[1].averageRating.toFixed(1) : '0.0',
                    player3: excellentPlayers[2]?.name || 'Giocatore',
                    rating3: excellentPlayers[2]?.averageRating ? excellentPlayers[2].averageRating.toFixed(1) : '0.0'
                });
                if (exceptionalNews) {
                    const exceptionalNewsData = {
                        teamId,
                        text: exceptionalNews.text,
                        category: exceptionalNews.category,
                        type: exceptionalNews.type,
                        priority: exceptionalNews.priority,
                        icon: exceptionalNews.icon,
                        style: exceptionalNews.style,
                        eventData: { matchId }
                    };
                    const savedExceptionalNews = await this.newsRepository.create(exceptionalNewsData);
                    newsItems.push(savedExceptionalNews);
                }
            }

            console.log(`✅ Generated ${newsItems.length} match completion news items`);


            return newsItems;


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
            const { teamId, playerId, playerName, newRating } = leaderboardData;
            console.log('📈 Generating news for leaderboard changes:', teamId);

            // 🔍 STEP 1: Recupera dati classifica tramite repository
            const [leaderboard, teamStats, topPerformers, underPerformers] = await Promise.all([
                this.newsRepository.getTeamLeaderboard(teamId, 10),
                this.newsRepository.getTeamAggregateStats(teamId),
                this.newsRepository.getTopPerformers(teamId, 8.0, 5),
                this.newsRepository.getUnderPerformers(teamId, 6.0, 3)
            ]);

            // 🧮 STEP 2: Calcola elementi chiave per le news
            const newLeader = leaderboard[0]; // Il primo della classifica
            const biggestGainer = leaderboard.find(p => p.playerId._id.toString() === playerId) || null;

            console.log('🔍 DEBUG - Leaderboard data retrieved:', {
                totalPlayers: teamStats.totalPlayers,
                averageRating: teamStats.averageTeamRating,
                newLeader: newLeader?.playerId?.name || 'None',
                topPerformersCount: topPerformers.length,
                triggeredByPlayer: playerName
            });

            // 🏗️ STEP 3: Costruisci placeholder per template
            const specificPlaceholders = {
                teamId,
                totalPlayers: teamStats.totalPlayers || 0,
                averageTeamRating: teamStats.averageTeamRating?.toFixed(1) || '0.0',
                playerName: newLeader?.playerId?.name || playerName || 'Il giocatore',
                averageRating: newLeader?.averageRating?.toFixed(1) || newRating?.toFixed(1) || '0.0',
                biggestGainerName: biggestGainer?.playerId?.name || playerName || 'Il giocatore',
                biggestGainerImprovement: newRating?.toFixed(1) || '0.0',
                topPerformersCount: topPerformers.length || 0,
                topPerformersList: topPerformers?.map(p => `${p.playerId.name} (${p.averageRating?.toFixed(1)})`).join(', ') || '',
                underPerformersCount: underPerformers.length || 0,
                underPerformersList: underPerformers?.map(p => `${p.playerId.name} (${p.averageRating?.toFixed(1)})`).join(', ') || ''
            };

            // 🎯 STEP 4: Genera news tramite template
            const newsText = this.newsGenerator.generateLeaderboardNews({
                ...specificPlaceholders,
                type: 'new_leader'
            });

            console.log('🔍 DEBUG newsText from generator:', newsText);

            // 🔍 STEP 5: Verifica output template
            if (!newsText) {
                console.log('⚠️ NewsGenerator returned null (probably duplicate), skipping...');
                return null;
            }

            // Crea oggetto news
            const newsData = {
                teamId: teamId,
                category: newsText.category,
                type: newsText.type,
                priority: newsText.priority,
                text: newsText.text,
                icon: newsText.icon,
                style: newsText.style,

                relatedEntityId: null,
                relatedEntityType: 'leaderboard',
                isRead: false,
                createdAt: new Date(),
            };

            // Salva nel database
            const savedNews = await this.newsRepository.create(newsData);
            console.log('✅ Leaderboard change news created successfully:', savedNews._id);

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
    async createNewsOnCreatePlayerCard(playerCardData) {
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
                text: newsText,
                priority: 'low',
                icon: '👤',
                style: 'secondary',
                relatedEntityId: playerId,
                relatedEntityType: 'playercard',
                isRead: false,
                createdAt: new Date()
            };

            // Salva nel database
            const savedNews = await this.newsRepository.create(newsData);
            console.log('✅ Player card creation news created successfully:', savedNews._id);

            return savedNews;
        }

        catch (error) {
            console.error('❌ Error handling player card creation news:', error);
            throw error;
        }
    }

    /**     * 👤 ANALIZZA E GENERA NEWS PER COMPLETAMENTO PLAYER CARD
     * Analizza dati player card completata e genera array di news items
     * @param {Object} playerCardData - Dati della player card {playerId, overallRating, consensusPosition, attributes}
     * @returns {Promise<Object>} {success, generated, count, metadata}
     */
    async createNewsOnCompletePlayerCard(playerCardData) { }










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





