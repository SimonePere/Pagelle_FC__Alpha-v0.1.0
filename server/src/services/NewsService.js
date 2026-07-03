// services/NewsService.js

// 🎯 REPOSITORY PATTERN - Accesso dati tramite Repository
const {
    NewsRepository,
    TeamRepository
} = require('../repositories');

const AppError = require('../utils/AppError');
const NewsGenerator = require('../utils/NewsGenerator');
const cacheService = require('./CacheService'); // 🆕 Cache invalidation per match updates


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
        this.cacheService = cacheService; // 🆕 Inizializza il servizio di cache
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


            // ✅ Genera news multiple per creazione match
            const newsItems = [];

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
                teamName: newsData.eligibleVotersNames && newsData.eligibleVotersNames.length > 0
                    ? newsData.eligibleVotersNames[0].teamName || 'Team'
                    : 'Team',
                playersCount: playersCount, // campo a 5, 8, 11
                playersType: getPlayersTypeDescription(playersCount),
                date: formatDateItalian(date),
                field: field,
            };

            // 1. News principale creazione
            const mainNews = this.newsGenerator.generateMatchCreationNews({
                ...commonPlaceholders,
                type: ['general', 'date_soon', 'field'][Math.floor(Math.random() * 3)]
            });


            if (mainNews) {
                newsItems.push({
                    teamId: teamId,
                    text: mainNews.text,
                    category: mainNews.category,
                    type: mainNews.type,
                    priority: mainNews.priority,
                    icon: mainNews.icon,
                    style: mainNews.style,
                    eventData: newsData
                });

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
                    newsItems.push({
                        teamId: teamId,
                        text: seasonalNews.text,
                        category: seasonalNews.category,
                        type: seasonalNews.type,
                        priority: seasonalNews.priority,
                        icon: seasonalNews.icon,
                        style: seasonalNews.style,
                        eventData: { matchId: null, field, date, playersCount }
                    })

                }
            }


            // NEWS PER CREAZIONE VOTINGSESSION
            // POSSIAMO utilizzare nomi dei partecipanti e possibili astenuti per news categoria: votingSession_creation con 
            // sottocategorie: session opened, participants announcedm voting excitement, expert panel, funny abstainers e comeback voters

            // 🚧 TODO FUTURO - FEATURE COMEBACK_VOTERS:
            // ========================================
            // Quando un utente viene ri-ammesso dopo essere stato astenuto, deve generare news tipo:
            // "🎉 GRANDE RITORNO! {reIncludedPlayersNames} tornano in scena per la votazione!"
            // 
            // DATI NECESSARI da aggiungere a newsData:
            // - reIncludedPlayersNames: array con nomi utenti ri-ammessi
            // 
            // LOGICA PRIORITÀ da implementare:
            // const votingType = newsData.reIncludedPlayersNames?.length > 0
            //     ? 'comeback_voters'                    // PRIORITÀ 1: Chi torna
            //     : newsData.abstainedUsersNames?.length > 0  
            //         ? 'funny_abstainers'               // PRIORITÀ 2: Chi si astiene
            //         : ['session_opened', 'participants_announced', 'voting_excitement'][Math.floor(Math.random() * 3)]; // PRIORITÀ 3: Random
            //
            // TEMPLATE GIÀ PRONTI: 7 template comeback_voters esistono nel JSON (linea 736-788)
            // PLACEHOLDER: {reIncludedPlayersNames} - lista nomi separati da virgola
            // ========================================

            if (newsData.eligibleVotersNames &&
                newsData.eligibleVotersNames.length > 0) {

                // Logica condizionale attuale: se ci sono astenuti usa funny_abstainers
                const votingType = newsData.abstainedUsersNames?.length > 0
                    ? 'funny_abstainers'
                    : ['session_opened', 'participants_announced', 'voting_excitement'][Math.floor(Math.random() * 3)];

                const votingSessionNews = this.newsGenerator.generateVotingSessionNews({
                    ...commonPlaceholders,
                    type: votingType,
                    eligibleVotersNames: Array.isArray(newsData.eligibleVotersNames)
                        ? newsData.eligibleVotersNames.map(voter => voter.name).join(', ')
                        : '',
                    abstainedUsersNames: Array.isArray(newsData.abstainedUsersNames)
                        ? newsData.abstainedUsersNames.map(abstained => abstained.userId.name).join(', ')
                        : '',

                });

                if (votingSessionNews) {
                    newsItems.push({
                        teamId: teamId,
                        text: votingSessionNews.text,
                        category: votingSessionNews.category,
                        type: votingSessionNews.type,
                        priority: votingSessionNews.priority,
                        icon: votingSessionNews.icon,
                        style: votingSessionNews.style,
                        eventData: { matchId: null, field, date, playersCount }
                    })

                }
            }






            // 📰 ========================================
            // 🔄 SISTEMA "SOSTITUZIONE NOTIZIE INTELLIGENTE"
            // ========================================
            // Separo le news per categoria per evitare conflitti:
            // - match_creation: news generali del match
            // - votingSession_creation: news specifiche della voting session

            const matchCreationNews = newsItems.filter(news => news.category === 'match_creation');
            const votingSessionNews = newsItems.filter(news => news.category === 'votingSession_creation');

            let results = [];

            // Sostituisco prima le news di match creation se presenti
            if (matchCreationNews.length > 0) {
                console.log(`📰 [REPLACE] match_creation team=${teamId} news=${matchCreationNews.length}`);
                const matchResults = await this.deleteReplaceNewsByCategory(teamId, 'match_creation', matchCreationNews);
                results = results.concat(matchResults);
            }

            // Sostituisco le news di voting session se presenti
            if (votingSessionNews.length > 0) {
                console.log(`📰 [REPLACE] votingSession_creation team=${teamId} news=${votingSessionNews.length}`);
                const votingResults = await this.deleteReplaceNewsByCategory(teamId, 'votingSession_creation', votingSessionNews);
                results = results.concat(votingResults);
            }

            return results;



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

            // ✅ GENERIAMO DIVERSI TIPI DI NEWS PER IL COMPLETAMENTO MATCH
            const newsItems = [];

            // 1. News principale completamento match
            const mainNews = this.newsGenerator.generateMatchCompletedNews({
                ...specificPlaceholders,
                type: 'team_performance'
            });
            if (mainNews) {
                newsItems.push({
                    teamId,
                    text: mainNews.text,
                    category: mainNews.category,
                    type: mainNews.type,
                    priority: mainNews.priority,
                    icon: mainNews.icon,
                    style: mainNews.style,
                    eventData: { matchId }
                });
            }


            // 2. News miglior giocatore (se esiste)
            if (bestPlayer && bestPlayer.averageRating >= 7.5) {
                const bestPlayerNews = this.newsGenerator.generateMatchCompletedNews({
                    ...specificPlaceholders,
                    type: 'mvp_performance',
                    playerName: bestPlayer.name,
                    rating: bestPlayer.averageRating ? bestPlayer.averageRating.toFixed(1) : '0.0'
                });

                if (bestPlayerNews) {
                    newsItems.push({
                        teamId,
                        text: bestPlayerNews.text,
                        category: bestPlayerNews.category,
                        type: bestPlayerNews.type,
                        priority: bestPlayerNews.priority,
                        icon: bestPlayerNews.icon,
                        style: bestPlayerNews.style,
                        eventData: { matchId }
                    });
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
                    newsItems.push({
                        teamId,
                        text: goalsNews.text,
                        category: goalsNews.category,
                        type: goalsNews.type,
                        priority: goalsNews.priority,
                        icon: goalsNews.icon,
                        style: goalsNews.style,
                        eventData: { matchId }
                    });
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
                    newsItems.push({
                        teamId,
                        text: exceptionalNews.text,
                        category: exceptionalNews.category,
                        type: exceptionalNews.type,
                        priority: exceptionalNews.priority,
                        icon: exceptionalNews.icon,
                        style: exceptionalNews.style,
                        eventData: { matchId }
                    });
                }
            }

            // 📰 ========================================
            // 🔄 SISTEMA "SOSTITUZIONE NOTIZIE INTELLIGENTE"
            // ========================================
            // Questo sistema sostituisce SOLO le notizie della categoria "match_completed"
            // Le notizie di match_creation, leaderboard, ecc. rimangono intatte
            // È il sistema "a giornale": ogni completamento match sostituisce le news precedenti
            console.log(`📰 [REPLACE] match_completed team=${teamId} match=${matchId} news=${newsItems.length} (${newsItems.map(n => n.type).join(',')})`);

            return await this.deleteReplaceNewsByCategory(teamId, 'match_completed', newsItems);


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

            let newsItems = [];

            // 🎯 STEP 4: Genera news tramite template
            const mainNews = this.newsGenerator.generateLeaderboardNews({
                ...specificPlaceholders,
                type: 'new_leader'
            });

            // 🔍 STEP 5: Verifica output template
            if (!mainNews) {
                console.log('⚠️ NewsGenerator returned null (probably duplicate), skipping...');
                return null;
            }
            if (mainNews) {
                // Crea oggetto news
                newsItems.push({
                    teamId: teamId,
                    category: mainNews.category,
                    type: mainNews.type,
                    priority: mainNews.priority,
                    text: mainNews.text,
                    icon: mainNews.icon,
                    style: mainNews.style,

                    relatedEntityId: null,
                    relatedEntityType: 'leaderboard',
                    isRead: false,
                    createdAt: new Date(),
                });

                // 📰 ========================================
                // 🔄 SISTEMA "SOSTITUZIONE NOTIZIE INTELLIGENTE"
                // ========================================
                // Sostituisce SOLO le notizie della categoria "leaderboard"
                // Le news di match_creation e match_completed rimangono intatte
                console.log(`📰 [REPLACE] leaderboard team=${teamId} player=${playerName} newRating=${newRating?.toFixed(1)} type=${mainNews.type}`);

                const result = await this.deleteReplaceNewsByCategory(teamId, 'leaderboard', newsItems);
                return result.length > 0 ? result[0] : null; // Mantieni compatibilità
            }
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
                teamId,
                overallRating,
                consensusPosition,
                attributes,
                playerName,
                position,
                favoriteNumber
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

    /**
     * 👤 ANALIZZA E GENERA NEWS PER COMPLETAMENTO PLAYER CARD
     * Analizza dati player card completata e genera array di news items
     * @param {Object} playerCardData - Dati della player card {playerId, overallRating, consensusPosition, attributes}
     * @returns {Promise<Object>} {success, generated, count, metadata}
     */
    async createNewsOnCompletePlayerCard(playerCardData) {
        // TODO: Implementare logica per completamento player card
        return null;
    }

    /**
     * 🔄 SISTEMA "SOSTITUZIONE NOTIZIE INTELLIGENTE"
     * 
     * 🎯 COSA FA:
     * Sostituisce le notizie di una specifica categoria mantenendo intatte quelle delle altre categorie.
     * È come un giornale con sezioni indipendenti:
     * - Sezione "Sport" (match_completed) si aggiorna quando finisce una partita
     * - Sezione "Eventi" (match_creation) si aggiorna quando si crea un nuovo match  
     * - Sezione "Classifiche" (leaderboard) si aggiorna quando cambia la classifica
     * 
     * 🔄 LOGICA:
     * 1. CANCELLA tutte le vecchie notizie della categoria specifica
     * 2. INSERISCE le nuove notizie della stessa categoria
     * 3. MANTIENE intatte le notizie di tutte le altre categorie
     * 
     * 💡 ESEMPIO PRATICO:
     * - Team ha 8 notizie: 3 di "match_creation", 3 di "match_completed", 2 di "leaderboard"
     * - Arriva nuovo match completato → Cancella le 3 "match_completed", inserisce 4 nuove "match_completed"
     * - Risultato: 9 notizie totali (3 creation + 4 completed + 2 leaderboard)
     * 
     * @param {string} teamId - ID del team
     * @param {string} category - Categoria da sostituire (match_creation, match_completed, leaderboard, ecc.)
     * @param {Array} newsDataArray - Array delle nuove notizie da inserire
     * @returns {Promise<Array>} Array delle notizie create
     */
    async deleteReplaceNewsByCategory(teamId, category, newsDataArray) {
        try {
            // Validazione business
            if (!teamId || !category || !Array.isArray(newsDataArray)) {
                throw new Error('Parametri mancanti per sostituzione categoria notizie');
            }

            if (newsDataArray.length === 0) {
                return [];
            }

            // Delega al repository l'operazione database
            const result = await this.newsRepository.deleteReplaceNewsByCategory(teamId, category, newsDataArray);

            // Invalidazione cache per aggiornamenti news team
            await this.cacheService.delete(`news:${teamId}:recent`);
            await this.cacheService.delete(`news:${teamId}:category:${category}`);

            console.log(`📰 [REPLACE] ✓ team=${teamId} cat=${category} deleted=${result.deletedCount} created=${result.createdCount}`);
            return result.createdNews;

        } catch (error) {
            console.error(`❌ [REPLACE] team=${teamId} cat=${category} error=${error.message}`);
            throw error;
        }
    }











    /**
     * ======= SERVICE NEWS ESCLUSIVI DI CHIAMATE API ======
     * 
     * Siccome le news vengono create internamente dal sistema,
     * Le API servono principalmente per il recupero delle stesse, che
     * vengono appunto create dal newsgenerator e salvate nel database.
     */

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
    /**
     * 🏆 Crea news per i premi stagionali (Pallone d'Oro e/o Scarpa d'Oro).
     * Viene chiamato dopo che GoldenTotService ha confermato i bonus (award READY).
     *
     * @param {string|ObjectId} teamId
     * @param {Array<{type:string, hero:Object, seasonId:string}>} awards  award objects
     * @returns {Promise<Array>} news create
     */
    async createNewsOnSeasonAwards(teamId, awards = []) {
        const created = [];
        for (const award of awards) {
            try {
                const hero = award.hero || {};
                // Mappa i placeholder dal payload hero dell'award
                const eventData = {
                    teamId: teamId.toString(),
                    seasonId: award.seasonId || '',
                    seasonLabel: award.seasonId || '',
                    playerName: hero.name || 'N/A',
                    // BALLON_DOR
                    avgRating: hero.mainValue || '',
                    matchesPlayed: hero.stats?.find(s => s.label === 'PARTITE GIOCATE')?.value || '',
                    mvpCount: hero.stats?.find(s => s.label === 'VOLTE MVP')?.value || '',
                    // GOLDEN_BOOT
                    goals: hero.mainValue || '',
                    goalsPerMatch: hero.stats?.find(s => s.label === 'GOL A PARTITA')?.value || '',
                    triplette: hero.stats?.find(s => s.label === 'TRIPLETTE')?.value || '',
                    assists: hero.stats?.find(s => s.label === 'ASSIST')?.value || '',
                };

                const newsObj = this.newsGenerator.generateSeasonAwardNews(award.type, eventData);
                if (!newsObj) continue;

                const saved = await this.newsRepository.create({
                    teamId,
                    text: newsObj.text,
                    category: 'award_season',
                    type: award.type === 'BALLON_DOR' ? 'ballon_dor' : 'golden_boot',
                    priority: 'urgent',
                    icon: newsObj.icon,
                    style: newsObj.style || 'success',
                    eventData: { awardType: award.type, seasonId: award.seasonId },
                    createdAt: new Date()
                });
                created.push(saved);
                console.log(`[NewsService] ✅ Award news creata: ${award.type} team=${teamId}`);
            } catch (err) {
                console.warn(`[NewsService] Award news error (${award.type}): ${err.message}`);
            }
        }
        return created;
    }

    /**
     * 🔄 Reset news a fine stagione: elimina TUTTE le news del team e ricrea
     * solo le news dei premi stagionali (Pallone d'Oro + Scarpa d'Oro) della
     * stagione appena archiviata. Idempotente.
     *
     * @param {string|ObjectId} teamId
     * @param {string} prevSeasonId  stagione appena archiviata (es. "2025-26")
     * @returns {Promise<{deleted:number, created:number}>}
     */
    async resetNewsForSeasonEnd(teamId, prevSeasonId) {
        // 1. Leggi i premi READY della stagione appena chiusa
        const Award = require('../models/Award');
        const awards = await Award.find({
            teamId,
            seasonId: prevSeasonId,
            type: { $in: ['BALLON_DOR', 'GOLDEN_BOOT'] },
            status: 'READY'
        }).lean();

        // 2. Elimina tutte le news del team
        const deleted = await this.newsRepository.deleteAllForTeam(teamId);
        console.log(`[NewsService] resetNewsForSeasonEnd: team=${teamId} deleted=${deleted} news`);

        // 3. Ricrea solo le news dei premi
        const awardData = awards.map(a => ({
            type: a.type,
            hero: a.payload?.hero,
            seasonId: a.seasonId
        }));
        const created = await this.createNewsOnSeasonAwards(teamId, awardData);

        return { deleted, created: created.length };
    }
}

module.exports = NewsService;





