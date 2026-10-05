import type { z } from 'zod';

import type { BEST_BATTLE_SOURCES } from './config/facets.constants';
import type {
  bestBattleMetricSchema,
  bestBattlePeriodSchema,
  bestBattleSchema,
  bestBattlesFacetsQuerySchema,
  bestBattlesFacetsSchema,
  bestBattlesPageSchema,
  bestBattlesQuerySchema
} from './dto/best-battles.schemas';
import type { FeedPageQueryInput } from './queries/best-battles.types';

export type BestBattlePeriod = z.infer<typeof bestBattlePeriodSchema>;

export type BestBattleMetric = z.infer<typeof bestBattleMetricSchema>;

type BestBattleSource = (typeof BEST_BATTLE_SOURCES)[number];

type BestBattlesQuery = z.infer<typeof bestBattlesQuerySchema>;

type BestBattlesFacetsQuery = z.infer<typeof bestBattlesFacetsQuerySchema>;

export type BestBattle = z.infer<typeof bestBattleSchema>;

export type BestBattlesPage = z.infer<typeof bestBattlesPageSchema>;

export type BestBattlesFacets = z.infer<typeof bestBattlesFacetsSchema>;

export type BestBattleRow = {
  source: BestBattleSource;
  battle_id: string;
  account_id: number;
  arena_unique_id: number | null;
  nickname: string | null;
  tank_id: number;
  arena_id: string | null;
  map_name: string | null;
  result: BestBattle['result'];
  damage: number | null;
  assisted: number | null;
  spotted: number | null;
  frags: number | null;
  xp: number | null;
  blocked: number | null;
  medals: string[];
  played_at: Date;
  replay_id: string | null;
};

export type LookupsInput = {
  tankIds: readonly number[];
  arenaIds: readonly string[];
  medalNames: readonly string[];
};

export type TankScopeInput = Pick<BestBattlesQuery, 'tankId' | 'tier' | 'type'>;

export type FeedPageInput = {
  query: BestBattlesQuery;
  now: Date;
};

export type FacetsInput = {
  query: BestBattlesFacetsQuery;
  now: Date;
};

export type CandidatesInput = Omit<FeedPageQueryInput, 'battleTypes' | 'db'>;
