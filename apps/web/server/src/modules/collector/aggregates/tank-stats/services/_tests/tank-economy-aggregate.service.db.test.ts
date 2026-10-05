import { subDays } from 'date-fns';
import { range } from 'remeda';
import { afterAll, beforeEach, expect, it } from 'vitest';

import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../../../core/prisma/_tests/test-database';
import { battleSeed, playerSeed, replaySeed } from '../../../_tests/aggregates.seeds';
import { tankStatsQueries } from '../../providers/tank-stats-queries.provider';
import { TankEconomyAggregateService } from '../tank-economy-aggregate.service';

const FIRST_ACCOUNT = 1_000_000_200;
const RANDOM = '1';
const recently = () => subDays(new Date(), 1);

const accountIds = (count: number) => range(0, count).map((index) => BigInt(FIRST_ACCOUNT + index));

const economyBattles = ({ tankId, accounts }: { tankId: number; accounts: readonly bigint[] }) =>
  accounts.flatMap((accountId, index) =>
    range(0, 4).map((battle) =>
      battleSeed({
        accountId,
        tankId,
        arenaUniqueId: BigInt(tankId * 100_000 + index * 10 + battle),
        battleType: RANDOM,
        startedAt: recently(),
        credits: 10_000 + index * 1000 + battle * 100,
        creditsGross: 20_000 + index * 1000,
        repairCost: battle === 3 ? null : 3000 + battle * 10,
        ammoCost: 2000 + index * 10,
        consumablesCost: 500,
        xp: 800 + index,
        freeXp: 40 + battle,
        isPremiumAccount: battle % 2 === 0
      })
    )
  );

describeWithDatabase('TankEconomyAggregateService', () => {
  const prisma = createTestPrisma();

  const compute = () => new TankEconomyAggregateService(prisma, tankStatsQueries).compute();

  const stored = () =>
    prisma.tankEconomyAggregate.findMany({
      omit: { computedAt: true },
      orderBy: [{ tankId: 'asc' }, { account: 'asc' }]
    });

  beforeEach(async () => {
    await truncateTables({ prisma, tables: ['tank_economy_aggregate', 'battle', 'replay', 'player'] });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('stores the median economy per tank for all, premium and standard accounts from mod battles and replays', async () => {
    const accounts = accountIds(12);

    await prisma.player.createMany({ data: accountIds(14).map((accountId) => playerSeed(accountId)) });

    await prisma.battle.createMany({
      data: [
        ...economyBattles({ tankId: 1, accounts }),
        ...economyBattles({ tankId: 2, accounts: accounts.slice(0, 5) }),
        battleSeed({
          accountId: accounts[0]!,
          tankId: 1,
          arenaUniqueId: 900_001n,
          battleType: RANDOM,
          startedAt: subDays(new Date(), 40),
          credits: 1
        }),
        battleSeed({ accountId: accounts[0]!, tankId: 1, arenaUniqueId: 900_002n, battleType: '7', startedAt: recently(), credits: 1 }),
        battleSeed({ accountId: accounts[0]!, tankId: 1, arenaUniqueId: 900_003n, battleType: RANDOM, startedAt: recently(), credits: null })
      ]
    });

    await prisma.replay.createMany({
      data: [
        replaySeed({
          sha256: 'recorder',
          accountId: BigInt(FIRST_ACCOUNT + 13),
          tankId: 1,
          arenaUniqueId: 800_001n,
          xp: 1500,
          summary: {
            players: [
              { isRecorder: false, result: { credits: 1 } },
              { isRecorder: true, result: { credits: 55_555.6 } }
            ]
          }
        }),
        replaySeed({
          sha256: 'covered-by-mod',
          accountId: accounts[0],
          tankId: 1,
          arenaUniqueId: 100_000n,
          xp: 1500,
          summary: { players: [{ isRecorder: true, result: { credits: 99_999 } }] }
        }),
        replaySeed({
          sha256: 'no-xp',
          accountId: BigInt(FIRST_ACCOUNT + 13),
          tankId: 1,
          arenaUniqueId: 800_002n,
          summary: { players: [{ isRecorder: true, result: { credits: 99_999 } }] }
        }),
        replaySeed({
          sha256: 'no-credits',
          accountId: BigInt(FIRST_ACCOUNT + 13),
          tankId: 1,
          arenaUniqueId: 800_003n,
          xp: 1500,
          summary: { players: [{ isRecorder: true, result: {} }] }
        })
      ]
    });

    const result = await compute();

    expect(result).toEqual({ rows: 3 });

    expect(await stored()).toMatchInlineSnapshot(`
      [
        {
          "account": "all",
          "ammo": 2055,
          "battles": 49,
          "consumables": 500,
          "costBattles": 36,
          "credits": 16000,
          "creditsBase": 25500,
          "freeXp": 42,
          "net": 10035,
          "players": 13,
          "repair": 3010,
          "tankId": 1,
          "windowDays": 30,
          "xp": 806,
        },
        {
          "account": "premium",
          "ammo": 2055,
          "battles": 24,
          "consumables": 500,
          "costBattles": 24,
          "credits": 15600,
          "creditsBase": 25500,
          "freeXp": 41,
          "net": 10035,
          "players": 12,
          "repair": 3010,
          "tankId": 1,
          "windowDays": 30,
          "xp": 806,
        },
        {
          "account": "standard",
          "ammo": 2055,
          "battles": 24,
          "consumables": 500,
          "costBattles": 12,
          "credits": 15700,
          "creditsBase": 25500,
          "freeXp": 42,
          "net": 10035,
          "players": 12,
          "repair": 3010,
          "tankId": 1,
          "windowDays": 30,
          "xp": 806,
        },
      ]
    `);
  });

  it('replaces the previous rows', async () => {
    await prisma.tankEconomyAggregate.create({ data: { tankId: 9, account: 'all', battles: 1, players: 1, windowDays: 1 } });

    await compute();

    expect(await stored()).toEqual([]);
  });
});
