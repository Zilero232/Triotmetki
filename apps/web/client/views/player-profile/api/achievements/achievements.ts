import type { PlayerAchievements } from '@/shared/api/generated';

import { playersControllerAchievements } from '@/shared/api/generated';
import { fromSdk, isNotFoundError } from '@/shared/api/source';

import type { PlayerAchievementsInput } from './achievements.types';

export const getPlayerAchievements = async ({ accountId, signal }: PlayerAchievementsInput): Promise<PlayerAchievements> => {
  try {
    return await fromSdk(() => playersControllerAchievements({ path: { idOrNick: String(accountId) }, signal }));
  } catch (error) {
    if (isNotFoundError(error)) {
      return { items: [] };
    }

    throw error;
  }
};
