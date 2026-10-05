import type { AccountInfo, AccountTank, TankStats } from '../../../../../../lib/lesta';
import type { TankBaseline } from '../../account-diff/account-diff.types';
import type { SnapshotMode, TankSnapshotRow } from '../../snapshots/snapshots.types';
import type { StoredPlayer } from '../poll-pipeline.types';

export type InfoInput = {
  accountId: number;
  battles: number;
  lastBattleTime: number;
};

export type TankStatInput = {
  tankId: number;
  battles: number;
  accountId?: number;
};

export type FakeLestaInput = {
  infos: Record<number, AccountInfo>;
  tanks: Record<number, AccountTank[]>;
  stats: Record<number, TankStats[]>;
  marks?: Record<number, Record<number, number>>;
  failStatsFor?: number[];
};

export type FakeStoreInput = {
  players?: StoredPlayer[];
  baselines?: Record<number, TankBaseline[]>;
  accountBattles?: Record<number, Partial<Record<SnapshotMode, number>>>;
  tankSnapshots?: TankSnapshotRow[];
  blocked?: number[];
};
