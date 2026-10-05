import { winRate } from '@otmetki/ratings';
import { fromUnixTime } from 'date-fns';
import pLimit from 'p-limit';
import { isIncludedIn, unique } from 'remeda';

import type { Prisma } from '../../../../../../generated';
import type { AccountInfo } from '../../../../../lib/lesta';
import type { TankSnapshotRow } from '../snapshots';
import type {
  AccountSnapshotsInput,
  BaselineRowsInput,
  BuildChangesInput,
  LoadPresentInput,
  MarkSyncedInput,
  PollResult,
  PresentAccounts,
  ProcessAccountInput,
  ProcessAccountResult,
  RunPollPipelineInput,
  ScanAccountsInput,
  SplitByNewBattlesInput,
  TankChanges,
  TankChangesInput
} from './poll-pipeline.types';

import { diffAccountTanks, hasNewBattles } from '../account-diff';
import { assignCohort } from '../cohort';
import { accountModeRows, tankModeRows } from '../mode-stats';
import { accountSnapshotRow, buildTankDelta, modeBlocks, shouldWriteSnapshot, tankSnapshotRow } from '../snapshots';
import { POLL_PIPELINE } from './poll-pipeline.constants';

const snapshotKey = (row: Pick<TankSnapshotRow, 'mode' | 'tankId'>) => `${row.tankId}:${row.mode}`;

const accountSnapshots = async ({ store, info, now }: AccountSnapshotsInput): Promise<Prisma.AccountSnapshotCreateManyInput[]> => {
  const latestAccount = await store.latestAccountBattles(info.account_id);

  return modeBlocks(info.statistics)
    .filter(({ mode, block }) => {
      const battles = latestAccount.get(mode);

      return shouldWriteSnapshot({ previous: battles === undefined ? null : { battles }, battles: block.battles });
    })
    .map(({ mode, block }) =>
      accountSnapshotRow({ accountId: BigInt(info.account_id), capturedAt: now, mode, block, globalRating: info.global_rating })
    );
};

const tankChanges = async ({ store, info, stats, marks, wn8, now }: TankChangesInput): Promise<TankChanges> => {
  const changes: TankChanges = { tankSnapshots: [], deltas: [], statsTankIds: new Set() };

  if (stats.length === 0) {
    return changes;
  }

  const latest = await store.latestTankSnapshots({ accountId: info.account_id, tankIds: stats.map((stat) => stat.tank_id) });
  const previous = new Map(latest.map((row) => [snapshotKey(row), row]));
  const reference = info.statistics.random ?? info.statistics.all;
  const accountWinRate = winRate(reference);
  const cohort = assignCohort({ battles: reference.battles, winRate: accountWinRate, wn8 });

  for (const stat of stats) {
    changes.statsTankIds.add(stat.tank_id);

    for (const { mode, block } of modeBlocks(stat)) {
      const row = tankSnapshotRow({
        accountId: BigInt(info.account_id),
        capturedAt: now,
        mode,
        block,
        stats: stat,
        marksOnGun: marks?.get(stat.tank_id)
      });

      const before = previous.get(snapshotKey(row));

      if (!shouldWriteSnapshot({ previous: before, battles: row.battles })) {
        continue;
      }

      changes.tankSnapshots.push(row);

      const delta = buildTankDelta({ previous: before, current: row, cohort, accountWinRate });

      if (delta) {
        changes.deltas.push(delta);
      }
    }
  }

  return changes;
};

const baselineRows = ({ info, tanks, statsTankIds, masteryOnlyTankIds }: BaselineRowsInput): Prisma.PlayerTankCreateManyInput[] => {
  const masteryOnly = new Set(masteryOnlyTankIds);
  const lastBattleAt = fromUnixTime(info.last_battle_time);

  return tanks
    .filter((tank) => statsTankIds.has(tank.tank_id) || masteryOnly.has(tank.tank_id))
    .map((tank) => ({
      accountId: BigInt(info.account_id),
      tankId: tank.tank_id,
      battles: tank.statistics.battles,
      wins: tank.statistics.wins,
      markOfMastery: tank.mark_of_mastery,
      lastBattleAt: statsTankIds.has(tank.tank_id) ? lastBattleAt : undefined
    }));
};

const writeChanges = async (input: BuildChangesInput): Promise<ProcessAccountResult> => {
  const { store, info, tanks, stats, marks, masteryOnlyTankIds } = input;
  const accountId = info.account_id;
  const id = BigInt(accountId);
  const accountRows = await accountSnapshots(input);
  const { tankSnapshots, deltas, statsTankIds } = await tankChanges(input);
  const baseline = baselineRows({ info, tanks, statsTankIds, masteryOnlyTankIds });
  const modeStats = accountModeRows({ accountId: id, statistics: info.statistics });
  const tankModeStats = tankModeRows({ accountId: id, stats });
  const lestaMarks = marks ? [...marks].map(([tankId, value]) => ({ accountId: id, tankId, marks: value })) : undefined;
  const writes = accountRows.length + tankSnapshots.length + baseline.length + modeStats.length + tankModeStats.length + (lestaMarks?.length ?? 0);

  if (writes > 0) {
    await store.writeAccountChanges({
      accountId,
      accountSnapshots: accountRows,
      tankSnapshots,
      deltas,
      baseline,
      modeStats,
      tankModeStats,
      lestaMarks
    });
  }

  return { snapshots: accountRows.length + tankSnapshots.length, deltas: deltas.length };
};

const processAccount = async ({ ports, info, tanks, baseline, tier, now }: ProcessAccountInput): Promise<ProcessAccountResult> => {
  const { lesta, store } = ports;
  const accountId = info.account_id;
  const { changedTankIds, masteryOnlyTankIds } = diffAccountTanks({ baseline, current: tanks });
  const scan = changedTankIds.length > 0;
  const [stats, marks, wn8] = scan
    ? await Promise.all([
        lesta.tankStats({ accountId, tankIds: changedTankIds }),
        isIncludedIn(tier, POLL_PIPELINE.marksTiers) ? lesta.tankMarks({ accountId, tankIds: changedTankIds }) : null,
        store.overallWn8(accountId)
      ])
    : [[], null, null];

  return store.withAccount({
    accountId,
    run: (locked) => writeChanges({ store: locked, info, tanks, stats, marks, masteryOnlyTankIds, wn8, now })
  });
};

const emptyResult = (accountIds: readonly number[]): PollResult => ({
  requested: accountIds.length,
  blocked: [],
  missing: [],
  unchanged: [],
  updated: [],
  failed: [],
  snapshots: 0,
  deltas: 0
});

const loadPresent = async ({ ports, allowed, result }: LoadPresentInput): Promise<PresentAccounts> => {
  const infos = await ports.lesta.accountInfo(allowed);
  const players = new Map((await ports.store.loadPlayers(allowed)).map((player) => [player.accountId, player]));
  const present: AccountInfo[] = [];

  for (const accountId of allowed) {
    const info = infos[String(accountId)];

    if (info) {
      present.push(info);
    } else {
      result.missing.push(accountId);
    }
  }

  if (result.missing.length > 0) {
    await ports.store.markMissing(result.missing);
  }

  return { present, players };
};

const splitByNewBattles = ({ present, players, now, result, synced }: SplitByNewBattlesInput): AccountInfo[] =>
  present.filter((info) => {
    const previous = players.get(info.account_id);

    const scan = hasNewBattles({
      storedLastBattleAt: previous?.lastBattleAt,
      lastBattleTime: info.last_battle_time,
      neverScanned: !previous?.lastPolledAt
    });

    if (!scan) {
      synced.push({ accountId: info.account_id, lastBattleAt: previous?.lastBattleAt ?? null, now });
      result.unchanged.push(info.account_id);
    }

    return scan;
  });

const scanAccounts = async ({ ports, toScan, tier, now, result, synced }: ScanAccountsInput): Promise<void> => {
  const scanIds = toScan.map((info) => info.account_id);
  const tanksByAccount = await ports.lesta.accountTanks(scanIds);
  const baselines = await ports.store.loadBaselines(scanIds);
  const limit = pLimit(POLL_PIPELINE.accountConcurrency);

  const scanOne = async (info: AccountInfo) => {
    const accountId = info.account_id;

    try {
      const tanks = tanksByAccount[String(accountId)] ?? [];
      const outcome = await processAccount({ ports, info, tanks, baseline: baselines.get(accountId) ?? [], tier, now });

      synced.push({ accountId, lastBattleAt: fromUnixTime(info.last_battle_time), now });
      result.snapshots += outcome.snapshots;
      result.deltas += outcome.deltas;
      (outcome.snapshots > 0 ? result.updated : result.unchanged).push(accountId);
    } catch (error) {
      result.failed.push(accountId);
      ports.onError?.({ accountId, error });
    }
  };

  await Promise.all(toScan.map((info) => limit(async () => scanOne(info))));
};

export const runPollPipeline = async ({ ports, accountIds, tier, promote = false, now = new Date() }: RunPollPipelineInput): Promise<PollResult> => {
  const result = emptyResult(accountIds);
  const blocked = await ports.store.blockedAccounts(accountIds);
  const allowed = unique(accountIds.filter((accountId) => !blocked.has(accountId)));

  result.blocked = accountIds.filter((accountId) => blocked.has(accountId));

  if (allowed.length === 0) {
    return result;
  }

  const { present, players } = await loadPresent({ ports, allowed, result });
  const synced: MarkSyncedInput[] = [];

  await ports.store.upsertPlayers(present.map((info) => ({ info, previous: players.get(info.account_id), tier, promote, now })));

  const toScan = splitByNewBattles({ present, players, now, result, synced });

  if (toScan.length > 0) {
    await scanAccounts({ ports, toScan, tier, now, result, synced });
  }

  if (synced.length > 0) {
    await ports.store.markSynced(synced);
  }

  return result;
};
