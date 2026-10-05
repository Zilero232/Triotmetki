import type { TankMapSample } from '@otmetki/schemas';

import { TANK_MAPS } from '@otmetki/schemas';

import type { MapSampleCounts } from './map-sample.types';

import { winRatePercent } from '../../../../common/lib';

export const toMapSample = ({ battles, wins, avgDamage }: MapSampleCounts): TankMapSample => {
  const isEnough = battles >= TANK_MAPS.minBattles;

  return {
    battles,
    isEnough,
    winRate: isEnough ? winRatePercent({ wins, battles }) : null,
    avgDamage: isEnough && avgDamage !== null ? Math.round(avgDamage) : null
  };
};
