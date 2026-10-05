import { subDays } from 'date-fns';
import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { Player, TankSnapshotLatest } from '../../../../../../../generated';
import type { PlayerRatingsQueries, ReferenceTables } from '../../player-ratings.types';

import { mockPrismaService } from '../../../../../../core/prisma/_tests/prisma-mock';
import { PLAYER_RATINGS_AGGREGATE } from '../../config/player-ratings.constants';
import { AccountRatingsAggregateService } from '../account-ratings-aggregate.service';
import { ReferenceTablesService } from '../reference-tables.service';

const emptyTables: ReferenceTables = { expected: new Map(), tiers: new Map(), references: new Map() };
const [preferredMode, fallbackMode] = PLAYER_RATINGS_AGGREGATE.ratingModes;

const createRatings = ({ player = true, modes = [] }: { player?: boolean; modes?: string[] }) => {
  const prisma = mockPrismaService();
  const tables = mock<ReferenceTablesService>();
  const queries = mock<PlayerRatingsQueries>();

  prisma.player.findUnique.mockResolvedValue(player ? mock<Player>({ accountId: 1n }) : null);

  for (const mode of PLAYER_RATINGS_AGGREGATE.ratingModes) {
    prisma.tankSnapshotLatest.findFirst.mockResolvedValueOnce(modes.includes(mode) ? mock<TankSnapshotLatest>({ tankId: 1 }) : null);
  }

  prisma.$transaction.mockImplementation(async (run: unknown) => (typeof run === 'function' ? run(prisma) : []));
  prisma.tankSnapshot.findMany.mockResolvedValue([]);
  prisma.tankSnapshotLatest.findMany.mockResolvedValue([]);
  queries.accountSnapshotWindow.mockResolvedValue([]);
  queries.tankBoundary.mockResolvedValue([]);
  tables.tables.mockResolvedValue(emptyTables);

  return { prisma, queries, service: new AccountRatingsAggregateService(prisma, tables, queries) };
};

describe('AccountRatingsAggregateService.compute', () => {
  it('skips an account that is not stored', async () => {
    const { queries, service } = createRatings({ player: false });

    expect(await service.compute({ accountId: 1 })).toEqual({ skipped: true });
    expect(queries.replaceAccountRatings).not.toHaveBeenCalled();
  });

  it('skips an account without any tank snapshots', async () => {
    const { queries, service } = createRatings({ modes: [] });

    expect(await service.compute({ accountId: 1 })).toEqual({ skipped: true });
    expect(queries.replaceAccountRatings).not.toHaveBeenCalled();
  });

  it('rates from the preferred mode when it has snapshots', async () => {
    const { service } = createRatings({ modes: [preferredMode, fallbackMode] });

    expect(await service.compute({ accountId: 1 })).toMatchObject({ mode: preferredMode });
  });

  it('falls back to the next mode when the preferred one has no snapshots', async () => {
    const { service } = createRatings({ modes: [fallbackMode] });

    expect(await service.compute({ accountId: 1 })).toMatchObject({ mode: fallbackMode });
  });

  it('replaces ratings and tank ratings of the account inside one transaction and reports what it wrote', async () => {
    const { prisma, queries, service } = createRatings({ modes: [preferredMode] });

    const result = await service.compute({ accountId: 1 });
    const [ratings] = queries.replaceAccountRatings.mock.calls[0] ?? [];
    const [tankRatings] = queries.replaceAccountTankRatings.mock.calls[0] ?? [];

    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(result).toEqual({ mode: preferredMode, periods: ratings?.rows.length, tanks: tankRatings?.rows.length });
  });
});

describe('AccountRatingsAggregateService.compute retention', () => {
  it('keeps a tank in the overall rating after retention dropped its snapshot history', async () => {
    const { prisma, queries, service } = createRatings({ modes: [preferredMode] });

    prisma.tankSnapshotLatest.findMany.mockResolvedValue([
      mock<TankSnapshotLatest>({
        tankId: 1,
        capturedAt: new Date('2024-01-01T00:00:00Z'),
        battles: 100,
        wins: 55,
        losses: 45,
        damageDealt: 150_000,
        damageReceived: 100_000,
        frags: 90,
        spotted: 120,
        xp: 70_000,
        survived: 30,
        hits: 700,
        shots: 900,
        capturePoints: 10,
        droppedCapturePoints: 40
      })
    ]);

    await service.compute({ accountId: 1 });

    const [input] = queries.replaceAccountRatings.mock.calls[0] ?? [];

    expect(input?.rows.find((row) => row.period === 'overall')?.battles).toBe(100);
  });
});

describe('AccountRatingsAggregateService.compute history', () => {
  it('reads the snapshot history only from the oldest baseline a rating period needs', async () => {
    const { prisma, queries, service } = createRatings({ modes: [preferredMode] });
    const baseline = subDays(new Date(), 90);

    queries.accountSnapshotWindow.mockResolvedValue([
      { capturedAt: baseline, battles: 100 },
      { capturedAt: subDays(new Date(), 1), battles: 5_000 }
    ]);

    await service.compute({ accountId: 1 });

    expect(prisma.tankSnapshot.findMany.mock.calls[0]?.[0]?.where).toMatchObject({ capturedAt: { gt: baseline } });
    expect(queries.tankBoundary.mock.calls[0]?.[0]).toMatchObject({ cutoff: baseline });
  });

  it('skips the snapshot history when no recent period has a baseline', async () => {
    const { prisma, queries, service } = createRatings({ modes: [preferredMode] });

    await service.compute({ accountId: 1 });

    expect(prisma.tankSnapshot.findMany).not.toHaveBeenCalled();
    expect(queries.tankBoundary).not.toHaveBeenCalled();
  });
});
