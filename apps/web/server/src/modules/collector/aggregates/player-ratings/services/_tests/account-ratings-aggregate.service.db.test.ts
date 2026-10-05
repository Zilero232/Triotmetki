import { subDays, subHours } from 'date-fns';
import { afterAll, beforeEach, expect, it } from 'vitest';

import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../../../core/prisma/_tests/test-database';
import { accountSnapshotSeed, playerSeed, tankSnapshotLatestSeed, tankSnapshotSeed } from '../../../_tests/aggregates.seeds';
import { playerRatingsQueries } from '../../providers/player-ratings-queries.provider';
import { AccountRatingsAggregateService } from '../account-ratings-aggregate.service';
import { ReferenceTablesService } from '../reference-tables.service';

const ACCOUNT = 1_000_001_101n;

const tankTotals = (battles: number) => ({
  battles,
  wins: Math.round(battles * 0.55),
  losses: Math.round(battles * 0.44),
  damageDealt: battles * 2100,
  damageReceived: battles * 1500,
  frags: Math.round(battles * 1.1),
  spotted: Math.round(battles * 1.4),
  xp: battles * 800,
  survived: Math.round(battles * 0.4),
  hits: battles * 8,
  shots: battles * 10,
  capturePoints: battles,
  droppedCapturePoints: battles * 2
});

describeWithDatabase('AccountRatingsAggregateService', () => {
  const prisma = createTestPrisma();

  const compute = () =>
    new AccountRatingsAggregateService(prisma, new ReferenceTablesService(prisma), playerRatingsQueries).compute({ accountId: Number(ACCOUNT) });

  beforeEach(async () => {
    await truncateTables({
      prisma,
      tables: [
        'account_rating',
        'account_tank_rating',
        'account_snapshot',
        'tank_snapshot',
        'tank_snapshot_latest',
        'wn8_expected_value',
        'vehicle',
        'player'
      ]
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('skips an account that is not stored', async () => {
    expect(await compute()).toEqual({ skipped: true });
  });

  it('rates the account overall and for every period its snapshot history covers', async () => {
    const now = new Date();
    const times = [subDays(now, 90), subDays(now, 20), subDays(now, 5), subHours(now, 30), subHours(now, 2)];
    const battles = [1000, 1400, 1600, 1650, 1700];

    await prisma.player.create({ data: playerSeed(ACCOUNT) });

    await prisma.vehicle.createMany({
      data: [1, 2].map((tankId) => ({
        tankId,
        name: `t${tankId}`,
        shortName: `t${tankId}`,
        slug: `t${tankId}`,
        nation: 'ussr',
        type: 'heavyTank' as const,
        tier: 7 + tankId,
        prevTankIds: []
      }))
    });

    await prisma.wn8ExpectedValue.create({
      data: { tankId: 1, date: subDays(now, 3), source: 'xvm', expDamage: 1800, expFrags: 1, expSpotted: 1.2, expDefense: 0.8, expWinRate: 52 }
    });

    await prisma.accountSnapshot.createMany({
      data: times.map((capturedAt, index) => accountSnapshotSeed({ accountId: ACCOUNT, capturedAt, battles: battles[index]! }))
    });

    await prisma.tankSnapshot.createMany({
      data: times.flatMap((capturedAt, index) => [
        tankSnapshotSeed({ accountId: ACCOUNT, tankId: 1, capturedAt, ...tankTotals(battles[index]! - 400) }),
        tankSnapshotSeed({ accountId: ACCOUNT, tankId: 2, capturedAt, ...tankTotals(400 + index * 10) })
      ])
    });

    await prisma.tankSnapshotLatest.createMany({
      data: [
        tankSnapshotLatestSeed({ accountId: ACCOUNT, tankId: 1, capturedAt: times[4]!, ...tankTotals(1300) }),
        tankSnapshotLatestSeed({ accountId: ACCOUNT, tankId: 2, capturedAt: times[4]!, ...tankTotals(440) })
      ]
    });

    const result = await compute();
    const indexOf = (date: Date | null) => (date === null ? null : times.findIndex((time) => time.getTime() === date.getTime()));
    const ratings = await prisma.accountRating.findMany({ omit: { computedAt: true }, orderBy: { period: 'asc' } });
    const tankRatings = await prisma.accountTankRating.findMany({ omit: { computedAt: true }, orderBy: [{ period: 'asc' }, { tankId: 'asc' }] });

    expect(result).toMatchInlineSnapshot(`
      {
        "mode": "random",
        "periods": 6,
        "tanks": 12,
      }
    `);

    expect(ratings.map(({ fromCapturedAt, toCapturedAt, ...row }) => ({ ...row, from: indexOf(fromCapturedAt), to: indexOf(toCapturedAt) })))
      .toMatchInlineSnapshot(`
      [
        {
          "accountId": 1000001101n,
          "avgDamage": 2100,
          "avgFrags": 1.1,
          "avgTier": 8.25287356321839,
          "battles": 1740,
          "broneIndex": null,
          "eff": 1783.448227360259,
          "from": null,
          "period": "overall",
          "to": 4,
          "winRate": 55,
          "wn8": 1975.8192501942503,
        },
        {
          "accountId": 1000001101n,
          "avgDamage": 2100,
          "avgFrags": 1.1,
          "avgTier": 8.166666666666666,
          "battles": 60,
          "broneIndex": null,
          "eff": 1786.7480509285895,
          "from": 3,
          "period": "h24",
          "to": 4,
          "winRate": 53.333333333333336,
          "wn8": 1966.2038655788658,
        },
        {
          "accountId": 1000001101n,
          "avgDamage": 2100,
          "avgFrags": 1.1,
          "avgTier": 8.090909090909092,
          "battles": 330,
          "broneIndex": null,
          "eff": 1789.6944399405522,
          "from": 1,
          "period": "d7",
          "to": 4,
          "winRate": 54.84848484848485,
          "wn8": 1975.8192501942503,
        },
        {
          "accountId": 1000001101n,
          "avgDamage": 2100,
          "avgFrags": 1.1,
          "avgTier": 8.054054054054054,
          "battles": 740,
          "broneIndex": null,
          "eff": 1791.1438732448241,
          "from": 0,
          "period": "d30",
          "to": 4,
          "winRate": 55,
          "wn8": 1975.8192501942503,
        },
        {
          "accountId": 1000001101n,
          "avgDamage": 2100,
          "avgFrags": 1.1,
          "avgTier": 8.054054054054054,
          "battles": 740,
          "broneIndex": null,
          "eff": 1791.1438732448241,
          "from": 0,
          "period": "d60",
          "to": 4,
          "winRate": 55,
          "wn8": 1975.8192501942503,
        },
        {
          "accountId": 1000001101n,
          "avgDamage": 2100,
          "avgFrags": 1.1,
          "avgTier": 8.054054054054054,
          "battles": 740,
          "broneIndex": null,
          "eff": 1791.1438732448241,
          "from": 0,
          "period": "b1000",
          "to": 4,
          "winRate": 55,
          "wn8": 1975.8192501942503,
        },
      ]
    `);

    expect(tankRatings).toMatchInlineSnapshot(`
      [
        {
          "accountId": 1000001101n,
          "avgDamage": 2100,
          "avgFrags": 1.1,
          "avgXp": 0,
          "battles": 1300,
          "damagePercentile": null,
          "period": "overall",
          "tankId": 1,
          "winRate": 55,
          "wn8": 1975.8192501942506,
        },
        {
          "accountId": 1000001101n,
          "avgDamage": 2100,
          "avgFrags": 1.1,
          "avgXp": 0,
          "battles": 440,
          "damagePercentile": null,
          "period": "overall",
          "tankId": 2,
          "winRate": 55,
          "wn8": null,
        },
        {
          "accountId": 1000001101n,
          "avgDamage": 2100,
          "avgFrags": 1.1,
          "avgXp": 800,
          "battles": 50,
          "damagePercentile": null,
          "period": "h24",
          "tankId": 1,
          "winRate": 54,
          "wn8": 1966.2038655788658,
        },
        {
          "accountId": 1000001101n,
          "avgDamage": 2100,
          "avgFrags": 1.1,
          "avgXp": 800,
          "battles": 10,
          "damagePercentile": null,
          "period": "h24",
          "tankId": 2,
          "winRate": 50,
          "wn8": null,
        },
        {
          "accountId": 1000001101n,
          "avgDamage": 2100,
          "avgFrags": 1.1,
          "avgXp": 800,
          "battles": 300,
          "damagePercentile": null,
          "period": "d7",
          "tankId": 1,
          "winRate": 55,
          "wn8": 1975.8192501942506,
        },
        {
          "accountId": 1000001101n,
          "avgDamage": 2100,
          "avgFrags": 1.1,
          "avgXp": 800,
          "battles": 30,
          "damagePercentile": null,
          "period": "d7",
          "tankId": 2,
          "winRate": 53.333333333333336,
          "wn8": null,
        },
        {
          "accountId": 1000001101n,
          "avgDamage": 2100,
          "avgFrags": 1.1,
          "avgXp": 800,
          "battles": 700,
          "damagePercentile": null,
          "period": "d30",
          "tankId": 1,
          "winRate": 55,
          "wn8": 1975.8192501942506,
        },
        {
          "accountId": 1000001101n,
          "avgDamage": 2100,
          "avgFrags": 1.1,
          "avgXp": 800,
          "battles": 40,
          "damagePercentile": null,
          "period": "d30",
          "tankId": 2,
          "winRate": 55,
          "wn8": null,
        },
        {
          "accountId": 1000001101n,
          "avgDamage": 2100,
          "avgFrags": 1.1,
          "avgXp": 800,
          "battles": 700,
          "damagePercentile": null,
          "period": "d60",
          "tankId": 1,
          "winRate": 55,
          "wn8": 1975.8192501942506,
        },
        {
          "accountId": 1000001101n,
          "avgDamage": 2100,
          "avgFrags": 1.1,
          "avgXp": 800,
          "battles": 40,
          "damagePercentile": null,
          "period": "d60",
          "tankId": 2,
          "winRate": 55,
          "wn8": null,
        },
        {
          "accountId": 1000001101n,
          "avgDamage": 2100,
          "avgFrags": 1.1,
          "avgXp": 800,
          "battles": 700,
          "damagePercentile": null,
          "period": "b1000",
          "tankId": 1,
          "winRate": 55,
          "wn8": 1975.8192501942506,
        },
        {
          "accountId": 1000001101n,
          "avgDamage": 2100,
          "avgFrags": 1.1,
          "avgXp": 800,
          "battles": 40,
          "damagePercentile": null,
          "period": "b1000",
          "tankId": 2,
          "winRate": 55,
          "wn8": null,
        },
      ]
    `);
  });
});
