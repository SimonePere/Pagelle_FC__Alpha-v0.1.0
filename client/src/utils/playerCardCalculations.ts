import { PlayerCard, PlayerAttributes } from '@/types/playerCard';

/**
 * Calculate average attributes from all team member submissions
 */
export const calculateFinalAttributes = (card: PlayerCard): PlayerAttributes => {
  const submissions = card.submissions;
  
  if (submissions.length === 0) {
    throw new Error('No submissions to calculate from');
  }
  
  const totals = {
    stamina: 0,
    strength: 0,
    shooting: 0,
    passing: 0,
    dribbling: 0,
    finalizzazione: 0,
    visione: 0,
    weakFoot: 0,
    skillMoves: 0,
    age: 0,
  };
  
  // Sum all attributes
  submissions.forEach(sub => {
    totals.stamina += sub.attributes.stamina;
    totals.strength += sub.attributes.strength;
    totals.shooting += sub.attributes.shooting;
    totals.passing += sub.attributes.passing;
    totals.dribbling += sub.attributes.dribbling;
    totals.finalizzazione += sub.attributes.finalizzazione;
    totals.visione += sub.attributes.visione;
    totals.weakFoot += sub.attributes.weakFoot;
    totals.skillMoves += sub.attributes.skillMoves;
    totals.age += sub.attributes.age;
  });
  
  const count = submissions.length;
  
  // Get most common position and role
  const positionCounts: Record<string, number> = {};
  const roleCounts: Record<string, number> = {};
  
  submissions.forEach(sub => {
    positionCounts[sub.attributes.position] = (positionCounts[sub.attributes.position] || 0) + 1;
    roleCounts[sub.attributes.preferredRole] = (roleCounts[sub.attributes.preferredRole] || 0) + 1;
  });
  
  const mostCommonPosition = Object.entries(positionCounts).sort((a, b) => b[1] - a[1])[0][0] as PlayerAttributes['position'];
  const mostCommonRole = Object.entries(roleCounts).sort((a, b) => b[1] - a[1])[0][0];
  
  return {
    stamina: Math.round(totals.stamina / count),
    strength: Math.round(totals.strength / count),
    shooting: Math.round(totals.shooting / count),
    passing: Math.round(totals.passing / count),
    dribbling: Math.round(totals.dribbling / count),
    finalizzazione: Math.round(totals.finalizzazione / count),
    visione: Math.round(totals.visione / count),
    weakFoot: Math.round(totals.weakFoot / count),
    skillMoves: Math.round(totals.skillMoves / count),
    position: mostCommonPosition,
    preferredRole: mostCommonRole,
    age: Math.round(totals.age / count),
  };
};

/**
 * Check if all team members have submitted their version
 */
export const isPlayerCardComplete = (card: PlayerCard, teamMemberIds: string[]): boolean => {
  return card.submissions.length === teamMemberIds.length;
};

/**
 * Get list of team members who haven't submitted yet
 */
export const getPendingVoters = (card: PlayerCard, teamMemberIds: string[], allUsers: any[]): string[] => {
  const submittedIds = card.submissions.map(s => s.voterId);
  return teamMemberIds
    .filter(id => !submittedIds.includes(id))
    .map(id => {
      const user = allUsers.find(u => u.id === id);
      return user?.name || 'Unknown';
    });
};

/**
 * Check if a user has already submitted their version
 */
export const hasUserSubmitted = (card: PlayerCard, userId: string): boolean => {
  return card.submissions.some(s => s.voterId === userId);
};

/**
 * Calculate overall rating from attributes
 */
export const calculateOverallRating = (attributes: PlayerAttributes): number => {
  const { position, stamina, strength, shooting, passing, dribbling, finalizzazione, visione } = attributes;
  
  // Weight attributes differently based on position
  const weights: Record<PlayerAttributes['position'], Record<string, number>> = {
    'POR': { strength: 0.25, stamina: 0.2, visione: 0.2, shooting: 0.05, passing: 0.1, dribbling: 0.05, finalizzazione: 0.15 },
    'DIF': { strength: 0.25, stamina: 0.2, passing: 0.15, dribbling: 0.05, shooting: 0.05, finalizzazione: 0.05, visione: 0.25 },
    'CEN': { passing: 0.25, stamina: 0.2, dribbling: 0.2, shooting: 0.1, finalizzazione: 0.1, strength: 0.05, visione: 0.1 },
    'ATT': { shooting: 0.25, dribbling: 0.2, finalizzazione: 0.25, passing: 0.15, stamina: 0.05, strength: 0.05, visione: 0.05 }
  };
  
  const w = weights[position];
  const overall = 
    stamina * w.stamina +
    strength * w.strength +
    shooting * w.shooting +
    passing * w.passing +
    dribbling * w.dribbling +
    finalizzazione * w.finalizzazione +
    visione * w.visione;
  
  return Math.round(overall);
};
