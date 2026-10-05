import { BUILD_USAGE } from '@otmetki/schemas';
import { afterAll, beforeEach, expect, it } from 'vitest';

import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../core/prisma/_tests/test-database';
import { latestCatalogUsage } from '../builds-catalog.queries';

const usage = ({
  tankId,
  mode = 'random',
  cohort = BUILD_USAGE.catalogCohort,
  gameVersion,
  battles,
  computedAt
}: {
  tankId: number;
  mode?: 'frontline' | 'random';
  cohort?: 'all' | 'top1' | 'top10';
  gameVersion: string;
  battles: number;
  computedAt: string;
}) => ({
  tankId,
  mode,
  cohort,
  gameVersion,
  battles,
  players: battles / 10,
  winRate: 51.5,
  avgDamage: 2_400.5,
  usage: { equipment: [], consumables: [] },
  windowDays: 14,
  computedAt: new Date(computedAt)
});

describeWithDatabase('latestCatalogUsage', () => {
  const prisma = createTestPrisma();

  beforeEach(async () => {
    await truncateTables({ prisma, tables: ['build_usage_aggregate'] });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('keeps the newest aggregate per tank for the mode and cohort', async () => {
    await prisma.buildUsageAggregate.createMany({
      data: [
        usage({ tankId: 1, gameVersion: '1.0', battles: 100, computedAt: '2026-09-01T00:00:00Z' }),
        usage({ tankId: 1, gameVersion: '1.1', battles: 200, computedAt: '2026-09-10T00:00:00Z' }),
        usage({ tankId: 2, gameVersion: '1.1', battles: 300, computedAt: '2026-09-05T00:00:00Z' }),
        usage({ tankId: 2, cohort: 'top10', gameVersion: '1.2', battles: 400, computedAt: '2026-09-20T00:00:00Z' }),
        usage({ tankId: 3, mode: 'frontline', gameVersion: '1.1', battles: 500, computedAt: '2026-09-20T00:00:00Z' })
      ]
    });

    const rows = await latestCatalogUsage({ db: prisma.$kysely, mode: 'random', cohort: BUILD_USAGE.catalogCohort });

    expect(rows).toEqual([
      {
        tankId: 1,
        battles: 200,
        players: 20,
        winRate: 51.5,
        avgDamage: 2_400.5,
        usage: { equipment: [], consumables: [] },
        computedAt: new Date('2026-09-10T00:00:00Z')
      },
      {
        tankId: 2,
        battles: 300,
        players: 30,
        winRate: 51.5,
        avgDamage: 2_400.5,
        usage: { equipment: [], consumables: [] },
        computedAt: new Date('2026-09-05T00:00:00Z')
      }
    ]);
  });
});
