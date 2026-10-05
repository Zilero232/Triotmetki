import { subHours } from 'date-fns';
import { afterAll, beforeEach, expect, it } from 'vitest';

import { moscowDayStart } from '../../../../../../common/lib';
import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../../../core/prisma/_tests/test-database';
import { playerSeed, tankBattleDeltaSeed } from '../../../_tests/aggregates.seeds';
import { ReferenceTablesService } from '../../../player-ratings';
import { serverQueries } from '../../providers/server-queries.provider';
import { ServerStatsAggregateService } from '../server-stats-aggregate.service';

const FIRST = 1_000_000_601n;
const SECOND = 1_000_000_602n;
const THIRD = 1_000_000_603n;
const today = () => moscowDayStart(new Date());

const vehicle = (tankId: number) => ({
  tankId,
  name: `tank-${tankId}`,
  shortName: `tank-${tankId}`,
  slug: `tank-${tankId}`,
  nation: 'ussr',
  type: 'heavyTank' as const,
  tier: 8,
  prevTankIds: []
});

describeWithDatabase('ServerStatsAggregateService', () => {
  const prisma = createTestPrisma();

  const compute = () => new ServerStatsAggregateService(prisma, new ReferenceTablesService(prisma), serverQueries).compute();

  beforeEach(async () => {
    await truncateTables({ prisma, tables: ['tank_server_stats', 'tank_battle_delta', 'vehicle', 'player'] });
    await prisma.player.createMany({ data: [playerSeed(FIRST), playerSeed(SECOND), playerSeed(THIRD)] });
    await prisma.vehicle.createMany({ data: [vehicle(1), vehicle(2)] });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('stores per-period tank stats for every cohort and for all cohorts together, with players, popularity and tier-list ranks', async () => {
    const yesterday = subHours(today(), 12);
    const twoDaysAgo = subHours(today(), 36);

    await prisma.tankBattleDelta.createMany({
      data: [
        tankBattleDeltaSeed({
          accountId: FIRST,
          tankId: 1,
          capturedAt: yesterday,
          battles: 300,
          wins: 160,
          damageDealt: 600_000,
          frags: 300,
          spotted: 400,
          xp: 240_000,
          damageBlocked: 150_000,
          survived: 120,
          hits: 2400,
          shots: 3000,
          accountWinRate: 52
        }),
        tankBattleDeltaSeed({
          accountId: SECOND,
          tankId: 1,
          capturedAt: twoDaysAgo,
          cohort: 'good',
          battles: 250,
          wins: 140,
          damageDealt: 550_000,
          frags: 280,
          spotted: 300,
          xp: 200_000,
          damageBlocked: 100_000,
          survived: 110,
          hits: 2000,
          shots: 2500,
          accountWinRate: 55
        }),
        tankBattleDeltaSeed({
          accountId: THIRD,
          tankId: 2,
          capturedAt: twoDaysAgo,
          battles: 40,
          wins: 18,
          damageDealt: 50_000,
          frags: 20,
          spotted: 30,
          xp: 30_000,
          survived: 10,
          hits: 300,
          shots: 400,
          accountWinRate: 49
        }),
        tankBattleDeltaSeed({ accountId: THIRD, tankId: 2, capturedAt: subHours(today(), -1), battles: 999 }),
        tankBattleDeltaSeed({ accountId: FIRST, tankId: 2, capturedAt: yesterday, mode: 'all', battles: 7, wins: 7 })
      ]
    });

    const result = await compute();
    const stored = await prisma.tankServerStats.findMany({
      omit: { computedAt: true },
      orderBy: [{ mode: 'asc' }, { period: 'asc' }, { cohort: 'asc' }, { tankId: 'asc' }]
    });

    expect(result).toEqual({ rows: stored.length });

    expect(stored.map((row) => `${row.mode}/${row.period}/${row.cohort}/${row.tankId}`)).toMatchInlineSnapshot(`
      [
        "all/d1/all/2",
        "all/d1/average/2",
        "all/d7/all/2",
        "all/d7/average/2",
        "all/d14/all/2",
        "all/d14/average/2",
        "all/d30/all/2",
        "all/d30/average/2",
        "all/d60/all/2",
        "all/d60/average/2",
        "random/d1/all/1",
        "random/d1/average/1",
        "random/d7/all/1",
        "random/d7/all/2",
        "random/d7/average/1",
        "random/d7/average/2",
        "random/d7/good/1",
        "random/d14/all/1",
        "random/d14/all/2",
        "random/d14/average/1",
        "random/d14/average/2",
        "random/d14/good/1",
        "random/d30/all/1",
        "random/d30/all/2",
        "random/d30/average/1",
        "random/d30/average/2",
        "random/d30/good/1",
        "random/d60/all/1",
        "random/d60/all/2",
        "random/d60/average/1",
        "random/d60/average/2",
        "random/d60/good/1",
      ]
    `);

    expect(stored.filter((row) => row.mode === 'random' && row.period === 'd7')).toMatchInlineSnapshot(`
      [
        {
          "accuracy": 80,
          "avgBlocked": 454.54545454545456,
          "avgDamage": 2090.909090909091,
          "avgFrags": 1.0545454545454545,
          "avgSpotted": 1.2727272727272727,
          "avgXp": 800,
          "battles": 550,
          "cohort": "all",
          "mode": "random",
          "period": "d7",
          "playerWinRate": 53.36363636363637,
          "players": 2,
          "popularityRank": 1,
          "samples": 2,
          "survivalRate": 41.81818181818181,
          "tankId": 1,
          "tierListRank": "D",
          "winRate": 54.54545454545455,
          "winRateDiff": 1.1818181818181799,
        },
        {
          "accuracy": 75,
          "avgBlocked": 0,
          "avgDamage": 1250,
          "avgFrags": 0.5,
          "avgSpotted": 0.75,
          "avgXp": 750,
          "battles": 40,
          "cohort": "all",
          "mode": "random",
          "period": "d7",
          "playerWinRate": 49,
          "players": 1,
          "popularityRank": 2,
          "samples": 1,
          "survivalRate": 25,
          "tankId": 2,
          "tierListRank": null,
          "winRate": 45,
          "winRateDiff": -4,
        },
        {
          "accuracy": 80,
          "avgBlocked": 500,
          "avgDamage": 2000,
          "avgFrags": 1,
          "avgSpotted": 1.3333333333333333,
          "avgXp": 800,
          "battles": 300,
          "cohort": "average",
          "mode": "random",
          "period": "d7",
          "playerWinRate": 52,
          "players": 1,
          "popularityRank": 1,
          "samples": 1,
          "survivalRate": 40,
          "tankId": 1,
          "tierListRank": null,
          "winRate": 53.333333333333336,
          "winRateDiff": 1.3333333333333357,
        },
        {
          "accuracy": 75,
          "avgBlocked": 0,
          "avgDamage": 1250,
          "avgFrags": 0.5,
          "avgSpotted": 0.75,
          "avgXp": 750,
          "battles": 40,
          "cohort": "average",
          "mode": "random",
          "period": "d7",
          "playerWinRate": 49,
          "players": 1,
          "popularityRank": 2,
          "samples": 1,
          "survivalRate": 25,
          "tankId": 2,
          "tierListRank": null,
          "winRate": 45,
          "winRateDiff": -4,
        },
        {
          "accuracy": 80,
          "avgBlocked": 400,
          "avgDamage": 2200,
          "avgFrags": 1.12,
          "avgSpotted": 1.2,
          "avgXp": 800,
          "battles": 250,
          "cohort": "good",
          "mode": "random",
          "period": "d7",
          "playerWinRate": 55,
          "players": 1,
          "popularityRank": 1,
          "samples": 1,
          "survivalRate": 44,
          "tankId": 1,
          "tierListRank": null,
          "winRate": 56,
          "winRateDiff": 1,
        },
      ]
    `);
  });
});
