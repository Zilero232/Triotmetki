import type { CompiledQuery } from 'kysely';

import { describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { AccountRating, AccountSnapshot, PlayerTank, TankBattleDelta, TankSnapshotLatest } from '../../../../../../generated';
import type { AccountChanges, AccountStorePort } from '../../lib/poll-pipeline';
import type { TankSnapshotRow } from '../../lib/snapshots';
import type { AccountWriteQueries } from '../../queries/account-writes.types';

import { moscowCalendarDate } from '../../../../../common/lib';
import { advisoryLocks, mockPrismaService } from '../../../../../core/prisma/_tests/prisma-mock';
import { ExpectedValuesReaderService } from '../../../../reference';
import { TRACKING } from '../../config/tracking.constants';
import { block, tankStats } from '../../lib/poll-pipeline/_tests/poll-pipeline.fixtures';
import { tankSnapshotRow } from '../../lib/snapshots';
import { AccountWriterService } from '../account-writer.service';
import { TrackingAnnounceService } from '../tracking-announce.service';

const NOW = new Date('2026-09-26T12:00:00Z');

const createWriter = () => {
  const queries: CompiledQuery[] = [];
  const prisma = mockPrismaService({ queries });
  const announce = mock<TrackingAnnounceService>();
  const expected = mock<ExpectedValuesReaderService>();
  const writes = mock<AccountWriteQueries>();

  prisma.$transaction.mockImplementation(async (run) => (typeof run === 'function' ? run(prisma) : Promise.all(run)));
  expected.all.mockResolvedValue(new Map());

  return { prisma, queries, announce, writes, writer: new AccountWriterService(prisma, announce, expected, writes) };
};

const snapshot = ({ tankId, marksOnGun }: Pick<TankSnapshotRow, 'marksOnGun' | 'tankId'>): TankSnapshotRow =>
  tankSnapshotRow({ accountId: 1n, capturedAt: NOW, mode: 'all', block: block(10), stats: tankStats({ tankId, battles: 10 }), marksOnGun });

const NO_CHANGES: AccountChanges = { accountId: 1, accountSnapshots: [], tankSnapshots: [], deltas: [], baseline: [] };

const inAccount = async <T>(writer: AccountWriterService, run: (account: AccountStorePort) => Promise<T>) =>
  writer.withAccount({ accountId: 1, run });

describe('AccountWriterService.loadBaselines', () => {
  it('returns an entry for every requested account, empty for one without tanks', async () => {
    const { prisma, writer } = createWriter();

    prisma.playerTank.findMany.mockResolvedValue([mock<PlayerTank>({ accountId: 1n, tankId: 10, battles: 5, markOfMastery: 2 })]);

    const baselines = await writer.loadBaselines([1, 2]);

    expect(baselines.get(1)).toEqual([{ tankId: 10, battles: 5, markOfMastery: 2 }]);
    expect(baselines.get(2)).toEqual([]);
  });
});

describe('AccountWriterService.overallWn8', () => {
  it('returns null when the account has no overall rating yet', async () => {
    const { prisma, writer } = createWriter();

    prisma.accountRating.findUnique.mockResolvedValue(null);

    expect(await writer.overallWn8(1)).toBeNull();
  });

  it('keeps a zero rating as zero', async () => {
    const { prisma, writer } = createWriter();

    prisma.accountRating.findUnique.mockResolvedValue(mock<AccountRating>({ wn8: 0 }));

    expect(await writer.overallWn8(1)).toBe(0);
  });
});

describe('AccountWriterService.withAccount', () => {
  it('runs the account writes inside the per-account advisory lock', async () => {
    const { queries, writer } = createWriter();

    await writer.withAccount({ accountId: 42, run: async () => 'done' });

    expect(advisoryLocks(queries)).toEqual([[TRACKING.lock.scope, '42']]);
  });

  it('announces the marks gained inside the transaction only after it commits', async () => {
    const { prisma, announce, writer } = createWriter();
    const committed = vi.fn();

    prisma.playerTank.findMany.mockResolvedValue([mock<PlayerTank>({ accountId: 1n, tankId: 10, marksOnGun: 1 })]);

    prisma.$transaction.mockImplementation(async (run) => {
      const result = typeof run === 'function' ? await run(prisma) : await Promise.all(run);

      committed();

      return result;
    });

    announce.announceMarks.mockImplementation(async () => {
      expect(committed).toHaveBeenCalled();
    });

    await inAccount(writer, async (account) =>
      account.writeAccountChanges({ ...NO_CHANGES, tankSnapshots: [snapshot({ tankId: 10, marksOnGun: 2 })] })
    );

    expect(announce.announceMarks).toHaveBeenCalledWith([{ accountId: 1n, tankId: 10, marks: 2, previous: 1 }]);
  });

  it('announces nothing when the account transaction rolls back', async () => {
    const { prisma, announce, writer } = createWriter();

    prisma.playerTank.findMany.mockResolvedValue([mock<PlayerTank>({ accountId: 1n, tankId: 10, marksOnGun: 1 })]);
    prisma.tankBattleDelta.createMany.mockRejectedValue(new Error('timeout'));

    const written = inAccount(writer, async (account) =>
      account.writeAccountChanges({ ...NO_CHANGES, tankSnapshots: [snapshot({ tankId: 10, marksOnGun: 2 })] })
    );

    await expect(written).rejects.toThrow('timeout');
    expect(announce.announceMarks).not.toHaveBeenCalled();
  });
});

describe('AccountWriterService account store latestAccountBattles', () => {
  it('returns the latest battle count of every snapshot mode the account has', async () => {
    const { prisma, writer } = createWriter();

    prisma.accountSnapshot.findFirst.mockResolvedValueOnce(mock<AccountSnapshot>({ battles: 120 })).mockResolvedValueOnce(null);

    const battles = await inAccount(writer, async (account) => account.latestAccountBattles(1));

    expect(Object.fromEntries(battles)).toEqual({ all: 120 });
  });
});

describe('AccountWriterService account store latestTankSnapshots', () => {
  it('reads the latest row per tank and snapshot mode from the retention-proof table', async () => {
    const { prisma, writer } = createWriter();
    const row = mock<TankSnapshotLatest>({ tankId: 10 });

    prisma.tankSnapshotLatest.findMany.mockResolvedValue([row]);

    expect(await inAccount(writer, async (account) => account.latestTankSnapshots({ accountId: 1, tankIds: [10] }))).toEqual([row]);
    expect(prisma.tankSnapshot.findMany).not.toHaveBeenCalled();
  });
});

describe('AccountWriterService account store writeAccountChanges', () => {
  it('does not look up stored marks when no snapshot carries marks', async () => {
    const { prisma, announce, writer } = createWriter();

    await inAccount(writer, async (account) =>
      account.writeAccountChanges({ ...NO_CHANGES, tankSnapshots: [snapshot({ tankId: 10, marksOnGun: null })] })
    );

    expect(prisma.playerTank.findMany).not.toHaveBeenCalled();
    expect(announce.announceMarks).toHaveBeenCalledWith([]);
  });

  it('writes snapshots and deltas idempotently so a retried poll persists them once', async () => {
    const { prisma, writer } = createWriter();

    await inAccount(writer, async (account) => account.writeAccountChanges(NO_CHANGES));

    for (const createMany of [prisma.accountSnapshot.createMany, prisma.tankSnapshot.createMany, prisma.tankBattleDelta.createMany]) {
      expect(createMany.mock.calls[0]?.[0]).toMatchObject({ skipDuplicates: true });
    }
  });

  it('announces only a real gain over a known value', async () => {
    const { prisma, announce, writer } = createWriter();

    prisma.playerTank.findMany.mockResolvedValue([
      mock<PlayerTank>({ accountId: 1n, tankId: 10, marksOnGun: 1 }),
      mock<PlayerTank>({ accountId: 1n, tankId: 11, marksOnGun: null }),
      mock<PlayerTank>({ accountId: 1n, tankId: 12, marksOnGun: 3 })
    ]);

    await inAccount(writer, async (account) =>
      account.writeAccountChanges({
        ...NO_CHANGES,
        tankSnapshots: [
          snapshot({ tankId: 10, marksOnGun: 1 }),
          snapshot({ tankId: 10, marksOnGun: 2 }),
          snapshot({ tankId: 11, marksOnGun: 1 }),
          snapshot({ tankId: 12, marksOnGun: 3 })
        ]
      })
    );

    expect(announce.announceMarks).toHaveBeenCalledWith([{ accountId: 1n, tankId: 10, marks: 2, previous: 1 }]);
  });

  it('refreshes the latest-snapshot table at the capture time whenever tank snapshots are written', async () => {
    const { writes, writer } = createWriter();

    await inAccount(writer, async (account) =>
      account.writeAccountChanges({ ...NO_CHANGES, tankSnapshots: [snapshot({ tankId: 10, marksOnGun: null })] })
    );

    expect(writes.refreshLatestTankSnapshots.mock.calls[0]?.[0]).toMatchObject({ accountId: 1, capturedAt: NOW });
  });

  it('rebuilds the api day session only when the write carries deltas', async () => {
    const quiet = createWriter();

    await inAccount(quiet.writer, async (account) => account.writeAccountChanges(NO_CHANGES));

    expect(quiet.prisma.playSession.upsert).not.toHaveBeenCalled();

    const delta = mock<TankBattleDelta>({ accountId: 1n, tankId: 10, mode: 'random', capturedAt: NOW, battles: 2, wins: 1 });
    const busy = createWriter();

    busy.prisma.tankBattleDelta.findMany.mockResolvedValue([delta]);

    await inAccount(busy.writer, async (account) => account.writeAccountChanges({ ...NO_CHANGES, deltas: [delta] }));

    expect(busy.prisma.playSession.upsert.mock.calls[0]?.[0].where).toEqual({
      accountId_source_kind_day: { accountId: 1n, source: 'api', kind: 'day', day: moscowCalendarDate(NOW) }
    });
  });
});

describe('AccountWriterService account store Lesta marks', () => {
  it('writes every Lesta mark it is handed, even for a tank without a new snapshot', async () => {
    const { prisma, writes, writer } = createWriter();

    prisma.playerTank.findMany.mockResolvedValue([]);

    await inAccount(writer, async (account) => account.writeAccountChanges({ ...NO_CHANGES, lestaMarks: [{ accountId: 1n, tankId: 10, marks: 0 }] }));

    expect(writes.updateLestaMarks.mock.calls[0]?.[0].rows).toEqual([{ accountId: 1n, tankId: 10, marks: 0 }]);
  });

  it('announces a gain measured against the Lesta marks it is handed', async () => {
    const { prisma, announce, writer } = createWriter();

    prisma.playerTank.findMany.mockResolvedValue([mock<PlayerTank>({ accountId: 1n, tankId: 10, marksOnGun: 1 })]);

    await inAccount(writer, async (account) => account.writeAccountChanges({ ...NO_CHANGES, lestaMarks: [{ accountId: 1n, tankId: 10, marks: 2 }] }));

    expect(announce.announceMarks).toHaveBeenCalledWith([{ accountId: 1n, tankId: 10, marks: 2, previous: 1 }]);
  });
});
