/**
 * API Types - Semplificati e Unificati
 */

// Re-export voting types per convienienza
export * from './voting';

// Base Response Structure
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
}

// User Types
export interface User {
  id?: string;
  _id?: string;
  email: string;
  name?: string;
  username?: string;
  teamIds?: string[];
  teamName?: string;
  role?: string;
  isGuest?: boolean;
  profile?: any;
  totalTeams?: number;
  createdAt?: string;
  updatedAt?: string;

  // Rich data from /auth/me (optional per backwards compatibility)
  personalStats?: {
    totalMatches: number;
    totalGoals: number;
    totalAssists: number;
    averageRating: number;
    bestRating: number;
    worstRating: number;
  };
  playerCard?: {
    hasPlayerCard: boolean;
    latestCard?: {
      id: string;
      sessionTitle: string;
      finalOverallRating: number;
      consensusProfile?: any;
      createdAt: string;
      completedAt?: string;
      finalAttributes?: any;
    };
  };
  teams?: Array<{
    id: string;
    name: string;
    colors: {
      primary: string;
      secondary: string;
    };
    city?: string;
    settings: {
      isPrivate: boolean;
      maxMembers: number;
      autoApprove: boolean;
      allowGuestVoting: boolean;
    };
    inviteCode: string;
    teamStats: {
      totalMatches: number;
      totalGoals: number;
      totalAssists: number;
      averageRating: number;
      activePlayers: number;
      lastMatchDate?: string;
    };
  }>;
  hasTeams?: boolean;
  displayName?: string;
  isActive?: boolean;
  birthdate?: string;
}


// Auth Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// Team Types
export interface Team {
  _id: string;
  name: string;
  description?: string;
  city?: string;
  logo?: string;
  creator: string | User;
  memberIds: User[];
  adminIds: User[];
  inviteCode: string;
  isPublic: boolean;
  settings: {
    maxMembers: number;
    allowPlayerCards: boolean;
    matchRatingSystem: 'simple' | 'detailed';
  };
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  user: string | User;
  role: 'owner' | 'admin' | 'member';
  position?: string;
  jerseyNumber?: number;
  joinedAt: string;
}

export interface CreateTeamRequest {
  name: string;
  description?: string;
  logo?: string;
  isPublic?: boolean;
  settings?: {
    maxMembers?: number;
    allowPlayerCards?: boolean;
    matchRatingSystem?: 'simple' | 'detailed';
  };
}

export interface JoinTeamRequest {
  inviteCode: string;
}

export interface UpdateTeamRequest {
  name?: string;
  description?: string;
  city?: string;
  avatar?: string;
  colors?: {
    primary?: string;
    secondary?: string;
  };
  settings?: {
    autoApprove?: boolean;
    allowGuestVoting?: boolean;
  };
}

// Match Types
export interface Match {
  _id: string;
  team: string | Team;
  opponent: string;
  date: string;
  location?: string;
  type: 'friendly' | 'league' | 'cup' | 'training';
  result?: {
    teamScore: number;
    opponentScore: number;
  };
  lineup: MatchPlayer[];
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  ratings: MatchRating[];
  creator: string | User;
  createdAt: string;
  updatedAt: string;
}

export interface MatchPlayer {
  user: string | User;
  position: string;
  jerseyNumber?: number;
  isStarter: boolean;
  minutesPlayed?: number;
}

export interface MatchRating {
  ratedBy: string | User;
  player: string | User;
  ratings: {
    overall: number;
    technical: number;
    physical: number;
    mental: number;
  };
  notes?: string;
  submittedAt: string;
}

export interface CreateMatchRequest {
  teamId: string;              // ID del team (richiesto)
  date: string;               // Data partita (richiesto)  
  field: string;              // Nome campo (richiesto, ex opponent)
  playersCount: 5 | 8 | 11;   // Numero giocatori (richiesto)
  notes?: string;             // Note (opzionale)
  teamMemberIds: string[];    // Array ID membri che hanno giocato
  abstainedMembers?: Array<{
    userId: string;
    abstainedBy: string;
  }>;                       // Array ID membri assenti (opzionale)
  guestPlayers?: Array<{
    name: string;
    position?: 'POR' | 'DIF' | 'CEN' | 'ATT' | 'UTIL';
  }>;
}

export interface SubmitRatingsRequest {
  ratings: {
    player: string;
    ratings: {
      overall: number;
      technical: number;
      physical: number;
      mental: number;
    };
    notes?: string;
  }[];
}

// Player Card Types
export interface PlayerCard {
  _id: string;
  user: string | User;
  team: string | Team;
  attributes: PlayerAttributes;
  overallRating: number;
  position?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlayerAttributes {
  // Physical and defensive attributes (0-100)
  stamina: number;
  strength: number;
  contrast: number;
  interception: number;
  headPrecision: number;
  // Technical attributes (0-100)
  shooting: number;
  passing: number;
  dribbling: number;
  finalizzazione: number;
  visione: number;
  // === POR attributes (optional and EXCLUSIVE) ===
  tuffo?: number;
  presa?: number;
  rinvio?: number;
  piazzamento?: number;
  riflessi?: number;

}

export interface SubmitPlayerCardRequest {
  team: string;
  attributes: PlayerAttributes;
  position: string;
}

// Stats Types
export interface UserStats {
  user: string | User;
  totalMatches: number;
  averageRating: number;
  positions: { [position: string]: number };
  ratingsByAttribute: {
    overall: number;
    technical: number;
    physical: number;
    mental: number;
  };
  recentForm: number[];
  achievements: string[];
}

// Generic API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  error: string;
  message?: string;
  details?: any;
}