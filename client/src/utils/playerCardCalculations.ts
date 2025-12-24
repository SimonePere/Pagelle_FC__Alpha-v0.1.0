import { PlayerCard } from '@/types/playerCard';

/**
 * Check if a user has already submitted their version
 */
export const hasUserSubmitted = (card: PlayerCard, userId: string): boolean => {
  return card.submissions.some(s => s.voterId === userId);
};



/**
 * Calcola età da birthdate in formato YYYY-MM-DD
 */
export const calculateAge = (birthdate: string): number => {
  const birth = new Date(birthdate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
};
