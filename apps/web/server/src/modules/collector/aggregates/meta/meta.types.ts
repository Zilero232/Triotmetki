import type { CohortRank } from './lib/build-usage';
import type { metaQueries } from './providers/meta-queries.provider';

export type MetaQueries = typeof metaQueries;

export type ComputeTankUsageInput = {
  tankId: number;
  since: Date;
  battleTypes: string[];
  gameVersion: string;
  ranks: CohortRank[];
};

export type UsageSamplesInput = Pick<ComputeTankUsageInput, 'battleTypes' | 'since' | 'tankId'>;
