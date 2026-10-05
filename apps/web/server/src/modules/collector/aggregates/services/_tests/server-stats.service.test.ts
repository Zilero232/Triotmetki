import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { DailyStatsRow } from '../../lib/server-stats';

import { AGGREGATES } from '../../config';
import { SERVER_STATS } from '../../lib/server-stats';
import { ReferenceTablesService } from '../reference-tables.service';
import { ServerStatsService } from '../server-stats.service';
import { createPrisma } from './aggregates.fixtures';

const NOW = new Date('2026-09-26T12:00:00Z');

const daily: DailyStatsRow = {
  tankId: 1,
  cohort: SERVER_STATS.allCohorts,
  samples: 10.6,
  battles: 1000.4,
  wins: 520,
  damage: 2_000_000,
  frags: 900,
  spotted: 1200,
  xp: 800_000,
  blocked: 300_000,
  survived: 350,
  hits: 7000,
  shots: 9000,
  playerWins: 505
};

const createStats = () => {
  const prisma = createPrisma();
  const tables = mock<ReferenceTablesService>();

  tables.tables.mockResolvedValue({ expected: new Map(), tiers: new Map([[1, 8]]), references: new Map() });
  prisma.$queryRaw.mockResolvedValue([]);

  return { prisma, service: new ServerStatsService(prisma, tables) };
};

describe('ServerStatsService.compute', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('rebuilds every mode and period, clearing stale rows even when there is no data', async () => {
    const { prisma, service } = createStats();

    expect(await service.compute()).toEqual({ rows: 0 });

    const cleared = prisma.tankServerStats.deleteMany.mock.calls.map(([args]) => args?.where);

    expect(cleared).toHaveLength(AGGREGATES.serverStatsModes.length * SERVER_STATS.periods.length);
    expect(new Set(cleared.map((where) => `${String(where?.mode)}:${String(where?.period)}`)).size).toBe(cleared.length);
  });

  it('stores whole battle and sample counts', async () => {
    const { prisma, service } = createStats();

    prisma.$queryRaw
      .mockResolvedValueOnce([{ tankId: 1, cohort: SERVER_STATS.allCohorts, players: SERVER_STATS.periods.map(() => 7) }])
      .mockResolvedValueOnce([daily]);

    const { rows } = await service.compute();
    const [written] = [prisma.tankServerStats.createMany.mock.calls[0]?.[0]?.data ?? []].flat();

    expect(rows).toBeGreaterThan(0);
    expect(written).toMatchObject({ tankId: 1, players: 7, battles: Math.round(daily.battles), samples: Math.round(daily.samples), computedAt: NOW });
  });
});
