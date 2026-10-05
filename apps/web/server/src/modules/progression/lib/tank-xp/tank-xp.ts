import { sumBy } from 'remeda';

import type { XpOfSamplesInput } from './tank-xp.types';

import { TANK_XP } from '../../config/tank-xp.constants';

export const xpOfSamples = ({ samples, tier }: XpOfSamplesInput): number => {
  const damageUnit = Math.max(tier, TANK_XP.minTier) * TANK_XP.damagePerTierPoint;

  return sumBy(
    samples,
    (sample) =>
      sample.battles * TANK_XP.perBattle +
      sample.wins * TANK_XP.perWin +
      sample.frags * TANK_XP.perFrag +
      sample.spotted * TANK_XP.perSpot +
      Math.floor(sample.damage / damageUnit)
  );
};
