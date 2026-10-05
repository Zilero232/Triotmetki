import type { z } from 'zod';

import type { StoredShot } from '../../../analytics';
import type { BattleAccuracy, RollTally } from '../roll-tally/roll-tally.types';
import type { rngWatermarkSchema } from './rng-daily.schemas';

export type DailyRowInput = {
  day: Date;
  scope: string;
  tally: RollTally;
};

export type BattleScopesInput = {
  tier: number | undefined;
  shots: readonly StoredShot[];
  accuracy: BattleAccuracy;
};

export type BattleScope = {
  scope: string;
  shots: readonly StoredShot[];
  accuracy: BattleAccuracy | null;
};

export type RngWatermark = z.infer<typeof rngWatermarkSchema>;
