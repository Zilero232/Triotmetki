import { BRONYA_INDEX } from '@otmetki/ratings';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { EconomyRow, LearningRow } from '../../mappers/tank-economy.types';
import type { ToTankPercentileRecordInput } from '../../mappers/tank-percentile.types';
import type { TankStatsQueries } from '../../tank-stats.types';

import { mockPrismaService } from '../../../../../../core/prisma/_tests/prisma-mock';
import { BRONYA_REFERENCE, parseBronyaReference } from '../../../../../reference';
import { ReferenceTablesService } from '../../../player-ratings';
import { LEARNING_CURVE_AGGREGATE, TANK_ECONOMY_AGGREGATE } from '../../config/tank-stats.constants';
import { LearningCurveAggregateService } from '../learning-curve-aggregate.service';
import { TankEconomyAggregateService } from '../tank-economy-aggregate.service';
import { TankPercentilesAggregateService } from '../tank-percentiles-aggregate.service';

const NOW = new Date('2026-09-26T15:30:00Z');
const rising = (from: number) => BRONYA_INDEX.quantileLevels.map((_, index) => from + index);

const ECONOMY_ROW: EconomyRow = {
  tank_id: 1,
  account: 'all',
  battles: TANK_ECONOMY_AGGREGATE.minBattles,
  players: 5,
  cost_battles: 0,
  credits: 30_000.4,
  credits_base: null,
  repair: 12_000,
  ammo: 3_000,
  consumables: 1_000,
  net: 14_000,
  xp: 900,
  free_xp: null
};

const PERCENTILE_ROW: ToTankPercentileRecordInput['row'] = {
  tank_id: 1,
  players: BRONYA_REFERENCE.minPlayers,
  damage: rising(1000),
  win_rate: rising(45),
  frags: rising(0),
  spotted: rising(0),
  defence: rising(0)
};

const createServices = () => {
  const prisma = mockPrismaService();
  const queries = mock<TankStatsQueries>();
  const tables = mock<ReferenceTablesService>();

  prisma.$transaction.mockResolvedValue([]);
  queries.tankEconomyRows.mockResolvedValue([]);
  queries.learningCurveRows.mockResolvedValue([]);
  queries.tankPercentileRows.mockResolvedValue([]);

  return {
    prisma,
    queries,
    tables,
    economy: new TankEconomyAggregateService(prisma, queries),
    learning: new LearningCurveAggregateService(prisma, queries),
    percentiles: new TankPercentilesAggregateService(prisma, tables, queries)
  };
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('TankEconomyAggregateService.compute', () => {
  it('clears the table when no tank reaches the minimum sample', async () => {
    const { prisma, economy } = createServices();

    expect(await economy.compute()).toEqual({ rows: 0 });
    expect(prisma.tankEconomyAggregate.deleteMany).toHaveBeenCalledOnce();
    expect(prisma.tankEconomyAggregate.createMany.mock.calls[0]?.[0]?.data).toEqual([]);
  });

  it('hides cost medians for a tank without any fully costed battle', async () => {
    const { prisma, queries, economy } = createServices();

    queries.tankEconomyRows.mockResolvedValue([ECONOMY_ROW]);

    await economy.compute();

    expect(prisma.tankEconomyAggregate.createMany.mock.calls[0]?.[0]?.data).toEqual([
      expect.objectContaining({ tankId: 1, repair: null, net: null, credits: Math.round(ECONOMY_ROW.credits ?? 0), computedAt: NOW })
    ]);
  });
});

describe('LearningCurveAggregateService.compute', () => {
  it('clears the curve when no bucket reaches the minimum sample', async () => {
    const { prisma, learning } = createServices();

    expect(await learning.compute()).toEqual({ rows: 0 });
    expect(prisma.tankLearningCurve.createMany.mock.calls[0]?.[0]?.data).toEqual([]);
  });

  it('never stores more wins than battles in a bucket', async () => {
    const { prisma, queries, learning } = createServices();
    const battles = LEARNING_CURVE_AGGREGATE.minBattles;
    const row: LearningRow = { tank_id: 1, bucket: 0, battles, players: 3, wins: battles + 5, damage: 90_000 };

    queries.learningCurveRows.mockResolvedValue([row]);

    await learning.compute();

    expect(prisma.tankLearningCurve.createMany.mock.calls[0]?.[0]?.data).toEqual([
      expect.objectContaining({ battles, wins: battles, damage: 90_000n })
    ]);
  });
});

describe('TankPercentilesAggregateService.compute', () => {
  it('writes a reference that the rating tables can read back', async () => {
    const { prisma, queries, percentiles } = createServices();

    queries.tankPercentileRows.mockResolvedValue([PERCENTILE_ROW]);

    expect(await percentiles.compute()).toEqual({ tanks: 1 });

    const [written] = [prisma.tankPercentile.createMany.mock.calls[0]?.[0]?.data ?? []].flat();
    const parsed = parseBronyaReference({ tankId: PERCENTILE_ROW.tank_id, value: written?.percentiles });

    expect(parsed?.quantiles).toEqual({
      damage: PERCENTILE_ROW.damage,
      winRate: PERCENTILE_ROW.win_rate,
      frags: PERCENTILE_ROW.frags,
      spotted: PERCENTILE_ROW.spotted,
      defence: PERCENTILE_ROW.defence
    });
  });

  it('replaces only today’s rows of its own distribution', async () => {
    const { prisma, percentiles } = createServices();

    await percentiles.compute();

    expect(prisma.tankPercentile.deleteMany.mock.calls[0]?.[0]?.where).toEqual({
      distribution: BRONYA_REFERENCE.distribution,
      date: new Date('2026-09-26T00:00:00Z')
    });
  });

  it('drops the cached rating tables so the next rating uses the new reference', async () => {
    const { tables, percentiles } = createServices();

    await percentiles.compute();

    expect(tables.invalidate).toHaveBeenCalledOnce();
  });
});
