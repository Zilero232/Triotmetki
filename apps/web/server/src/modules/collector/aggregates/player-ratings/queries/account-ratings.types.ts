import type { Prisma } from '../../../../../../generated';
import type { Database } from '../../../../../core';
import type { PLAYER_RATINGS_AGGREGATE } from '../config/player-ratings.constants';

type RatingMode = (typeof PLAYER_RATINGS_AGGREGATE.ratingModes)[number];

export type AccountSnapshotWindowInput = {
  db: Database;
  accountId: number;
  mode: RatingMode;
  since: Date;
  battles: number;
};

export type TankBoundaryInput = {
  db: Database;
  accountId: number;
  mode: RatingMode;
  cutoff: Date;
};

export type ReplaceAccountRatingsInput = {
  db: Database;
  accountId: number;
  rows: readonly Prisma.AccountRatingCreateManyInput[];
};

export type ReplaceAccountTankRatingsInput = {
  db: Database;
  accountId: number;
  rows: readonly Prisma.AccountTankRatingCreateManyInput[];
};

export type ToRatingValuesInput = {
  accountId: number;
  row: Prisma.AccountRatingCreateManyInput;
};

export type ToTankRatingValuesInput = {
  accountId: number;
  row: Prisma.AccountTankRatingCreateManyInput;
};
