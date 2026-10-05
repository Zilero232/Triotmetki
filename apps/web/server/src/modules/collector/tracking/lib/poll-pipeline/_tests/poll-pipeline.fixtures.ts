import { vi } from 'vitest';

import type { AccountInfo, AccountTank, BattleStatsBlock, TankStats } from '../../../../../../lib/lesta';
import type { TankBaseline } from '../../account-diff/account-diff.types';
import type { SnapshotMode, TankSnapshotRow } from '../../snapshots/snapshots.types';
import type {
  AccountChanges,
  AccountStorePort,
  LatestTankSnapshotsInput,
  MarkSyncedInput,
  PollLestaPort,
  PollStorePort,
  StoredPlayer,
  UpsertPlayerInput,
  WithAccountInput
} from '../poll-pipeline.types';
import type { FakeLestaInput, FakeStoreInput, InfoInput, TankStatInput } from './poll-pipeline.fixtures.types';

import { SNAPSHOT_MODES } from '../../snapshots/snapshots.constants';

export const block = (battles: number): BattleStatsBlock => ({
  battles,
  wins: Math.floor(battles * 0.55),
  losses: battles - Math.floor(battles * 0.55),
  draws: 0,
  xp: battles * 800,
  damage_dealt: battles * 1800,
  damage_received: battles * 1200,
  frags: battles,
  spotted: battles * 2,
  capture_points: battles,
  dropped_capture_points: battles,
  hits: battles * 7,
  shots: battles * 9,
  survived_battles: Math.floor(battles / 3),
  avg_damage_blocked: 300,
  piercings: battles * 5
});

export const accountInfo = ({ accountId, battles, lastBattleTime }: InfoInput): AccountInfo => ({
  account_id: accountId,
  nickname: `player_${accountId}`,
  clan_id: null,
  global_rating: 5000,
  created_at: 1_500_000_000,
  last_battle_time: lastBattleTime,
  updated_at: lastBattleTime,
  statistics: { all: block(battles + 10), random: block(battles) }
});

export const accountTank = ({ tankId, battles }: TankStatInput): AccountTank => ({
  tank_id: tankId,
  mark_of_mastery: 1,
  statistics: { battles, wins: Math.floor(battles * 0.55) }
});

export const tankStats = ({ tankId, battles, accountId = 1 }: TankStatInput): TankStats => ({
  tank_id: tankId,
  account_id: accountId,
  mark_of_mastery: 1,
  all: block(battles),
  random: block(battles)
});

export const createFakeLesta = ({ infos, tanks, stats, marks = {}, failStatsFor = [] }: FakeLestaInput) => {
  const lesta = {
    accountInfo: vi.fn<PollLestaPort['accountInfo']>(async (ids) => Object.fromEntries(ids.map((id) => [String(id), infos[id] ?? null]))),
    accountTanks: vi.fn<PollLestaPort['accountTanks']>(async (ids) => Object.fromEntries(ids.map((id) => [String(id), tanks[id] ?? null]))),
    tankStats: vi.fn<PollLestaPort['tankStats']>(async ({ accountId, tankIds }) => {
      if (failStatsFor.includes(accountId)) {
        throw new Error('REQUEST_LIMIT_EXCEEDED');
      }

      return (stats[accountId] ?? []).filter((stat) => tankIds.includes(stat.tank_id));
    }),
    tankMarks: vi.fn<PollLestaPort['tankMarks']>(
      async ({ accountId, tankIds }) =>
        new Map(
          Object.entries(marks[accountId] ?? {}).flatMap(([tankId, value]) => (tankIds.includes(Number(tankId)) ? [[Number(tankId), value]] : []))
        )
    )
  } satisfies PollLestaPort;

  return lesta;
};

export const createFakeStore = ({ players = [], baselines = {}, accountBattles = {}, tankSnapshots = [], blocked = [] }: FakeStoreInput) => {
  const written: AccountChanges[] = [];
  const synced: MarkSyncedInput[] = [];
  const upserted: UpsertPlayerInput[] = [];
  const missing: number[] = [];
  const latestAccount = new Map(Object.entries(accountBattles).map(([accountId, modes]) => [Number(accountId), { ...modes }]));
  const latestTanks = [...tankSnapshots];
  const locks = new Map<number, Promise<unknown>>();

  const account: AccountStorePort = {
    latestAccountBattles: vi.fn(async (accountId: number) => {
      const battles = new Map<SnapshotMode, number>();

      for (const mode of SNAPSHOT_MODES) {
        const value = latestAccount.get(accountId)?.[mode];

        if (value !== undefined) {
          battles.set(mode, value);
        }
      }

      return battles;
    }),
    latestTankSnapshots: vi.fn(async ({ accountId, tankIds }: LatestTankSnapshotsInput): Promise<TankSnapshotRow[]> =>
      latestTanks.filter((row) => row.accountId === BigInt(accountId) && tankIds.includes(row.tankId))
    ),
    writeAccountChanges: vi.fn(async (changes: AccountChanges) => {
      written.push(changes);

      for (const row of changes.accountSnapshots) {
        latestAccount.set(changes.accountId, { ...latestAccount.get(changes.accountId), [row.mode]: row.battles });
      }

      for (const row of changes.tankSnapshots) {
        const index = latestTanks.findIndex(
          (stored) => stored.accountId === row.accountId && stored.tankId === row.tankId && stored.mode === row.mode
        );

        latestTanks.splice(index === -1 ? latestTanks.length : index, index === -1 ? 0 : 1, row);
      }
    })
  };

  const store = {
    blockedAccounts: vi.fn(async (ids: readonly number[]) => new Set(ids.filter((id) => blocked.includes(id)))),
    loadPlayers: vi.fn(async (ids: readonly number[]): Promise<StoredPlayer[]> => players.filter((player) => ids.includes(player.accountId))),
    upsertPlayers: vi.fn(async (entries: readonly UpsertPlayerInput[]) => {
      upserted.push(...entries);
    }),
    markSynced: vi.fn(async (entries: readonly MarkSyncedInput[]) => {
      synced.push(...entries);
    }),
    markMissing: vi.fn(async (ids: readonly number[]) => {
      missing.push(...ids);
    }),
    loadBaselines: vi.fn(async (ids: readonly number[]) => new Map<number, TankBaseline[]>(ids.map((id) => [id, baselines[id] ?? []]))),
    overallWn8: vi.fn(async () => null),
    withAccount: async <T>({ accountId, run }: WithAccountInput<T>): Promise<T> => {
      const held = locks.get(accountId) ?? Promise.resolve();
      const next = held.then(async () => run(account));

      locks.set(
        accountId,
        next.catch(() => undefined)
      );

      return next;
    }
  } satisfies PollStorePort;

  return { store, account, written, synced, upserted, missing };
};
