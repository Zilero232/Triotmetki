import { PROGRESSION_REWARDS, tankChallengeMetricSchema, tankLevelOf } from '@otmetki/schemas';

import type { TankChallengeProgress } from '../../../../generated';
import type { TankChallengeSet, TankProgressItem, TankProgressRow } from './tank-progress-view.types';

import { toNumber } from '../../../common/lib';

export const toTankProgressItem = (row: TankProgressRow): TankProgressItem => {
  const { level, levelXp, nextLevelXp } = tankLevelOf(row.progressXp);

  return {
    accountId: toNumber(row.accountId),
    tankId: row.tankId,
    level,
    xp: row.progressXp,
    levelXp,
    nextLevelXp,
    battles: row.progressBattles,
    updatedAt: row.updatedAt.toISOString()
  };
};

export const toTankChallengeSet = (items: readonly [TankChallengeProgress, ...TankChallengeProgress[]]): TankChallengeSet => ({
  accountId: toNumber(items[0].accountId),
  tankId: items[0].tankId,
  items: items.flatMap((row) => {
    const metric = tankChallengeMetricSchema.safeParse(row.metric);

    return metric.success
      ? [
          {
            code: row.code,
            metric: metric.data,
            target: row.target,
            threshold: row.threshold,
            progress: Math.min(row.progress, row.target),
            completedAt: row.completedAt?.toISOString() ?? null,
            shells: PROGRESSION_REWARDS.challengeShells,
            points: PROGRESSION_REWARDS.challengePoints
          }
        ]
      : [];
  })
});
