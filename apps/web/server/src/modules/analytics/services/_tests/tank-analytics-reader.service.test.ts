import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { Battle } from '../../../../../generated';
import type { AnalyticsQueries } from '../../providers/analytics-queries.provider.types';

import { mockPrismaService } from '../../../../core/prisma/_tests/prisma-mock';
import { ExpectedValuesReaderService, VehicleCatalogService } from '../../../reference';
import { ANALYTICS_SQL } from '../../config';
import { OwnAccountReaderService } from '../own-account-reader.service';
import { TankAnalyticsReaderService } from '../tank-analytics-reader.service';
import { catalogOf, rawRow, vehicle } from './analytics.fixtures';

const tank = vehicle({ tankId: 1 });

const moeBattle = (startedAt: string, moePercent: number | null) => Object.assign(mock<Battle>(), { startedAt: new Date(startedAt), moePercent });

const setup = () => {
  const prisma = mockPrismaService();
  const catalog = mock<VehicleCatalogService>();
  const expected = mock<ExpectedValuesReaderService>();
  const accounts = mock<OwnAccountReaderService>();
  const queries = mock<AnalyticsQueries>();

  accounts.resolve.mockResolvedValue(7n);
  expected.all.mockResolvedValue(new Map());
  catalog.all.mockResolvedValue(catalogOf(tank));
  queries.tankDeltaBuckets.mockResolvedValue([]);
  prisma.battle.findMany.mockResolvedValue([]);

  return { prisma, queries, service: new TankAnalyticsReaderService(prisma, catalog, expected, accounts, queries) };
};

describe('TankAnalyticsReaderService.tank', () => {
  it('returns an unknown vehicle and empty series without data', async () => {
    const { service } = setup();

    expect(await service.tank({ userId: 'u', tankId: 999, granularity: 'week' })).toMatchObject({
      vehicle: null,
      totals: { battles: 0 },
      points: [],
      moe: []
    });
  });

  it('reads the tank trend over all time', async () => {
    const { queries, service } = setup();

    await service.tank({ userId: 'u', tankId: tank.tankId, granularity: 'month' });

    expect(queries.tankDeltaBuckets).toHaveBeenCalledWith(
      expect.objectContaining({ from: ANALYTICS_SQL.epoch, tankId: tank.tankId, granularity: 'month' })
    );
  });

  it('totals the trend buckets', async () => {
    const { queries, service } = setup();

    queries.tankDeltaBuckets.mockResolvedValue([
      { ...rawRow({ tank_id: tank.tankId, battles: 4, wins: 2 }), bucket: new Date('2026-09-01T00:00:00Z') },
      { ...rawRow({ tank_id: tank.tankId, battles: 6, wins: 4 }), bucket: new Date('2026-08-01T00:00:00Z') }
    ]);

    const result = await service.tank({ userId: 'u', tankId: tank.tankId, granularity: 'month' });

    expect(result.totals).toMatchObject({ battles: 10, winRate: 60 });
    expect(result.points).toHaveLength(2);
  });

  it('lists the MoE history oldest first', async () => {
    const { prisma, service } = setup();

    prisma.battle.findMany.mockResolvedValue([moeBattle('2026-09-26T10:00:00Z', 80), moeBattle('2026-09-25T10:00:00Z', 78)]);

    const { moe } = await service.tank({ userId: 'u', tankId: tank.tankId, granularity: 'week' });

    expect(moe.map((point) => point.percent)).toEqual([78, 80]);
  });
});
