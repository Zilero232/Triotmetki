import type { Database } from '../../../core';
import type { mapSamples, mapSamplesQueries } from './map-samples.queries';

export type MapSamplesScope = { arenaId: string } | { tankId: number };

export type MapSamplesInput = {
  db: Database;
  scope: MapSamplesScope;
  since: Date;
  battleType: string;
};

export type MapSampleRow = Awaited<ReturnType<typeof mapSamples>>[number];

export type MapSamplesQueries = typeof mapSamplesQueries;
