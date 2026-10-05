import type { BuildCohort, GameMode } from '../../../../generated/kysely/enums';
import type { Database } from '../../../core';
import type { BUILDS_CATALOG_QUERIES, latestCatalogUsage } from './builds-catalog.queries';

export type LatestCatalogUsageInput = {
  db: Database;
  mode: GameMode;
  cohort: BuildCohort;
};

export type CatalogUsageRow = Awaited<ReturnType<typeof latestCatalogUsage>>[number];

export type BuildsCatalogQueries = typeof BUILDS_CATALOG_QUERIES;
