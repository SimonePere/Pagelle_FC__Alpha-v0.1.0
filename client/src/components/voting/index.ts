/**
 * 🗳️ VOTING COMPONENTS EXPORTS
 * Barrel export per tutti i componenti di votazione specializzati
 */

// 🟢 IMPLEMENTATI (allineati con backend)
export { PlayerCardRatingVote as PlayerCardVote } from './PlayerCardRatingVote';  // type: 'player_card_rating'
export { MatchPlayerRatingVote as MatchRatingVote } from './MatchPlayerRatingVote'; // type: 'match_rating'

// 🔄 FUTURE FEATURES (da abilitare quando implementati nel backend)
// export { SeasonMVPVote } from './SeasonMVPVote';            // type: 'season_mvp'
// export { MVPElectionVote } from './MVPElectionVote';        // type: 'season_mvp'

// 🚫 DEPRECATI (da rimuovere)
// export { MatchPlayerRatingVote } from './MatchPlayerRatingVote'; // → sostituito da MatchRatingVote
// export { MOTMElectionVote } from './MOTMElectionVote';           // → integrato in MatchRatingVote

// 📋 TODO: Nuovi componenti da implementare
// export { SeasonMVPVote } from './SeasonMVPVote';            // type: 'season_mvp'
// export { CaptainElectionVote } from './CaptainElectionVote'; // type: 'captain_election'
// export { TransferDecisionVote } from './TransferDecisionVote'; // type: 'transfer_decision'
// export { BestGoalVote } from './BestGoalVote';              // type: 'best_goal'

// 📊 Utility components
// export { VotingResultsView } from './VotingResultsView';
// export { VotingSessionManager } from './VotingSessionManager';