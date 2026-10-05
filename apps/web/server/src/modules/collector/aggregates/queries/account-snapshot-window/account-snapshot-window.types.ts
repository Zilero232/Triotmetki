import type { StatsMode } from '../../../../../../generated';

export type AccountSnapshotWindowSqlInput = {
  accountId: bigint;
  mode: StatsMode;
  since: Date;
  battles: number;
};

export type AccountSnapshotPointRow = {
  capturedAt: Date;
  battles: number;
};
