import type { StreakInput } from './overlay-data.types';

export const winStreak = ({ results }: StreakInput): number => {
  const index = results.findIndex((result) => result !== 'win');

  return index === -1 ? results.length : index;
};
