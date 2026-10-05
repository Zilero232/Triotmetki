import { subDays } from 'date-fns';
import { range } from 'remeda';
import { afterAll, beforeEach, expect, it } from 'vitest';

import { bonusTypesOfMode } from '../../../../../../common/lib';
import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../../../core/prisma/_tests/test-database';
import { battleSeed, playerSeed, replaySeed } from '../../../_tests/aggregates.seeds';
import { metaQueries } from '../../providers/meta-queries.provider';
import { ModeMetaAggregateService } from '../mode-meta-aggregate.service';

const FIRST_ACCOUNT = 1_000_000_500;
const accountIds = range(0, 12).map((index) => BigInt(FIRST_ACCOUNT + index));
const [ONSLAUGHT] = bonusTypesOfMode('onslaught');
const RESULTS = ['win', 'loss', 'draw'] as const;
const recently = () => subDays(new Date(), 1);

describeWithDatabase('ModeMetaAggregateService', () => {
  const prisma = createTestPrisma();

  const compute = () => new ModeMetaAggregateService(prisma, metaQueries).compute();

  const stored = () => prisma.modeTankAggregate.findMany({ omit: { computedAt: true }, orderBy: [{ mode: 'asc' }, { tankId: 'asc' }] });

  beforeEach(async () => {
    await truncateTables({ prisma, tables: ['mode_tank_aggregate', 'battle', 'replay', 'player'] });
    await prisma.player.createMany({ data: accountIds.map((accountId) => playerSeed(accountId)) });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('aggregates mod battles and uncovered replays per tank and in total, for each mode with enough accounts', async () => {
    await prisma.battle.createMany({
      data: [
        ...accountIds.slice(0, 10).map((accountId, index) =>
          battleSeed({
            accountId,
            tankId: 1,
            arenaUniqueId: BigInt(1000 + index),
            battleType: ONSLAUGHT,
            startedAt: recently(),
            result: RESULTS[index % 3],
            damageDealt: 1000 + index * 100,
            xp: 500 + index,
            frags: index % 4,
            survived: index % 3 !== 0
          })
        ),
        ...accountIds
          .slice(0, 3)
          .map((accountId, index) =>
            battleSeed({ accountId, tankId: 2, arenaUniqueId: BigInt(2000 + index), battleType: ONSLAUGHT, startedAt: recently(), damageDealt: 700 })
          ),
        battleSeed({ accountId: accountIds[0]!, tankId: 1, arenaUniqueId: 3000n, battleType: ONSLAUGHT, startedAt: subDays(new Date(), 31) }),
        battleSeed({ accountId: accountIds[0]!, tankId: 1, arenaUniqueId: 3001n, battleType: '1', startedAt: recently() })
      ]
    });

    await prisma.replay.createMany({
      data: [
        replaySeed({
          sha256: 'uncovered',
          accountId: accountIds[10],
          tankId: 1,
          arenaUniqueId: 4000n,
          battleType: ONSLAUGHT,
          result: 'win',
          damageDealt: 3000,
          xp: 900,
          frags: 3
        }),
        replaySeed({
          sha256: 'covered',
          accountId: accountIds[0],
          tankId: 1,
          arenaUniqueId: 1000n,
          battleType: ONSLAUGHT,
          result: 'win',
          damageDealt: 9999,
          xp: 9999,
          frags: 9
        }),
        replaySeed({
          sha256: 'unparsed',
          status: 'uploaded',
          accountId: accountIds[11],
          tankId: 1,
          arenaUniqueId: 4001n,
          battleType: ONSLAUGHT,
          result: 'win',
          damageDealt: 9999
        }),
        replaySeed({ sha256: 'no-damage', accountId: accountIds[11], tankId: 1, arenaUniqueId: 4002n, battleType: ONSLAUGHT, result: 'win' })
      ]
    });

    await prisma.modeTankAggregate.create({ data: { tankId: 9, mode: 'frontline', battles: 1, players: 1, wins: 1, decided: 1, windowDays: 1 } });

    const result = await compute();

    expect(result).toEqual({ onslaught: 2, frontline: 0, ranked: 0, steelHunter: 0 });

    expect(await stored()).toMatchInlineSnapshot(`
      [
        {
          "avgDamage": 1400,
          "avgFrags": 1.1428571428571428,
          "avgXp": 424.64285714285717,
          "battles": 14,
          "decided": 11,
          "modBattles": 13,
          "mode": "onslaught",
          "players": 11,
          "replayBattles": 1,
          "survivalRate": 46.15384615384615,
          "tankId": 0,
          "winRate": 72.72727272727273,
          "windowDays": 30,
          "wins": 8,
        },
        {
          "avgDamage": 1590.909090909091,
          "avgFrags": 1.4545454545454546,
          "avgXp": 540.4545454545455,
          "battles": 11,
          "decided": 8,
          "modBattles": 10,
          "mode": "onslaught",
          "players": 11,
          "replayBattles": 1,
          "survivalRate": 60,
          "tankId": 1,
          "winRate": 62.5,
          "windowDays": 30,
          "wins": 5,
        },
      ]
    `);
  });
});
