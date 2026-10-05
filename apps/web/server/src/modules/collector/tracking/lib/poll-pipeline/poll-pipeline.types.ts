import type { Prisma, TrackingTier } from '../../../../../../generated';
import type { AccountInfo, AccountTank, TankStats } from '../../../../../lib/lesta';
import type { TankBaseline } from '../account-diff';
import type { TankMarks } from '../marks-gain';
import type { AccountModeRow, TankModeRow } from '../mode-stats';
import type { SnapshotMode, TankSnapshotRow } from '../snapshots';

type TankStatsRequest = {
  accountId: number;
  tankIds: readonly number[];
};

export type PollLestaPort = {
  accountInfo: (accountIds: readonly number[]) => Promise<Record<string, AccountInfo | null>>;
  accountTanks: (accountIds: readonly number[]) => Promise<Record<string, AccountTank[] | null>>;
  tankStats: (request: TankStatsRequest) => Promise<TankStats[]>;
  tankMarks: (request: TankStatsRequest) => Promise<Map<number, number>>;
};

export type StoredPlayer = {
  accountId: number;
  clanId: number | null;
  lastBattleAt: Date | null;
  lastPolledAt: Date | null;
  trackingTier: TrackingTier;
};

export type UpsertPlayerInput = {
  info: AccountInfo;
  previous: StoredPlayer | undefined;
  tier: TrackingTier;
  promote: boolean;
  now: Date;
};

export type MarkSyncedInput = {
  accountId: number;
  lastBattleAt: Date | null;
  now: Date;
};

export type LatestTankSnapshotsInput = {
  accountId: number;
  tankIds: readonly number[];
};

export type AccountChanges = {
  accountId: number;
  accountSnapshots: Prisma.AccountSnapshotCreateManyInput[];
  tankSnapshots: TankSnapshotRow[];
  deltas: Prisma.TankBattleDeltaCreateManyInput[];
  baseline: Prisma.PlayerTankCreateManyInput[];
  modeStats?: AccountModeRow[];
  tankModeStats?: TankModeRow[];
  lestaMarks?: TankMarks[];
};

export type AccountStorePort = {
  latestAccountBattles: (accountId: number) => Promise<Map<SnapshotMode, number>>;
  latestTankSnapshots: (input: LatestTankSnapshotsInput) => Promise<TankSnapshotRow[]>;
  writeAccountChanges: (changes: AccountChanges) => Promise<void>;
};

export type WithAccountInput<T> = {
  accountId: number;
  run: (store: AccountStorePort) => Promise<T>;
};

export type PollStorePort = {
  blockedAccounts: (accountIds: readonly number[]) => Promise<Set<number>>;
  loadPlayers: (accountIds: readonly number[]) => Promise<StoredPlayer[]>;
  upsertPlayers: (entries: readonly UpsertPlayerInput[]) => Promise<void>;
  markSynced: (entries: readonly MarkSyncedInput[]) => Promise<void>;
  markMissing: (accountIds: readonly number[]) => Promise<void>;
  loadBaselines: (accountIds: readonly number[]) => Promise<Map<number, TankBaseline[]>>;
  overallWn8: (accountId: number) => Promise<number | null>;
  withAccount: <T>(input: WithAccountInput<T>) => Promise<T>;
};

type PollErrorInput = {
  accountId: number;
  error: unknown;
};

type PollPorts = {
  lesta: PollLestaPort;
  store: PollStorePort;
  onError?: (input: PollErrorInput) => void;
};

export type RunPollPipelineInput = {
  ports: PollPorts;
  accountIds: readonly number[];
  tier: TrackingTier;
  promote?: boolean;
  now?: Date;
};

export type PollResult = {
  requested: number;
  blocked: number[];
  missing: number[];
  unchanged: number[];
  updated: number[];
  failed: number[];
  snapshots: number;
  deltas: number;
};

export type ProcessAccountInput = {
  ports: PollPorts;
  info: AccountInfo;
  tanks: readonly AccountTank[];
  baseline: readonly TankBaseline[];
  tier: TrackingTier;
  now: Date;
};

export type ProcessAccountResult = {
  snapshots: number;
  deltas: number;
};

export type BuildChangesInput = {
  store: AccountStorePort;
  info: AccountInfo;
  tanks: readonly AccountTank[];
  stats: readonly TankStats[];
  marks: Map<number, number> | null;
  masteryOnlyTankIds: readonly number[];
  wn8: number | null;
  now: Date;
};
