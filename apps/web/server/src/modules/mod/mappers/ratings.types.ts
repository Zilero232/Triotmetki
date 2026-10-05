import type { ExpectedValues } from '@otmetki/ratings';

import type { TankRecordRow } from '../queries/ratings.types';
import type { LatestSessionRow, OverallRatingRow, OwnTankRow, TankRatingRow, TankTotalsRow } from '../selects/ratings.selects';

export type ModOverviewInput = {
  accountId: bigint;
  rating: OverallRatingRow | null;
  session: LatestSessionRow | null;
};

export type ModTankRatingInput = {
  tankId: number;
  tank: OwnTankRow | undefined;
  rating: TankRatingRow | undefined;
  totals: TankTotalsRow | undefined;
  records: TankRecordRow | undefined;
  expected: ExpectedValues | undefined;
};

export type ModTankRecordsInput = Pick<ModTankRatingInput, 'records' | 'totals'>;
