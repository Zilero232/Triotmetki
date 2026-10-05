import type { LatestCatalogUsageInput } from './builds-catalog.types';

export const latestCatalogUsage = ({ db, mode, cohort }: LatestCatalogUsageInput) =>
  db
    .selectFrom('build_usage_aggregate')
    .distinctOn('tank_id')
    .select(['tank_id as tankId', 'battles', 'players', 'win_rate as winRate', 'avg_damage as avgDamage', 'usage', 'computed_at as computedAt'])
    .where('mode', '=', mode)
    .where('cohort', '=', cohort)
    .orderBy('tank_id')
    .orderBy('computed_at', 'desc')
    .execute();

export const BUILDS_CATALOG_QUERIES = { latestCatalogUsage } as const;
