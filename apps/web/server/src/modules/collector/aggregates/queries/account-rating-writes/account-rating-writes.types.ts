import type { Prisma } from '../../../../../../generated';

export type ReplaceAccountRatingsSqlInput = {
  accountId: bigint;
  rows: readonly Prisma.AccountRatingCreateManyInput[];
};

export type ReplaceAccountTankRatingsSqlInput = {
  accountId: bigint;
  rows: readonly Prisma.AccountTankRatingCreateManyInput[];
};
