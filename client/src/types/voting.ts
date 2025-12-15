/**
 * 🗳️ VOTING SYSTEM TYPES
 * Definizioni TypeScript per il sistema VotingSession
 * Versione pulita senza duplicazioni
 */

// ===== VOTING-SPECIFIC TYPES =====

// Attributi specifici per la votazione delle carte giocatore FIFA-style (scale 10-100)
export interface PlayerCardAttributes {
  // Attributi Tecnici
  tir: number;            // Tiro (10-100)
  pas: number;            // Passaggio (10-100) 
  dri: number;            // Dribbling (10-100)
  fin: number;            // Finalizzazione (10-100)
  vis: number;            // Visione (10-100)

  // Attributi Fisici  
  res: number;            // Resistenza (10-100)
  for: number;            // Forza (10-100)

  // Skill Stars (1-5)
  piedeDebole: number;    // Piede Debole (1-5 stelle)
  skill: number;          // Skill Moves (1-5 stelle)
}

// Informazioni profilo giocatore
export interface PlayerProfile {
  position: 'POR' | 'DC' | 'TS' | 'TD' | 'CC' | 'CDC' | 'COC' | 'ED' | 'ES' | 'AT' | 'AD' | 'AS' | 'ATT';
  preferredRole: string;  // es. "Punta", "Terzino", "Regista"
}

// ===== ENUMS =====

export type VotingSessionType =
  // 🟢 IMPLEMENTATI (allineati con backend schema)
  | 'match_rating'          // Voto prestazioni partita (backend: match_rating)
  | 'player_card_rating'    // Valutazione carta giocatore (backend: player_card_rating)

  // 🔄 FUTURE FEATURES (nel backend ma non ancora nel frontend)
  // | 'season_mvp'          // Elezione MVP stagionale (backend: season_mvp)
  // | 'captain_election'    // Elezione capitano (backend: captain_election)  
  // | 'transfer_decision'   // Decisione su acquisti (backend: transfer_decision)
  // | 'best_goal'          // Miglior gol del mese (backend: best_goal)  // 🚫 DEPRECATI (da rimuovere - non nel backend)
  // | 'match_player_rating' // → sostituito da 'match_rating'
  // | 'mvp_election'        // → sostituito da 'season_mvp'  
  // | 'motm_election'       // → integrato in 'match_rating'
  ;

export type VotingSessionStatus =
  | 'draft'          // Sessione in preparazione
  | 'active'         // Sessione attiva - si può votare
  | 'completed'      // Sessione completata
  | 'cancelled'      // Sessione annullata
  | 'expired';       // Scaduta senza raggiungere quorum (nuovo dal backend)

export type VoteSubmissionStatus =
  | 'valid'          // Voto valido
  | 'invalid'        // Voto invalido
  | 'flagged'        // Voto segnalato per controllo
  | 'duplicate';     // Voto duplicato

// ===== CORE INTERFACES =====

export interface VotingSession {
  // 🟢 CORE FIELDS (allineati con backend MongoDB schema)
  id: string;                    // _id nel backend
  type: VotingSessionType;
  title: string;
  description?: string;
  status: VotingSessionStatus;

  // 🟢 BACKEND ALIGNED
  targetId: string;              // targetId nel backend (ObjectId → string)
  teamId: string;                // teamId nel backend 
  eligibleVoters: string[];      // eligibleVoters nel backend
  createdBy: string;             // createdBy nel backend

  // 🟢 TEMPORAL (backend aligned)
  startedAt?: string;            // startedAt nel backend (opzionale)
  deadline?: string;             // deadline nel backend (opzionale)  
  completedAt?: string;          // completedAt nel backend
  createdAt: string;             // timestamps.createdAt
  updatedAt: string;             // timestamps.updatedAt

  // 🟢 PROGRESS & SUMMARY (da backend.summary)
  submissionsCount: number;      // summary.totalSubmissions
  participationRate: number;     // summary.participationRate

  // 🟢 USER-SPECIFIC (calcolati dal frontend)
  isActive: boolean;
  hasVoted: boolean;
  canVote: boolean;
  eligibleVotersCount: number;

  // 🔄 FUTURE FEATURES (da implementare)
  // allowSelfVoting?: boolean;     // dal backend schema
  // requiredVotes?: number;        // dal backend schema
  // voteConfig?: any;              // dal backend schema (configurazioni specifiche)
  // version?: number;              // dal backend schema

  // 🚫 DEPRECATED (da rimuovere - sostituiti da targetId/teamId)
  // target?: VotingTarget;         // → sostituito da targetId
  // isAnonymous?: boolean;         // → spostato in voteConfig.anonymousVoting
  // allowMultipleSubmissions?: boolean; // → spostato in voteConfig.allowVoteModification
  // requiresApproval?: boolean;    // → non nel backend attuale
  // startsAt?: string;             // → sostituito da startedAt
  // endsAt?: string;               // → sostituito da deadline

  // Results e submissions - da implementare con endpoint separati
  // result?: VotingResult;
  // userSubmission?: VoteSubmission;
}

// 🚫 DEPRECATO - sostituito da targetId nel VotingSession
// export interface VotingTarget {
//   type: 'player' | 'match' | 'team';
//   entityId: string;  // playerId, matchId, teamId
//   // Metadata aggiuntivi per UI
//   playerName?: string;
//   matchTitle?: string;
//   teamName?: string;
//   // Context info per diverse tipologie
//   matchDate?: string;
//   position?: string;
//   jerseyNumber?: number;
// }

// 🔄 FUTURE: Metadata UI saranno recuperati via populate nel backend

export interface VoteSubmission {
  id: string;
  sessionId: string;
  userId: string;

  // Vote Data (tipizzato in base al tipo di sessione)
  vote: VoteData;

  // Metadata
  submittedAt: string;
  status: VoteSubmissionStatus;
  deviceInfo?: DeviceInfo;

  // Validation
  isValid: boolean;
  validationErrors?: string[];

  // Admin fields
  flaggedReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface VotingResult {
  id: string;
  sessionId: string;

  // Calculated Results (tipizzati in base al tipo)
  aggregatedResult: AggregatedResult;

  // Statistics
  totalSubmissions: number;
  validSubmissions: number;
  participationRate: number; // % eligible voters che hanno votato

  // Timing
  calculatedAt: string;
  isComplete: boolean;

  // Detailed breakdown
  breakdown?: ResultBreakdown;
}

export interface VotingAudit {
  id: string;
  sessionId: string;

  action: string;  // 'created', 'started', 'paused', 'completed', 'vote_submitted', etc.
  performedBy: string;  // userId
  performedAt: string;

  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

// ===== VOTE DATA TYPES =====

export type VoteData =
  | PlayerCardRatingVote
  | MatchPlayerRatingVote
  | MVPElectionVote
  | MOTMElectionVote;

// Valutazione carta giocatore completa
export interface PlayerCardRatingVote {
  attributes: PlayerCardAttributes; // Attributi tecnici e fisici FIFA-style
  playerProfile: PlayerProfile;     // Informazioni profilo (posizione, ruolo, età)
  overallComment?: string;          // Commenti opzionali
  overallRating: number;            // Rating overall calcolato (10-100)
}

// Voti giocatori in una partita (rating 1-10 + stats dettagliate)
export interface MatchPlayerRatingVote {
  playerRatings: {
    [playerId: string]: {
      rating: number;        // 1-10
      minutes?: number;      // minuti giocati
      position?: string;     // posizione in campo
      comments?: string;

      // ⚽ Statistiche partita
      goals?: number;        // Numero gol segnati
      assists?: number;      // Numero assist forniti

      // 🏆 Badge assegnati (opzionali)
      badges?: PlayerMatchBadge[];
    };
  };
  matchComments?: string;
}

// Badge che possono essere assegnati ai giocatori
export type PlayerMatchBadge =
  | 'gol_piu_bello'      // Gol Più Bello
  | 'maratoneta'         // Maratoneta (più km corsi)
  | 'assist_man'        // Assist Man
  | 'goleador'          // Goleador
  | 'muro_difensivo'    // Muro Difensivo
  | 'mvp'               // MVP della partita
  | 'uomo_partita';     // Uomo Partita

// Elezione MVP (un solo vincitore)
export interface MVPElectionVote {
  selectedPlayerId: string;
  reason?: string;
}

// Elezione Man of the Match (un solo vincitore)
export interface MOTMElectionVote {
  selectedPlayerId: string;
  reason?: string;
}

// ===== AGGREGATED RESULTS TYPES =====

export type AggregatedResult =
  | PlayerCardAggregatedResult
  | MatchPlayerAggregatedResult
  | MVPElectionAggregatedResult
  | MOTMElectionAggregatedResult;

export interface PlayerCardAggregatedResult {
  // Media degli attributi
  averageAttributes: PlayerCardAttributes;

  // Statistiche per attributo
  attributeStats: {
    [key in keyof PlayerCardAttributes]: {
      min: number;
      max: number;
      average: number;
      median: number;
      standardDeviation: number;
      voteCount: number;
    };
  };

  // Overall stats
  overallRating: number;  // media di tutti gli attributi
  consensus: number;      // quanto sono d'accordo i votanti (0-1)
}

export interface MatchPlayerAggregatedResult {
  playerRatings: {
    [playerId: string]: {
      averageRating: number;
      voteCount: number;
      ratingDistribution: number[];  // [count_1star, count_2star, ..., count_10star]
      topPerformance: boolean;       // tra i migliori 3
      worstPerformance: boolean;     // tra i peggiori 3
    };
  };

  // Team stats
  teamAverageRating: number;
  bestPlayer: string;     // playerId
  worstPlayer: string;    // playerId
  mostConsistentPlayer: string;  // playerId (minor deviazione standard)
}

export interface MVPElectionAggregatedResult {
  winner: string;  // playerId
  results: {
    [playerId: string]: {
      votes: number;
      percentage: number;
    };
  };
  totalVotes: number;
  marginOfVictory: number;  // differenza % tra 1° e 2°
}

export interface MOTMElectionAggregatedResult {
  winner: string;  // playerId
  results: {
    [playerId: string]: {
      votes: number;
      percentage: number;
    };
  };
  totalVotes: number;
  marginOfVictory: number;
}

// ===== UTILITY TYPES =====

export interface DeviceInfo {
  userAgent: string;
  timestamp: string;
  ipAddress?: string;
}

export interface ResultBreakdown {
  byVoter?: {
    [userId: string]: VoteData;
  };

  byAttribute?: {
    [attribute: string]: {
      values: number[];
      average: number;
      distribution: { [value: number]: number };
    };
  };

  timeline?: {
    timestamp: string;
    cumulativeResult: any;
    submissionCount: number;
  }[];
}

// ===== API REQUEST/RESPONSE TYPES =====

export interface CreateVotingSessionRequest {
  type: VotingSessionType;
  title: string;
  description?: string;

  // 🟢 BACKEND REQUIRED FIELDS
  targetType: 'player_card' | 'match' | 'team';  // Tipo di entità target (corretto per backend)
  targetId: string;                              // ObjectId del target (Match, PlayerCard, etc.)
  teamId: string;                               // Team a cui appartiene la votazione
  eligibleVoters: string[];                     // User IDs che possono votare

  // 🔄 FUTURE - da spostare in voteConfig quando implementato
  isAnonymous?: boolean;
  allowMultipleSubmissions?: boolean;
  requiresApproval?: boolean;

  startsAt: string;
  endsAt: string;
}

export interface SubmitVoteRequest {
  vote: VoteData;
  deviceInfo?: DeviceInfo;
}

export interface GetVotingSessionsQuery {
  type?: VotingSessionType;
  status?: VotingSessionStatus;
  userId?: string;  // per filtrare sessioni di un utente specifico

  // Pagination
  page?: number;
  limit?: number;

  // Sorting
  sortBy?: 'createdAt' | 'endsAt' | 'submissionsCount';
  sortOrder?: 'asc' | 'desc';
}

// ===== RESPONSE TYPES =====

export interface VotingSessionResponse {
  votingSession: VotingSession;
}

export interface VotingSessionsResponse {
  votingSessions: VotingSession[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface VotingResultsResponse {
  results: VotingResult;
}

// ===== REDUX STATE TYPES =====

export interface VotingState {
  // Sessions
  sessions: VotingSession[];
  currentSession: VotingSession | null;

  // Team Members
  teamMembers: Array<{ id: string; name: string; email: string }>;

  // Loading states
  isLoading: boolean;
  isLoadingSessions: boolean;
  isLoadingSession: boolean;
  isSubmittingVote: boolean;
  isCreatingSession: boolean;
  isLoadingTeamMembers: boolean;

  // Error states
  error: string | null;
  loadError: string | null;
  submitError: string | null;
  createError: string | null;

  // Draft votes (localStorage backup)
  draftVotes: {
    [sessionId: string]: Partial<VoteData>;
  };

  // Filters & UI state (con support per 'all')
  filters: {
    type?: VotingSessionType | 'all';
    status?: VotingSessionStatus | 'all';
    searchTerm?: string;
  };

  // Pagination (nomi corretti)
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };

  // Cache risultati
  results: {
    [sessionId: string]: VotingResult;
  };

  // ⚽ Match voting data (separato da sessions generiche)
  matchVoting: {
    calculation: {
      playerResults: Record<string, {
        averageRating: number;
        goals: number;
        assists: number;
        voteCount: number;
        badges?: string[];
      }>;
      totalVoters: number;
      sessionId: string;
      isOfficial: boolean;
    } | null;
    submissions: Array<{
      voter: { id: string; name: string; };
      submissionInfo: { submittedAt: string; timeSpent?: number; };
      playerVotes: Array<{
        player: { id: string; name: string; };
        rating: number;
        goals: number;
        assists: number;
        comment?: string;
      }>;
    }>;
    isLoading: boolean;
    error: string | null;
    lastFetched: string | null;
    currentSessionId: string | null;
  };
}

// ===== ACTION PAYLOAD TYPES =====

export interface UpdateFiltersPayload {
  type?: VotingSessionType | 'all';
  status?: VotingSessionStatus | 'all';
  searchTerm?: string;
}

export interface UpdateDraftVotePayload {
  sessionId: string;
  draftVote: Partial<VoteData>;
}

// ===== UI COMPONENT TYPES =====

export interface VotingSessionCardProps {
  session: VotingSession;
  onVote?: (session: VotingSession) => void;
  onViewResults?: (session: VotingSession) => void;
  onEdit?: (session: VotingSession) => void;
  showActions?: boolean;
}

export interface VoteComponentProps {
  votingSession: VotingSession;
  onComplete: () => void;
  onCancel: () => void;
}

// ===== HELPER TYPES =====

export type VotingSessionWithStats = VotingSession & {
  stats: {
    participationRate: number;
    avgCompletionTime?: number;  // in minutes
    consensusLevel?: number;     // 0-1 per player cards
    topVoters?: string[];        // userIds of most active voters
  };
};

// ===== TYPE GUARDS =====

export const isPlayerCardVote = (vote: VoteData): vote is PlayerCardRatingVote => {
  return 'attributes' in vote;
};

export const isMatchPlayerVote = (vote: VoteData): vote is MatchPlayerRatingVote => {
  return 'playerRatings' in vote;
};

export const isMVPVote = (vote: VoteData): vote is MVPElectionVote => {
  return 'selectedPlayerId' in vote && !('playerRatings' in vote);
};

export const isMOTMVote = (vote: VoteData): vote is MOTMElectionVote => {
  return 'selectedPlayerId' in vote && !('playerRatings' in vote);
};

// ===== LEGACY COMPATIBILITY =====

// Backward compatibility con il vecchio sistema (solo alias)
export type VotingType = VotingSessionType;
export type VotingStatus = VotingSessionStatus;
export type TargetType = 'match' | 'player_card' | 'team' | 'user';

// ===== UTILITY HELPERS =====

/**
 * Mappa automaticamente il tipo di votazione al targetType richiesto dal backend
 */
export const getTargetTypeFromVotingType = (votingType: VotingSessionType): 'player_card' | 'match' | 'team' => {
  switch (votingType) {
    case 'player_card_rating':
      return 'player_card';  // ← FIXATO: il backend si aspetta 'player_card' non 'player'
    case 'match_rating':
      return 'match';
    // Future types
    // case 'season_mvp':
    // case 'captain_election':
    //   return 'team';
    default:
      throw new Error(`Unknown voting type: ${votingType}`);
  }
};