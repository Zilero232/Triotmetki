import { subDays } from 'date-fns';
import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { z } from 'zod';

import type { Player, TankSnapshotLatest } from '../../../../../../generated';
import type { ReferenceTables } from '../../aggregates.types';

import { AGGREGATES } from '../../config';
import { AccountRatingsService } from '../account-ratings.service';
import { ReferenceTablesService } from '../reference-tables.service';
import { createPrisma } from './aggregates.fixtures';

const emptyTables: ReferenceTables = { expected: new Map(), tiers: new Map(), references: new Map() };
const [preferredMode, fallbackMode] = AGGREGATES.ratingModes;

const createRatings = ({ player = true, modes = [] }: { player?: boolean; modes?: string[] }) => {
  const prisma = createPrisma();
  const tables = mock<ReferenceTablesService>();

  prisma.player.findUnique.mockResolvedValue(player ? mock<Player>({ accountId: 1n }) : null);

  for (const mode of AGGREGATES.ratingModes) {
    prisma.tankSnapshotLatest.findFirst.mockResolvedValueOnce(modes.includes(mode) ? mock<TankSnapshotLatest>({ tankId: 1 }) : null);
  }

  prisma.$queryRaw.mockResolvedValue([]);
  prisma.tankSnapshot.findMany.mockResolvedValue([]);
  prisma.tankSnapshotLatest.findMany.mockResolvedValue([]);
  tables.tables.mockResolvedValue(emptyTables);

  return { prisma, service: new AccountRatingsService(prisma, tables) };
};

const sqlValues = (sql: unknown): unknown[] =>
  typeof sql === 'object' && sql !== null && 'values' in sql && Array.isArray(sql.values) ? sql.values : [];

const writtenRows = (prisma: ReturnType<typeof createPrisma>, call: number): { period: string; battles: number }[] => {
  const text = sqlValues(prisma.$executeRaw.mock.calls[call]?.[0]).find((value): value is string => typeof value === 'string');

  return text ? z.array(z.object({ period: z.string(), battles: z.number() })).parse(JSON.parse(text)) : [];
};

describe('AccountRatingsService.compute', () => {
  it('skips an account that is not stored', async () => {
    const { prisma, service } = createRatings({ player: false });

    expect(await service.compute({ accountId: 1 })).toEqual({ skipped: true });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('skips an account without any tank snapshots', async () => {
    const { prisma, service } = createRatings({ modes: [] });

    expect(await service.compute({ accountId: 1 })).toEqual({ skipped: true });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rates from the preferred mode when it has snapshots', async () => {
    const { service } = createRatings({ modes: [preferredMode, fallbackMode] });

    expect(await service.compute({ accountId: 1 })).toMatchObject({ mode: preferredMode });
  });

  it('falls back to the next mode when the preferred one has no snapshots', async () => {
    const { prisma, service } = createRatings({ modes: [fallbackMode] });

    expect(await service.compute({ accountId: 1 })).toMatchObject({ mode: fallbackMode });
    expect(prisma.tankSnapshotLatest.findMany.mock.calls[0]?.[0]?.where).toMatchObject({ mode: fallbackMode });
  });

  it('writes ratings and tank ratings for the account in one transaction and reports what it wrote', async () => {
    const { prisma, service } = createRatings({ modes: [preferredMode] });

    const result = await service.compute({ accountId: 1 });

    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(prisma.$executeRaw.mock.calls.map(([sql]) => sqlValues(sql).includes(1n))).toEqual([true, true]);
    expect(result).toMatchObject({ periods: writtenRows(prisma, 0).length, tanks: writtenRows(prisma, 1).length });
  });
});

describe('AccountRatingsService.compute retention', () => {
  it('keeps a tank in the overall rating after retention dropped its snapshot history', async () => {
    const { prisma, service } = createRatings({ modes: [preferredMode] });
    const capturedAt = new Date('2024-01-01T00:00:00Z');

    prisma.tankSnapshotLatest.findMany.mockResolvedValue([
      mock<TankSnapshotLatest>({
        tankId: 1,
        capturedAt,
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

    const overall = writtenRows(prisma, 0).find((row) => row.period === 'overall');

    expect(overall?.battles).toBe(100);
  });
});

describe('AccountRatingsService.compute history', () => {
  it('reads the snapshot history only from the oldest baseline a rating period needs', async () => {
    const { prisma, service } = createRatings({ modes: [preferredMode] });
    const baseline = subDays(new Date(), 90);

    prisma.$queryRaw.mockResolvedValueOnce([
      { capturedAt: baseline, battles: 100 },
      { capturedAt: subDays(new Date(), 1), battles: 5_000 }
    ]);

    await service.compute({ accountId: 1 });

    expect(prisma.tankSnapshot.findMany.mock.calls[0]?.[0]?.where).toMatchObject({ capturedAt: { gt: baseline } });
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
  });

  it('skips the snapshot history when no recent period has a baseline', async () => {
    const { prisma, service } = createRatings({ modes: [preferredMode] });

    await service.compute({ accountId: 1 });

    expect(prisma.tankSnapshot.findMany).not.toHaveBeenCalled();
    expect(prisma.$queryRaw).toHaveBeenCalledOnce();
  });
});
