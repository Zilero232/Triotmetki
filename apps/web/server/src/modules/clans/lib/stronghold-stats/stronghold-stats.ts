import type { StrongholdBattles } from '@otmetki/schemas';

import type { RawBuilding, SkirmishStatistics } from './stronghold-stats.types';

import { percentOf } from '../../../../common/lib';
import { STRONGHOLD } from '../../config/stronghold.constants';
import { rawBuildingSchema } from '../../dto/stronghold.schemas';

export const strongholdCount = (value: number | null | undefined): number | null =>
  value === null || value === undefined || !Number.isFinite(value) ? null : Math.max(0, Math.round(value));

export const readBuildings = (value: unknown): RawBuilding[] => {
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      const parsed = rawBuildingSchema.safeParse(item);

      return parsed.success ? [parsed.data] : [];
    });
  }

  return value && typeof value === 'object' ? readBuildings(Object.values(value)) : [];
};

export const skirmishTiers = (statistics: SkirmishStatistics): StrongholdBattles[] =>
  STRONGHOLD.tiers.flatMap((tier) => {
    const battles = strongholdCount(statistics?.[STRONGHOLD.totalKey(tier)]) ?? 0;
    const wins = Math.min(battles, strongholdCount(statistics?.[STRONGHOLD.winKey(tier)]) ?? 0);

    return battles > 0 ? [{ tier, battles, wins, winRate: percentOf({ value: wins, by: battles }) }] : [];
  });
