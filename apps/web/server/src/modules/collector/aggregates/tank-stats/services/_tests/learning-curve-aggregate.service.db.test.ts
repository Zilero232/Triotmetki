import { subDays } from 'date-fns';
import { afterAll, beforeEach, expect, it } from 'vitest';

import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../../../core/prisma/_tests/test-database';
import { playerSeed, tankSnapshotSeed } from '../../../_tests/aggregates.seeds';
import { tankStatsQueries } from '../../providers/tank-stats-queries.provider';
import { LearningCurveAggregateService } from '../learning-curve-aggregate.service';

const FIRST = 1_000_000_301n;
const SECOND = 1_000_000_302n;
const daysAgo = (days: number) => subDays(new Date(), days);

const point = ({
  accountId,
  tankId = 1,
  days,
  battles,
  wins,
  damage
}: {
  accountId: bigint;
  tankId?: number;
  days: number;
  battles: number;
  wins: number;
  damage: number;
}) => tankSnapshotSeed({ accountId, tankId, capturedAt: daysAgo(days), battles, wins, damageDealt: damage });

describeWithDatabase('LearningCurveAggregateService', () => {
  const prisma = createTestPrisma();

  const compute = () => new LearningCurveAggregateService(prisma, tankStatsQueries).compute();

  const stored = () => prisma.tankLearningCurve.findMany({ omit: { computedAt: true }, orderBy: [{ tankId: 'asc' }, { bucket: 'asc' }] });

  beforeEach(async () => {
    await truncateTables({ prisma, tables: ['tank_learning_curve', 'tank_snapshot', 'player'] });
    await prisma.player.createMany({ data: [playerSeed(FIRST), playerSeed(SECOND)] });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('sums the battle deltas per tank into experience buckets, starting from the last snapshot before the window', async () => {
    await prisma.tankSnapshot.createMany({
      data: [
        point({ accountId: FIRST, days: 100, battles: 40, wins: 20, damage: 40_000 }),
        point({ accountId: FIRST, days: 10, battles: 70, wins: 36, damage: 70_000 }),
        point({ accountId: FIRST, days: 5, battles: 130, wins: 66, damage: 130_000 }),
        point({ accountId: FIRST, days: 1, battles: 700, wins: 400, damage: 700_000 }),
        point({ accountId: SECOND, days: 20, battles: 10, wins: 5, damage: 10_000 }),
        point({ accountId: SECOND, days: 10, battles: 40, wins: 20, damage: 40_000 }),
        point({ accountId: SECOND, days: 2, battles: 100, wins: 55, damage: 90_000 }),
        point({ accountId: SECOND, days: 1, battles: 120, wins: 50, damage: 100_000 }),
        point({ accountId: FIRST, tankId: 2, days: 10, battles: 10, wins: 5, damage: 10_000 }),
        point({ accountId: FIRST, tankId: 2, days: 5, battles: 40, wins: 20, damage: 40_000 }),
        { ...point({ accountId: SECOND, tankId: 1, days: 3, battles: 5000, wins: 2500, damage: 5_000_000 }), mode: 'all' }
      ]
    });

    const result = await compute();

    expect(result).toEqual({ rows: 2 });

    expect(await stored()).toMatchInlineSnapshot(`
      [
        {
          "battles": 120,
          "bucket": 0,
          "damage": 110000n,
          "players": 2,
          "tankId": 1,
          "windowDays": 90,
          "wins": 66,
        },
        {
          "battles": 60,
          "bucket": 1,
          "damage": 60000n,
          "players": 1,
          "tankId": 1,
          "windowDays": 90,
          "wins": 30,
        },
      ]
    `);
  });

  it('replaces the previous rows', async () => {
    await prisma.tankLearningCurve.create({ data: { tankId: 9, bucket: 0, battles: 1, players: 1, wins: 1, damage: 1n, windowDays: 1 } });

    await compute();

    expect(await stored()).toEqual([]);
  });
});
