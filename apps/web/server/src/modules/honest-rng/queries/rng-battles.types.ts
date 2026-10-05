import type { Database } from '../../../core';
import type { RngWatermark } from '../lib/rng-daily/rng-daily.types';
import type { rngBattles, rngBattlesQueries } from './rng-battles.queries';

export type RngBattlesInput = {
  db: Database;
  watermark: RngWatermark | null;
  until: Date;
  limit: number;
};

export type RngBattleRow = Awaited<ReturnType<typeof rngBattles>>[number];

export type RngBattlesQueries = typeof rngBattlesQueries;
