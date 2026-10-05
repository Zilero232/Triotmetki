import type { Prisma } from '../../../../../../generated';
import type { TankMarks } from '../../lib/marks-gain';
import type { PlayerIdentity } from '../../lib/player-identity';

export type { AccountModeRow, TankModeRow } from '../../lib/mode-stats';

export type PlayerTankUpsertRow = Pick<
  Prisma.PlayerTankCreateManyInput,
  'accountId' | 'battles' | 'lastBattleAt' | 'markOfMastery' | 'tankId' | 'wins'
>;

export type LatestTanksSqlInput = {
  accountId: bigint;
  capturedAt: Date;
};

export type LatestRandomModeStatsSqlInput = {
  accountId: bigint;
  capturedAt: Date;
};

export type SyncedRow = {
  accountId: number;
  lastBattleAt: Date | null;
  lastPolledAt: Date;
  nextPollAt: Date;
};

export type MarksRow = TankMarks;

export type PlayerIdentityRow = PlayerIdentity & {
  seenAt: Date;
};
