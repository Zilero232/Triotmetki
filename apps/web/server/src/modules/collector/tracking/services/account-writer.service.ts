import { Inject, Injectable } from '@nestjs/common';
import { addDays } from 'date-fns';
import { groupBy } from 'remeda';

import type { TankBaseline } from '../lib/account-diff';
import type { GainedMark } from '../lib/marks-gain';
import type { AccountStorePort, WithAccountInput } from '../lib/poll-pipeline';
import type { SnapshotMode, TankSnapshotRow } from '../lib/snapshots';
import type { AccountWriteQueries } from '../queries/account-writes.types';
import type {
  AccountStoreInput,
  LatestAccountBattlesInput,
  LatestTanksInput,
  RebuildDaySessionInput,
  StoredMarksInput,
  WriteAccountChangesInput,
  WritePlayerTanksInput
} from '../tracking.types';

import { moscowCalendarDate, moscowDayStart } from '../../../../common/lib';
import { lockedTransaction, PrismaService } from '../../../../core';
import { ExpectedValuesService } from '../../../reference';
import { TRACKING, TRACKING_TOKENS } from '../config/tracking.constants';
import { buildDaySession } from '../lib/day-session';
import { gainedMarks, snapshotMarks } from '../lib/marks-gain';
import { SNAPSHOT_MODES } from '../lib/snapshots';
import { DAY_SESSION_DELTA_SELECT } from '../selects/day-session.selects';
import { TrackingAnnounceService } from './tracking-announce.service';

@Injectable()
export class AccountWriterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly announce: TrackingAnnounceService,
    private readonly expected: ExpectedValuesService,
    @Inject(TRACKING_TOKENS.accountWriteQueries) private readonly queries: AccountWriteQueries
  ) {}

  async loadBaselines(accountIds: readonly number[]): Promise<Map<number, TankBaseline[]>> {
    const rows = await this.prisma.playerTank.findMany({
      where: { accountId: { in: accountIds.map(BigInt) } },
      select: { accountId: true, tankId: true, battles: true, markOfMastery: true }
    });

    const grouped = groupBy(rows, (row) => String(row.accountId));

    return new Map(
      accountIds.map((accountId) => [
        accountId,
        (grouped[String(accountId)] ?? []).map((row) => ({ tankId: row.tankId, battles: row.battles, markOfMastery: row.markOfMastery }))
      ])
    );
  }

  async overallWn8(accountId: number): Promise<number | null> {
    const rating = await this.prisma.accountRating.findUnique({
      where: { accountId_period: { accountId: BigInt(accountId), period: 'overall' } },
      select: { wn8: true }
    });

    return rating?.wn8 ?? null;
  }

  async withAccount<T>({ accountId, run }: WithAccountInput<T>): Promise<T> {
    const expected = await this.expected.all();
    const gained: GainedMark[] = [];

    const result = await lockedTransaction({
      prisma: this.prisma,
      scope: TRACKING.lock.scope,
      key: String(accountId),
      run: async (tx) => run(this.accountStore({ tx, expected, gained }))
    });

    await this.announce.announceMarks(gained);

    return result;
  }

  private accountStore(input: AccountStoreInput): AccountStorePort {
    return {
      latestAccountBattles: async (accountId) => this.latestAccountBattles({ tx: input.tx, accountId }),
      latestTankSnapshots: async (latest) => this.latestTankSnapshots({ tx: input.tx, ...latest }),
      writeAccountChanges: async (changes) => this.writeAccountChanges({ ...input, ...changes })
    };
  }

  private async latestAccountBattles({ tx, accountId }: LatestAccountBattlesInput): Promise<Map<SnapshotMode, number>> {
    const battles = new Map<SnapshotMode, number>();

    for (const mode of SNAPSHOT_MODES) {
      const latest = await tx.accountSnapshot.findFirst({
        where: { accountId: BigInt(accountId), mode },
        orderBy: { capturedAt: 'desc' },
        select: { battles: true }
      });

      if (latest) {
        battles.set(mode, latest.battles);
      }
    }

    return battles;
  }

  private async latestTankSnapshots({ tx, accountId, tankIds }: LatestTanksInput): Promise<TankSnapshotRow[]> {
    return tx.tankSnapshotLatest.findMany({
      where: { accountId: BigInt(accountId), tankId: { in: [...tankIds] }, mode: { in: [...SNAPSHOT_MODES] } }
    });
  }

  private async writeAccountChanges(input: WriteAccountChangesInput): Promise<void> {
    const marks = input.lestaMarks ?? snapshotMarks(input.tankSnapshots);
    const previous = await this.storedMarks({ tx: input.tx, accountId: input.accountId, marks });
    const [delta] = input.deltas;

    await this.writeSnapshots(input);
    await this.writePlayerTanks({ ...input, marks });
    await this.writeModeStats(input);

    if (delta) {
      await this.rebuildDaySession({ tx: input.tx, expected: input.expected, accountId: BigInt(input.accountId), at: new Date(delta.capturedAt) });
    }

    input.gained.push(...gainedMarks({ current: marks, previous }));
  }

  private async storedMarks({ tx, accountId, marks }: StoredMarksInput) {
    if (marks.length === 0) {
      return [];
    }

    return tx.playerTank.findMany({
      where: { accountId: BigInt(accountId), tankId: { in: marks.map((entry) => entry.tankId) } },
      select: { accountId: true, tankId: true, marksOnGun: true }
    });
  }

  private async writeSnapshots({ tx, accountId, accountSnapshots, tankSnapshots, deltas }: WriteAccountChangesInput): Promise<void> {
    const db = tx.$kysely;
    const tankCapturedAt = tankSnapshots[0]?.capturedAt;
    const randomSnapshot = accountSnapshots.find((snapshot) => snapshot.mode === 'random');

    await tx.accountSnapshot.createMany({ data: accountSnapshots, skipDuplicates: true });
    await tx.tankSnapshot.createMany({ data: tankSnapshots, skipDuplicates: true });
    await tx.tankBattleDelta.createMany({ data: deltas, skipDuplicates: true });

    if (tankCapturedAt !== undefined) {
      await this.queries.refreshLatestTankSnapshots({ db, accountId, capturedAt: new Date(tankCapturedAt) });
    }

    if (randomSnapshot) {
      await this.queries.upsertRandomModeStats({ db, accountId, capturedAt: new Date(randomSnapshot.capturedAt) });
    }
  }

  private async writePlayerTanks({ tx, baseline, marks }: WritePlayerTanksInput): Promise<void> {
    if (baseline.length > 0) {
      await this.queries.upsertPlayerTanks({ db: tx.$kysely, rows: baseline });
    }

    if (marks.length > 0) {
      await this.queries.updateLestaMarks({ db: tx.$kysely, rows: marks });
    }
  }

  private async writeModeStats({ tx, modeStats = [], tankModeStats = [] }: WriteAccountChangesInput): Promise<void> {
    if (modeStats.length > 0) {
      await this.queries.upsertAccountModeStats({ db: tx.$kysely, rows: modeStats });
    }

    if (tankModeStats.length > 0) {
      await this.queries.upsertTankModeStats({ db: tx.$kysely, rows: tankModeStats });
    }
  }

  private async rebuildDaySession({ tx, expected, accountId, at }: RebuildDaySessionInput): Promise<void> {
    const from = moscowDayStart(at);

    const deltas = await tx.tankBattleDelta.findMany({
      where: { accountId, mode: 'random', capturedAt: { gte: from, lt: addDays(from, 1) } },
      select: DAY_SESSION_DELTA_SELECT
    });

    const session = buildDaySession({ accountId, day: moscowCalendarDate(at), deltas, expected });

    if (!session) {
      return;
    }

    await tx.playSession.upsert({
      where: { accountId_source_kind_day: { accountId, source: 'api', kind: 'day', day: session.day } },
      create: session,
      update: session
    });
  }
}
