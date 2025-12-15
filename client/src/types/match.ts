export type MatchStatus = 'draft' | 'active' | 'completed' | 'cancelled';
export type PlayersCount = 5 | 8 | 11;

// 🗳️ Voting Session data (populated dal backend)
export interface VotingSession {
  id: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  totalSubmissions: number;
  participationRate: number;
  requiredVotes: number;
}

export interface Match {
  id: string; // MongoDB-compatible _id
  createdBy: string;
  teamId: string; // Team identifier
  date: string;
  field: string; // Campo di gioco (ex opponent)
  playersCount: PlayersCount; // Numero giocatori: 5, 8, 11
  notes?: string;

  // All team members automatically included
  teamMemberIds: string[];
  teamMembers?: User[]; // Dati completi dei membri dal backend

  // 🗳️ Voting Session collegata (populated dal backend)
  votingSession?: VotingSession | null;

  status: MatchStatus;

  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  email?: string;
  teamId: string;
  teamName?: string;
}

// Notification types for future backend integration
export interface MatchNotification {
  id: string;
  userId: string;
  matchId: string;
  type: 'match_created' | 'match_updated' | 'match_cancelled';
  read: boolean;
  createdAt: string;
}
