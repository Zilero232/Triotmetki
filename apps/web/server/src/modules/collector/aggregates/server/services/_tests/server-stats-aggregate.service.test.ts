import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { DailyStatsRow } from '../../lib/server-stats/server-stats.types';
import type { ServerQueries } from '../../server.types';

import { mockPrismaService } from '../../../../../../core/prisma/_tests/prisma-mock';
import { ReferenceTablesService } from '../../../player-ratings';
import { SERVER_STATS_AGGREGATE } from '../../config/server.constants';
import { SERVER_STATS } from '../../lib/server-stats/server-stats.constants';
import { ServerStatsAggregateService } from '../server-stats-aggregate.service';

const NOW = new Date('2026-09-26T12:00:00Z');

const DAILY: DailyStatsRow = {
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
  const prisma = mockPrismaService();
  const tables = mock<ReferenceTablesService>();
  const queries = mock<ServerQueries>();

  tables.tables.mockResolvedValue({ expected: new Map(), tiers: new Map([[1, 8]]), references: new Map() });
  prisma.$transaction.mockResolvedValue([]);
  queries.serverPlayers.mockResolvedValue([]);
  queries.dailyStats.mockResolvedValue([]);

  return { prisma, queries, service: new ServerStatsAggregateService(prisma, tables, queries) };
};

describe('ServerStatsAggregateService.compute', () => {
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

    expect(cleared).toHaveLength(SERVER_STATS_AGGREGATE.modes.length * SERVER_STATS.periods.length);
    expect(new Set(cleared.map((where) => `${String(where?.mode)}:${String(where?.period)}`)).size).toBe(cleared.length);
  });

  it('stores whole battle and sample counts', async () => {
    const { prisma, queries, service } = createStats();

    queries.serverPlayers.mockResolvedValueOnce([{ tankId: 1, cohort: SERVER_STATS.allCohorts, players: SERVER_STATS.periods.map(() => 7) }]);
    queries.dailyStats.mockResolvedValueOnce([DAILY]);

    const { rows } = await service.compute();
    const [written] = [prisma.tankServerStats.createMany.mock.calls[0]?.[0]?.data ?? []].flat();

    expect(rows).toBeGreaterThan(0);
    expect(written).toMatchObject({ tankId: 1, players: 7, battles: Math.round(DAILY.battles), samples: Math.round(DAILY.samples), computedAt: NOW });
  });
});
