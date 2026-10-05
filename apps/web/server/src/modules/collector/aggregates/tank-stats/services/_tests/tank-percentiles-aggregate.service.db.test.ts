import { subDays } from 'date-fns';
import { range } from 'remeda';
import { afterAll, beforeEach, expect, it } from 'vitest';

import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../../../core/prisma/_tests/test-database';
import { playerSeed, tankSnapshotLatestSeed } from '../../../_tests/aggregates.seeds';
import { ReferenceTablesService } from '../../../player-ratings';
import { tankStatsQueries } from '../../providers/tank-stats-queries.provider';
import { TankPercentilesAggregateService } from '../tank-percentiles-aggregate.service';

const FIRST_ACCOUNT = 1_000_000_400;
const accountIds = range(0, 32).map((index) => BigInt(FIRST_ACCOUNT + index));
const daysAgo = (days: number) => subDays(new Date(), days);

const latest = ({
  accountId,
  tankId,
  index,
  battles = 100,
  days = 1
}: {
  accountId: bigint;
  tankId: number;
  index: number;
  battles?: number;
  days?: number;
}) =>
  tankSnapshotLatestSeed({
    accountId,
    tankId,
    capturedAt: daysAgo(days),
    battles,
    wins: 40 + index,
    damageDealt: 100_000 + index * 3000,
    frags: 50 + index * 2,
    spotted: 80 + index,
    droppedCapturePoints: index % 7
  });

describeWithDatabase('TankPercentilesAggregateService', () => {
  const prisma = createTestPrisma();

  const compute = () => new TankPercentilesAggregateService(prisma, new ReferenceTablesService(prisma), tankStatsQueries).compute();

  beforeEach(async () => {
    await truncateTables({ prisma, tables: ['tank_percentile', 'tank_snapshot_latest', 'player'] });
    await prisma.player.createMany({ data: accountIds.map((accountId) => playerSeed(accountId)) });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('stores the per-battle quantiles of every tank with enough recent players', async () => {
    await prisma.tankSnapshotLatest.createMany({
      data: [
        ...accountIds.slice(0, 30).map((accountId, index) => latest({ accountId, tankId: 1, index })),
        latest({ accountId: accountIds[30]!, tankId: 1, index: 99, battles: 19 }),
        latest({ accountId: accountIds[31]!, tankId: 1, index: 99, days: 61 }),
        { ...latest({ accountId: accountIds[30]!, tankId: 1, index: 99 }), mode: 'all' },
        ...accountIds.slice(0, 29).map((accountId, index) => latest({ accountId, tankId: 2, index }))
      ]
    });

    const result = await compute();
    const rows = await prisma.tankPercentile.findMany({ select: { tankId: true, distribution: true, percentiles: true } });

    expect(result).toEqual({ tanks: 1 });

    expect(rows).toMatchInlineSnapshot(`
      [
        {
          "distribution": "bronya",
          "percentiles": {
            "components": {
              "damage": [
                1043.5,
                1087,
                1217.5,
                1435,
                1652.5,
                1783,
                1826.5,
                1861.3,
              ],
              "defence": [
                0,
                0,
                0.01,
                0.03,
                0.0475,
                0.06,
                0.06,
                0.06,
              ],
              "frags": [
                0.529,
                0.558,
                0.645,
                0.79,
                0.9349999999999999,
                1.022,
                1.051,
                1.0742,
              ],
              "spotted": [
                0.8145,
                0.829,
                0.8725,
                0.945,
                1.0175,
                1.0610000000000002,
                1.0755000000000001,
                1.0871000000000002,
              ],
              "winRate": [
                41.45,
                42.9,
                47.25,
                54.5,
                61.75,
                66.1,
                67.55,
                68.71000000000001,
              ],
            },
            "kind": "bronya",
            "levels": [
              0.05,
              0.1,
              0.25,
              0.5,
              0.75,
              0.9,
              0.95,
              0.99,
            ],
            "players": 30,
          },
          "tankId": 1,
        },
      ]
    `);
  });
});
