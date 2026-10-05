import { subDays } from 'date-fns';
import { afterAll, beforeEach, expect, it } from 'vitest';

import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../../../core/prisma/_tests/test-database';
import { battleSeed, playerSeed } from '../../../_tests/aggregates.seeds';
import { metaQueries } from '../../providers/meta-queries.provider';
import { BuildUsageAggregateService } from '../build-usage-aggregate.service';

const TOP = 1_000_000_801n;
const MIDDLE = 1_000_000_802n;
const BOTTOM = 1_000_000_803n;
const recently = () => subDays(new Date(), 1);

const loadout = ({ devices, shells }: { devices: (number | null)[]; shells: { shellId: number; count: number }[] }) => ({
  optionalDevices: devices,
  consumables: [11, 12],
  directives: [],
  shells,
  fieldModifications: ['mod-a'],
  crew: [{ role: 'gunner', skills: ['aim', 'snap'] }],
  gameplayId: null
});

const rating = (accountId: bigint, wn8: number) => ({
  accountId,
  tankId: 1,
  period: 'overall' as const,
  battles: 100,
  winRate: 50,
  avgDamage: 1000,
  avgFrags: 1,
  avgXp: 500,
  wn8
});

describeWithDatabase('BuildUsageAggregateService', () => {
  const prisma = createTestPrisma();

  const compute = () => new BuildUsageAggregateService(prisma, metaQueries).compute();

  beforeEach(async () => {
    await truncateTables({ prisma, tables: ['build_usage_aggregate', 'account_tank_rating', 'battle', 'game_version', 'player'] });
    await prisma.player.createMany({ data: [playerSeed(TOP), playerSeed(MIDDLE), playerSeed(BOTTOM)] });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('stores loadout usage per mode and skill cohort for the current game version and drops its stale rows', async () => {
    await prisma.gameVersion.createMany({
      data: [
        { version: '2.1', isCurrent: true },
        { version: '2.1-test', isCurrent: true, isTest: true }
      ]
    });

    await prisma.accountTankRating.createMany({ data: [rating(TOP, 3000), rating(MIDDLE, 2000), rating(BOTTOM, 1000)] });

    await prisma.battle.createMany({
      data: [
        battleSeed({
          accountId: TOP,
          tankId: 1,
          arenaUniqueId: 1n,
          startedAt: recently(),
          damageDealt: 4000,
          loadout: loadout({
            devices: [101, 102, null],
            shells: [
              { shellId: 7, count: 30 },
              { shellId: 8, count: 10 }
            ]
          })
        }),
        battleSeed({
          accountId: TOP,
          tankId: 1,
          arenaUniqueId: 2n,
          startedAt: recently(),
          result: 'draw',
          damageDealt: 3000,
          loadout: loadout({ devices: [101, 103, null], shells: [{ shellId: 7, count: 40 }] })
        }),
        battleSeed({
          accountId: MIDDLE,
          tankId: 1,
          arenaUniqueId: 3n,
          startedAt: recently(),
          result: 'loss',
          damageDealt: 2000,
          loadout: loadout({ devices: [104, 102, 105], shells: [{ shellId: 8, count: 20 }] })
        }),
        battleSeed({
          accountId: BOTTOM,
          tankId: 1,
          arenaUniqueId: 4n,
          startedAt: recently(),
          battleType: '22',
          damageDealt: 1500,
          loadout: loadout({ devices: [101], shells: [] })
        }),
        battleSeed({
          accountId: BOTTOM,
          tankId: 1,
          arenaUniqueId: 5n,
          startedAt: recently(),
          battleType: '13',
          damageDealt: 1500,
          loadout: loadout({ devices: [101], shells: [] })
        }),
        battleSeed({
          accountId: BOTTOM,
          tankId: 1,
          arenaUniqueId: 6n,
          startedAt: subDays(new Date(), 31),
          damageDealt: 1500,
          loadout: loadout({ devices: [101], shells: [] })
        }),
        battleSeed({ accountId: BOTTOM, tankId: 2, arenaUniqueId: 7n, startedAt: recently(), damageDealt: 1500 })
      ]
    });

    await prisma.buildUsageAggregate.createMany({
      data: [
        {
          tankId: 9,
          mode: 'random',
          cohort: 'all',
          gameVersion: '2.1',
          battles: 1,
          players: 1,
          usage: {},
          windowDays: 30,
          computedAt: subDays(new Date(), 2)
        },
        {
          tankId: 9,
          mode: 'random',
          cohort: 'all',
          gameVersion: '2.0',
          battles: 1,
          players: 1,
          usage: {},
          windowDays: 30,
          computedAt: subDays(new Date(), 2)
        }
      ]
    });

    const result = await compute();
    const stored = await prisma.buildUsageAggregate.findMany({
      omit: { computedAt: true },
      orderBy: [{ gameVersion: 'asc' }, { tankId: 'asc' }, { mode: 'asc' }, { cohort: 'asc' }]
    });

    expect(result).toEqual({ tanks: 1, groups: 4, removed: 1, gameVersion: '2.1' });

    expect(stored).toMatchInlineSnapshot(`
      [
        {
          "avgDamage": null,
          "battles": 1,
          "cohort": "all",
          "gameVersion": "2.0",
          "mode": "random",
          "players": 1,
          "tankId": 9,
          "usage": {},
          "winRate": null,
          "windowDays": 30,
        },
        {
          "avgDamage": 3000,
          "battles": 3,
          "cohort": "all",
          "gameVersion": "2.1",
          "mode": "random",
          "players": 2,
          "tankId": 1,
          "usage": {
            "consumables": [
              {
                "avgDamage": 3000,
                "battles": 3,
                "id": 11,
                "share": 1,
                "winRate": 50,
              },
              {
                "avgDamage": 3000,
                "battles": 3,
                "id": 12,
                "share": 1,
                "winRate": 50,
              },
            ],
            "crew": [
              {
                "members": 3,
                "role": "gunner",
                "skills": [
                  {
                    "avgPosition": 0,
                    "share": 1,
                    "skill": "aim",
                  },
                  {
                    "avgPosition": 1,
                    "share": 1,
                    "skill": "snap",
                  },
                ],
              },
            ],
            "directives": [],
            "equipment": [
              {
                "picks": [
                  {
                    "avgDamage": 3500,
                    "battles": 2,
                    "id": 101,
                    "share": 0.5,
                    "winRate": 100,
                  },
                  {
                    "avgDamage": 2000,
                    "battles": 1,
                    "id": 104,
                    "share": 0.5,
                    "winRate": 0,
                  },
                ],
                "slot": 0,
              },
              {
                "picks": [
                  {
                    "avgDamage": 3000,
                    "battles": 2,
                    "id": 102,
                    "share": 0.75,
                    "winRate": 50,
                  },
                  {
                    "avgDamage": 3000,
                    "battles": 1,
                    "id": 103,
                    "share": 0.25,
                    "winRate": null,
                  },
                ],
                "slot": 1,
              },
              {
                "picks": [
                  {
                    "avgDamage": 2000,
                    "battles": 1,
                    "id": 105,
                    "share": 0.5,
                    "winRate": 0,
                  },
                ],
                "slot": 2,
              },
            ],
            "fieldModifications": [
              {
                "avgDamage": 3000,
                "battles": 3,
                "share": 1,
                "tag": "mod-a",
                "winRate": 50,
              },
            ],
            "shells": [
              {
                "ammoShare": 0.5625,
                "avgCount": 15,
                "share": 0.75,
                "shellId": 8,
              },
              {
                "ammoShare": 0.4375,
                "avgCount": 35,
                "share": 0.5,
                "shellId": 7,
              },
            ],
          },
          "winRate": 50,
          "windowDays": 30,
        },
        {
          "avgDamage": 3500,
          "battles": 2,
          "cohort": "top10",
          "gameVersion": "2.1",
          "mode": "random",
          "players": 1,
          "tankId": 1,
          "usage": {
            "consumables": [
              {
                "avgDamage": 3500,
                "battles": 2,
                "id": 11,
                "share": 1,
                "winRate": 100,
              },
              {
                "avgDamage": 3500,
                "battles": 2,
                "id": 12,
                "share": 1,
                "winRate": 100,
              },
            ],
            "crew": [
              {
                "members": 2,
                "role": "gunner",
                "skills": [
                  {
                    "avgPosition": 0,
                    "share": 1,
                    "skill": "aim",
                  },
                  {
                    "avgPosition": 1,
                    "share": 1,
                    "skill": "snap",
                  },
                ],
              },
            ],
            "directives": [],
            "equipment": [
              {
                "picks": [
                  {
                    "avgDamage": 3500,
                    "battles": 2,
                    "id": 101,
                    "share": 1,
                    "winRate": 100,
                  },
                ],
                "slot": 0,
              },
              {
                "picks": [
                  {
                    "avgDamage": 4000,
                    "battles": 1,
                    "id": 102,
                    "share": 0.5,
                    "winRate": 100,
                  },
                  {
                    "avgDamage": 3000,
                    "battles": 1,
                    "id": 103,
                    "share": 0.5,
                    "winRate": null,
                  },
                ],
                "slot": 1,
              },
            ],
            "fieldModifications": [
              {
                "avgDamage": 3500,
                "battles": 2,
                "share": 1,
                "tag": "mod-a",
                "winRate": 100,
              },
            ],
            "shells": [
              {
                "ammoShare": 0.875,
                "avgCount": 35,
                "share": 1,
                "shellId": 7,
              },
              {
                "ammoShare": 0.125,
                "avgCount": 10,
                "share": 0.5,
                "shellId": 8,
              },
            ],
          },
          "winRate": 100,
          "windowDays": 30,
        },
        {
          "avgDamage": 3500,
          "battles": 2,
          "cohort": "top1",
          "gameVersion": "2.1",
          "mode": "random",
          "players": 1,
          "tankId": 1,
          "usage": {
            "consumables": [
              {
                "avgDamage": 3500,
                "battles": 2,
                "id": 11,
                "share": 1,
                "winRate": 100,
              },
              {
                "avgDamage": 3500,
                "battles": 2,
                "id": 12,
                "share": 1,
                "winRate": 100,
              },
            ],
            "crew": [
              {
                "members": 2,
                "role": "gunner",
                "skills": [
                  {
                    "avgPosition": 0,
                    "share": 1,
                    "skill": "aim",
                  },
                  {
                    "avgPosition": 1,
                    "share": 1,
                    "skill": "snap",
                  },
                ],
              },
            ],
            "directives": [],
            "equipment": [
              {
                "picks": [
                  {
                    "avgDamage": 3500,
                    "battles": 2,
                    "id": 101,
                    "share": 1,
                    "winRate": 100,
                  },
                ],
                "slot": 0,
              },
              {
                "picks": [
                  {
                    "avgDamage": 4000,
                    "battles": 1,
                    "id": 102,
                    "share": 0.5,
                    "winRate": 100,
                  },
                  {
                    "avgDamage": 3000,
                    "battles": 1,
                    "id": 103,
                    "share": 0.5,
                    "winRate": null,
                  },
                ],
                "slot": 1,
              },
            ],
            "fieldModifications": [
              {
                "avgDamage": 3500,
                "battles": 2,
                "share": 1,
                "tag": "mod-a",
                "winRate": 100,
              },
            ],
            "shells": [
              {
                "ammoShare": 0.875,
                "avgCount": 35,
                "share": 1,
                "shellId": 7,
              },
              {
                "ammoShare": 0.125,
                "avgCount": 10,
                "share": 0.5,
                "shellId": 8,
              },
            ],
          },
          "winRate": 100,
          "windowDays": 30,
        },
        {
          "avgDamage": 1500,
          "battles": 1,
          "cohort": "all",
          "gameVersion": "2.1",
          "mode": "ranked",
          "players": 1,
          "tankId": 1,
          "usage": {
            "consumables": [
              {
                "avgDamage": 1500,
                "battles": 1,
                "id": 11,
                "share": 1,
                "winRate": 100,
              },
              {
                "avgDamage": 1500,
                "battles": 1,
                "id": 12,
                "share": 1,
                "winRate": 100,
              },
            ],
            "crew": [
              {
                "members": 1,
                "role": "gunner",
                "skills": [
                  {
                    "avgPosition": 0,
                    "share": 1,
                    "skill": "aim",
                  },
                  {
                    "avgPosition": 1,
                    "share": 1,
                    "skill": "snap",
                  },
                ],
              },
            ],
            "directives": [],
            "equipment": [
              {
                "picks": [
                  {
                    "avgDamage": 1500,
                    "battles": 1,
                    "id": 101,
                    "share": 1,
                    "winRate": 100,
                  },
                ],
                "slot": 0,
              },
            ],
            "fieldModifications": [
              {
                "avgDamage": 1500,
                "battles": 1,
                "share": 1,
                "tag": "mod-a",
                "winRate": 100,
              },
            ],
            "shells": [],
          },
          "winRate": 100,
          "windowDays": 30,
        },
      ]
    `);
  });

  it('files the usage under the unknown version when no release is current', async () => {
    await prisma.battle.create({
      data: battleSeed({ accountId: TOP, tankId: 1, arenaUniqueId: 1n, startedAt: recently(), loadout: loadout({ devices: [101], shells: [] }) })
    });

    const result = await compute();

    expect(result).toMatchInlineSnapshot(`
      {
        "gameVersion": "unknown",
        "groups": 1,
        "removed": 0,
        "tanks": 1,
      }
    `);
  });
});
