import { winRate } from '@otmetki/ratings';
import { fromUnixTime } from 'date-fns';
import pLimit from 'p-limit';
import { isIncludedIn, unique } from 'remeda';

import type { Prisma } from '../../../../../../generated';
import type { AccountInfo } from '../../../../../lib/lesta';
import type { TankSnapshotRow } from '../snapshots';
import type {
  BuildChangesInput,
  MarkSyncedInput,
  PollResult,
  ProcessAccountInput,
  ProcessAccountResult,
  RunPollPipelineInput
} from './poll-pipeline.types';

import { diffAccountTanks, hasNewBattles } from '../account-diff';
import { assignCohort } from '../cohort';
import { accountModeRows, tankModeRows } from '../mode-stats';
import { accountSnapshotRow, buildTankDelta, modeBlocks, shouldWriteSnapshot, tankSnapshotRow } from '../snapshots';
import { POLL_PIPELINE } from './poll-pipeline.constants';

const snapshotKey = (row: Pick<TankSnapshotRow, 'mode' | 'tankId'>) => `${row.tankId}:${row.mode}`;

const writeChanges = async ({ store, info, tanks, stats, marks, masteryOnlyTankIds, wn8, now }: BuildChangesInput): Promise<ProcessAccountResult> => {
  const accountId = info.account_id;
  const id = BigInt(accountId);
  const latestAccount = await store.latestAccountBattles(accountId);

  const accountSnapshots = modeBlocks(info.statistics)
    .filter(({ mode, block }) => {
      const battles = latestAccount.get(mode);

      return shouldWriteSnapshot({ previous: battles === undefined ? null : { battles }, battles: block.battles });
    })
    .map(({ mode, block }) => accountSnapshotRow({ accountId: id, capturedAt: now, mode, block, globalRating: info.global_rating }));

  const tankSnapshots: TankSnapshotRow[] = [];
  const deltas: Prisma.TankBattleDeltaCreateManyInput[] = [];
  const statsTankIds = new Set<number>();

  if (stats.length > 0) {
    const previous = new Map(
      (await store.latestTankSnapshots({ accountId, tankIds: stats.map((stat) => stat.tank_id) })).map((row) => [snapshotKey(row), row])
    );

    const reference = info.statistics.random ?? info.statistics.all;
    const accountWinRate = winRate(reference);
    const cohort = assignCohort({ battles: reference.battles, winRate: accountWinRate, wn8 });

    for (const stat of stats) {
      statsTankIds.add(stat.tank_id);

      for (const { mode, block } of modeBlocks(stat)) {
        const row = tankSnapshotRow({ accountId: id, capturedAt: now, mode, block, stats: stat, marksOnGun: marks?.get(stat.tank_id) });
        const before = previous.get(snapshotKey(row));

        if (!shouldWriteSnapshot({ previous: before, battles: row.battles })) {
          continue;
        }

        tankSnapshots.push(row);

        const delta = buildTankDelta({ previous: before, current: row, cohort, accountWinRate });

        if (delta) {
          deltas.push(delta);
        }
      }
    }
  }

  const masteryOnly = new Set(masteryOnlyTankIds);
  const lastBattleAt = fromUnixTime(info.last_battle_time);

  const baseline = tanks
    .filter((tank) => statsTankIds.has(tank.tank_id) || masteryOnly.has(tank.tank_id))
    .map((tank) => ({
      accountId: id,
      tankId: tank.tank_id,
      battles: tank.statistics.battles,
      wins: tank.statistics.wins,
      markOfMastery: tank.mark_of_mastery,
      lastBattleAt: statsTankIds.has(tank.tank_id) ? lastBattleAt : undefined
    }));

  const modeStats = accountModeRows({ accountId: id, statistics: info.statistics });
  const tankModeStats = tankModeRows({ accountId: id, stats });
  const lestaMarks = marks ? [...marks].map(([tankId, value]) => ({ accountId: id, tankId, marks: value })) : undefined;
  const writes =
    accountSnapshots.length + tankSnapshots.length + baseline.length + modeStats.length + tankModeStats.length + (lestaMarks?.length ?? 0);

  if (writes > 0) {
    await store.writeAccountChanges({ accountId, accountSnapshots, tankSnapshots, deltas, baseline, modeStats, tankModeStats, lestaMarks });
  }

  return { snapshots: accountSnapshots.length + tankSnapshots.length, deltas: deltas.length };
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

export const runPollPipeline = async ({ ports, accountIds, tier, promote = false, now = new Date() }: RunPollPipelineInput): Promise<PollResult> => {
  const { lesta, store } = ports;
  const result: PollResult = {
    requested: accountIds.length,
    blocked: [],
    missing: [],
    unchanged: [],
    updated: [],
    failed: [],
    snapshots: 0,
    deltas: 0
  };

  const blocked = await store.blockedAccounts(accountIds);
  const allowed = unique(accountIds.filter((accountId) => !blocked.has(accountId)));

  result.blocked = accountIds.filter((accountId) => blocked.has(accountId));

  if (allowed.length === 0) {
    return result;
  }

  const infos = await lesta.accountInfo(allowed);
  const players = new Map((await store.loadPlayers(allowed)).map((player) => [player.accountId, player]));
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
    await store.markMissing(result.missing);
  }

  const toScan: AccountInfo[] = [];
  const synced: MarkSyncedInput[] = [];

  await store.upsertPlayers(present.map((info) => ({ info, previous: players.get(info.account_id), tier, promote, now })));

  for (const info of present) {
    const previous = players.get(info.account_id);

    const scan = hasNewBattles({
      storedLastBattleAt: previous?.lastBattleAt,
      lastBattleTime: info.last_battle_time,
      neverScanned: !previous?.lastPolledAt
    });

    if (scan) {
      toScan.push(info);
    } else {
      synced.push({ accountId: info.account_id, lastBattleAt: previous?.lastBattleAt ?? null, now });
      result.unchanged.push(info.account_id);
    }
  }

  if (toScan.length > 0) {
    const scanIds = toScan.map((info) => info.account_id);
    const tanksByAccount = await lesta.accountTanks(scanIds);
    const baselines = await store.loadBaselines(scanIds);

    const limit = pLimit(POLL_PIPELINE.accountConcurrency);

    await Promise.all(
      toScan.map((info) =>
        limit(async () => {
          const accountId = info.account_id;

          try {
            const outcome = await processAccount({
              ports,
              info,
              tanks: tanksByAccount[String(accountId)] ?? [],
              baseline: baselines.get(accountId) ?? [],
              tier,
              now
            });

            synced.push({ accountId, lastBattleAt: fromUnixTime(info.last_battle_time), now });
            result.snapshots += outcome.snapshots;
            result.deltas += outcome.deltas;
            (outcome.snapshots > 0 ? result.updated : result.unchanged).push(accountId);
          } catch (error) {
            result.failed.push(accountId);
            ports.onError?.({ accountId, error });
          }
        })
      )
    );
  }

  if (synced.length > 0) {
    await store.markSynced(synced);
  }

  return result;
};
