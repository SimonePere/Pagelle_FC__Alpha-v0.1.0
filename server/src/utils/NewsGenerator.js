const fs = require('fs');
const path = require('path');


// Metodi principali per ogni categoria:
//   generateLeaderboardNews(eventData)      // Cambi classifica generale
//   generateMatchCreationNews(eventData)    // Nuovo match creato  
//   generateMatchCompletedNews(eventData)   // Post-partita
//   generatePlayerCardNews(eventData)       // PlayerCard create
//   generateStreakNews(eventData)           // Serie positive/negative
//   generateMilestoneNews(eventData)        // Traguardi raggianti

class NewsGenerator {
    constructor() {
        this.templates = this.loadTemplates(); // Carica il JSON
        this.newsCache = new Map(); // Anti-duplicati
    }
    // Carica templates dal JSON
    loadTemplates() {
        const templatesPath = path.join(__dirname, '../../data/news-templates.json');
        return JSON.parse(fs.readFileSync(templatesPath, 'utf8'));
    };

    generateMatchCreationNews(eventData) {
        const matchCreationTemplates = this.loadTemplates().match_creation || {};

        const templates = matchCreationTemplates[eventData.type]

        const cacheKey = `match_creation_${eventData.type || 'random'}_${eventData.playersCount || ''}`;
        return this.selectAndProcessTemplate(templates, eventData, cacheKey);

    };

    generateVotingSessionNews(eventData) {
        const votingSessionTemplates = this.loadTemplates().votingSession_creation || {};
        const templates = votingSessionTemplates[eventData.type];
        // Cache key unica per ogni match per evitare blocchi
        const cacheKey = `votingSession_creation_${eventData.type || 'random'}_${eventData.matchId || Date.now()}`;
        return this.selectAndProcessTemplate(templates, eventData, cacheKey);
    }

    generateMatchCompletedNews(eventData) {
        const matchCompletedTemplates = this.loadTemplates().match_completed || {};

        // ✅ Gestisci type con fallback
        const newsType = eventData.type || 'team_performance';
        const templates = matchCompletedTemplates[newsType];

        if (!templates || !Array.isArray(templates) || templates.length === 0) {
            console.warn(`⚠️ Nessun template disponibile per match_completed.${newsType}`);
            return null;
        }

        const cacheKey = `match_completed_${newsType}_${eventData.matchId || Date.now()}`;
        return this.selectAndProcessTemplate(templates, eventData, cacheKey);
    }

    generateLeaderboardNews(eventData) {
        const leaderboardTemplates = this.loadTemplates().leaderboard || {};

        const templates = leaderboardTemplates[eventData.type]

        const cacheKey = `leaderboard_${eventData.type || 'random'}_${eventData.playerId || ''}`;
        return this.selectAndProcessTemplate(templates, eventData, cacheKey);
    }


    generatePlayerCardCreationNews(eventData) {
        const playerCardTemplates = this.loadTemplates().player_card || {};

        const templates = playerCardTemplates[eventData.type]

        const cacheKey = `player_card_${eventData.type || 'random'}_${eventData.playerId || ''}`;
        return this.selectAndProcessTemplate(templates, eventData, cacheKey);
    }


    // Core logic:
    selectAndProcessTemplate(templates, placeholders, cacheKey) {
        // 1. Controlla cache anti-duplicati
        if (this.newsCache.has(cacheKey)) {
            console.log(`⏸️ News già generata di recente: ${cacheKey}`);
            return null;
        }

        // 2. Verifica che abbiamo templates disponibili
        if (!templates || !Array.isArray(templates) || templates.length === 0) {
            console.warn('⚠️ Nessun template disponibile per:', cacheKey);
            return null;
        }

        // 3. Seleziona template casuale (con peso priorità)
        const template = this.selectRandomTemplate(templates);
        if (!template) {
            console.warn('⚠️ Nessun template selezionato per:', cacheKey);
            return null;
        }

        // 4. Sostituisce placeholder {playerName}, {rating}, etc.
        let processedText = template.text;

        Object.keys(placeholders).forEach(key => {
            const placeholder = '{' + key + '}';
            const value = placeholders[key] || '';
            processedText = processedText.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
        });

        // 5. Aggiungi a cache (con TTL)
        this.newsCache.set(cacheKey, Date.now());
        // Pulisci cache vecchia (più di 1 ora)
        this.cleanOldCache();

        // 6. Ritorna oggetto news formattato
        return {
            text: processedText,
            category: template.category,
            type: template.type,
            priority: template.priority || 'medium',
            icon: template.icon,
            style: template.style,
            metadata: {
                templateId: template.id,
                context: placeholders,
                generatedAt: new Date()
            }
        };
    }

    selectRandomTemplate(templates) {
        if (!templates || templates.length === 0) return null;

        // Peso basato su priorità
        const weightedTemplates = [];
        templates.forEach(template => {
            const weight = this.getPriorityWeight(template.priority || 'medium');
            for (let i = 0; i < weight; i++) {
                weightedTemplates.push(template);
            }
        });

        const randomIndex = Math.floor(Math.random() * weightedTemplates.length);
        return weightedTemplates[randomIndex];
    }

    getPriorityWeight(priority) {
        const weights = {
            'urgent': 5,
            'high': 3,
            'medium': 2,
            'low': 1
        };
        return weights[priority] || 2;
    }

    cleanOldCache() {
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        for (const [key, timestamp] of this.newsCache.entries()) {
            if (timestamp < oneHourAgo) {
                this.newsCache.delete(key);
            }
        }
    }

    /**
     * Genera una news per un award stagionale (BALLON_DOR o GOLDEN_BOOT).
     * @param {'BALLON_DOR'|'GOLDEN_BOOT'} awardType
     * @param {Object} eventData  { playerName, avgRating, goals, goalsPerMatch, matchesPlayed, mvpCount, triplette, assists, seasonLabel, seasonId, teamId }
     */
    generateSeasonAwardNews(awardType, eventData) {
        const key = awardType === 'BALLON_DOR' ? 'ballon_dor' : 'golden_boot';
        const templates = this.loadTemplates().awards_season?.[key] || [];
        const cacheKey = `award_${awardType}_${eventData.teamId}_${eventData.seasonId}`;
        return this.selectAndProcessTemplate(templates, eventData, cacheKey);
    }

}


module.exports = NewsGenerator;







