import { BRONYA_INDEX } from '@otmetki/ratings';
import { addMilliseconds } from 'date-fns';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { TankPercentile, Vehicle, Wn8ExpectedValue } from '../../../../../../../generated';

import { mockPrismaService } from '../../../../../../core/prisma/_tests/prisma-mock';
import { bronyaReferencePayload } from '../../../../../reference';
import { PLAYER_RATINGS_AGGREGATE } from '../../config/player-ratings.constants';
import { ReferenceTablesService } from '../reference-tables.service';

const NOW = new Date('2026-09-26T12:00:00Z');
const DATE = new Date('2026-09-25T00:00:00Z');

const rising = (from: number) => BRONYA_INDEX.quantileLevels.map((_, index) => from + index);

const reference = bronyaReferencePayload({
  players: 40,
  components: { damage: rising(1000), winRate: rising(45), frags: rising(0), spotted: rising(0), defence: rising(0) }
});

const expectedRow = mock<Wn8ExpectedValue>({ tankId: 1, expDamage: 1500, expFrags: 1.1, expSpotted: 1.2, expDefense: 0.8, expWinRate: 52 });

const createTables = () => {
  const prisma = mockPrismaService();

  prisma.wn8ExpectedValue.aggregate.mockResolvedValue({ _max: { date: DATE }, _min: {}, _avg: {}, _sum: {}, _count: {} });
  prisma.wn8ExpectedValue.findMany.mockResolvedValue([expectedRow]);
  prisma.vehicle.findMany.mockResolvedValue([mock<Vehicle>({ tankId: 1, tier: 8 })]);
  prisma.tankPercentile.aggregate.mockResolvedValue({ _max: { date: DATE }, _min: {}, _avg: {}, _sum: {}, _count: {} });

  prisma.tankPercentile.findMany.mockResolvedValue([
    mock<TankPercentile>({ tankId: 1, percentiles: reference }),
    mock<TankPercentile>({ tankId: 2, percentiles: { kind: 'broken' } })
  ]);

  return { prisma, service: new ReferenceTablesService(prisma) };
};

describe('ReferenceTablesService.tables', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('maps the latest expected values into the WN8 shape', async () => {
    const { service } = createTables();

    const { expected } = await service.tables();

    expect(expected.get(1)).toEqual({ tankId: 1, expDamage: 1500, expFrag: 1.1, expSpot: 1.2, expDef: 0.8, expWinRate: 52 });
  });

  it('returns empty tables when nothing has been imported yet', async () => {
    const { prisma, service } = createTables();

    prisma.wn8ExpectedValue.aggregate.mockResolvedValue({ _max: { date: null }, _min: {}, _avg: {}, _sum: {}, _count: {} });
    prisma.tankPercentile.aggregate.mockResolvedValue({ _max: { date: null }, _min: {}, _avg: {}, _sum: {}, _count: {} });

    const { expected, references } = await service.tables();

    expect(expected.size).toBe(0);
    expect(references.size).toBe(0);
    expect(prisma.wn8ExpectedValue.findMany).not.toHaveBeenCalled();
  });

  it('drops a stored reference that no longer parses', async () => {
    const { service } = createTables();

    const { references } = await service.tables();

    expect([...references.keys()]).toEqual([1]);
  });

  it('serves the cached tables until the cache expires', async () => {
    const { prisma, service } = createTables();

    await service.tables();
    vi.setSystemTime(addMilliseconds(NOW, PLAYER_RATINGS_AGGREGATE.referenceCacheTtlMs - 1));
    await service.tables();

    expect(prisma.vehicle.findMany).toHaveBeenCalledOnce();

    vi.setSystemTime(addMilliseconds(NOW, PLAYER_RATINGS_AGGREGATE.referenceCacheTtlMs));
    await service.tables();

    expect(prisma.vehicle.findMany).toHaveBeenCalledTimes(2);
  });

  it('reloads right away after an invalidation', async () => {
    const { prisma, service } = createTables();

    await service.tables();
    service.invalidate();
    await service.tables();

    expect(prisma.vehicle.findMany).toHaveBeenCalledTimes(2);
  });
});
