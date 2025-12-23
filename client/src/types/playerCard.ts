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


  // Star ratings (1-5)
  weakFoot: number;
  skillMoves: number;

  // Profile info
  position: 'POR' | 'DIF' | 'CEN' | 'ATT';
  preferredRole: string; // e.g., "Terzino", "Punta"
  age: number;
}

export interface PlayerCardSubmission {
  voterId: string; // User who submitted this version
  attributes: PlayerAttributes;
  submittedAt: string;
}

export interface PlayerCard {
  id: string;
  playerId: string; // The player this card represents
  teamId: string;

  // All team member submissions
  submissions: PlayerCardSubmission[];

  // Final averaged attributes (calculated when all submit)
  finalAttributes?: PlayerAttributes;

  // Status tracking
  isComplete: boolean;

  createdAt: string;
  updatedAt: string;
}
