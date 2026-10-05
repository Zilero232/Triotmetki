import type { ExpectedValuesTable, PeriodWindow, TankReferenceTable, TankTiers } from '@otmetki/ratings';

import type { Prisma, RatingPeriod, TankSnapshot } from '../../../../../../generated';

export type TankSnapshotTotals = Pick<
  TankSnapshot,
  | 'battles'
  | 'capturedAt'
  | 'capturePoints'
  | 'damageDealt'
  | 'damageReceived'
  | 'droppedCapturePoints'
  | 'frags'
  | 'hits'
  | 'losses'
  | 'shots'
  | 'spotted'
  | 'survived'
  | 'tankId'
  | 'wins'
  | 'xp'
>;

type AccountSnapshotPoint = {
  capturedAt: Date;
  battles: number;
};

export type EarliestCutoffInput = Omit<PeriodCutoffInput, 'window'>;

export type PeriodCutoffInput = {
  window: PeriodWindow;
  accountSnapshots: readonly AccountSnapshotPoint[];
  now: Date;
};

export type RatingHistoryBounds = {
  since: Date;
  battles: number;
};

export type PeriodCutoff = {
  cutoff: Date;
  isPartial: boolean;
};

export type TankPeriodTotalsInput = {
  tankSnapshots: readonly TankSnapshotTotals[];
  cutoff: Date | null;
};

export type BuildAccountRatingsInput = {
  accountId: bigint;
  accountSnapshots: readonly AccountSnapshotPoint[];
  tankSnapshots: readonly TankSnapshotTotals[];
  expected: ExpectedValuesTable;
  tiers: TankTiers;
  references: TankReferenceTable;
  now: Date;
};

export type AccountRatingsResult = {
  ratings: Prisma.AccountRatingCreateManyInput[];
  tankRatings: Prisma.AccountTankRatingCreateManyInput[];
};

export type PeriodRowsInput = {
  input: BuildAccountRatingsInput;
  period: RatingPeriod;
  cutoff: Date | null;
};
