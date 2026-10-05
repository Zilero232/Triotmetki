import type { ExpressionBuilder, QueryCreator } from 'kysely';

import type { DB } from '../../../../generated/kysely/database';
import type { Database } from '../../../core';
import type { BestBattleMetric } from '../best-battles.types';
import type { bestBattlesQueries } from './best-battles.queries';
import type { FeedScope } from './feed-scope.types';

type FacetScope = Pick<FeedScope, 'battleTypes' | 'since'>;

export type FeedPageQueryInput = FeedScope & {
  db: Database;
  metric: BestBattleMetric;
  take: number;
};

export type ReplayFeedRowsInput = FeedScope & {
  db: QueryCreator<DB>;
};

export type FacetFeedInput = FacetScope & {
  db: QueryCreator<DB>;
};

export type FacetLimits = {
  medals: number;
  tanks: number;
  arenas: number;
};

export type FacetsQueryInput = FacetScope & {
  db: Database;
  take: FacetLimits;
};

export type FacetFeedRow = {
  tank_id: number;
  arena_id: string | null;
  damage: number | null;
  medals: string[];
};

export type FacetCountsInput = {
  eb: ExpressionBuilder<DB & { feed: FacetFeedRow }, never>;
  take: number;
};

export type BestBattlesQueries = typeof bestBattlesQueries;
