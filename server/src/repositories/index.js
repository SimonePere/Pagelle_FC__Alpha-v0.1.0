/**
 * 📂 REPOSITORY INDEX - Centralizza export di tutti i Repository
 * 
 * 📝 COME USARE:
 * Invece di importare ogni repository singolarmente, puoi usare:
 * 
 * const { UserRepository, MatchRepository } = require('../repositories');
 * 
 * Oppure per importarli tutti:
 * const repositories = require('../repositories');
 */

// 🏗️ Base Repository (classe madre)
const BaseRepository = require('./BaseRepository');

// 🎯 Repository specifici
const UserRepository = require('./UserRepository');
const TeamRepository = require('./TeamRepository');
const MatchRepository = require('./MatchRepository');
const VotingSessionRepository = require('./VotingSessionRepository');
const VoteSubmissionRepository = require('./VoteSubmissionRepository');
const VoteResultRepository = require('./VoteResultRepository');
const PlayerCardSubmissionRepository = require('./PlayerCardSubmissionRepository');
const PlayerCardResultRepository = require('./PlayerCardResultRepository');
const PlayerLeaderboardStatsRepository = require('./PlayerLeaderboardStatsRepository');

// 📦 Export di tutti i repository
module.exports = {
    // Base
    BaseRepository,

    // Specifici
    UserRepository,
    TeamRepository,
    MatchRepository,
    VotingSessionRepository,
    VoteSubmissionRepository,
    VoteResultRepository,
    PlayerCardSubmissionRepository,
    PlayerCardResultRepository,
    PlayerLeaderboardStatsRepository
};