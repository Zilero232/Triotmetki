import type { z } from 'zod';

import type { honestRngMineSchema, honestRngSchema, rngLuckSchema, rngPeriodSchema, rngSummarySchema } from './dto/honest-rng.schemas';
import type { RngWatermark } from './lib/rng-daily/rng-daily.types';
import type { RollTally } from './lib/roll-tally/roll-tally.types';
import type { RngBattleRow } from './queries/rng-battles.types';

export type RngPeriod = z.infer<typeof rngPeriodSchema>;

export type RngLuck = z.infer<typeof rngLuckSchema>;

export type RngSummary = z.infer<typeof rngSummarySchema>;

export type HonestRngView = z.infer<typeof honestRngSchema>;

export type HonestRngMine = z.infer<typeof honestRngMineSchema>;

export type RngMineInput = {
  userId: string;
  period: RngPeriod;
};

export type DayTally = {
  day: Date;
  scope: string;
  tally: RollTally;
};

export type StoreDailyInput = {
  tallies: DayTally[];
  watermark: RngWatermark;
};

export type TallyChunkInput = {
  chunk: RngBattleRow[];
  tiers: Map<number, number>;
};
