import { describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { Battle } from '../../../../../../../generated';
import type { PrismaService } from '../../../../../../core';
import type { MetaQueries } from '../../meta.types';

import { mockPrismaService } from '../../../../../../core/prisma/_tests/prisma-mock';
import { BuildUsageAggregateService } from '../build-usage-aggregate.service';

type TankGroup = Awaited<ReturnType<PrismaService['battle']['groupBy']>>[number];

const loadout = {
  optionalDevices: [1, 2, null],
  consumables: [10],
  directives: [],
  shells: [{ shellId: 100, count: 30 }],
  fieldModifications: [],
  crew: [],
  gameplayId: 0
};

const battle = (fields: Pick<Battle, 'accountId' | 'battleType' | 'result'>) =>
  Object.assign(mock<Battle>({ ...fields, damageDealt: 2_000 }), { loadout });

const createService = () => {
  const prisma = mockPrismaService();
  const queries = mock<MetaQueries>();

  prisma.gameVersion.findFirst.mockResolvedValue(null);
  prisma.$transaction.mockResolvedValue([]);
  prisma.buildUsageAggregate.deleteMany.mockResolvedValue({ count: 2 });

  queries.buildRanks.mockResolvedValue([
    { tank_id: 7, account_id: 1, rank: 0 },
    { tank_id: 8, account_id: 2, rank: 0 }
  ]);

  return { prisma, queries, service: new BuildUsageAggregateService(prisma, queries) };
};

describe('BuildUsageAggregateService', () => {
  it('writes one row per mode and cohort of every tank and drops the stale ones', async () => {
    const { prisma, service } = createService();

    vi.mocked(prisma.battle.groupBy).mockResolvedValueOnce([mock<TankGroup>({ tankId: 7 })]);

    prisma.battle.findMany.mockResolvedValueOnce([
      battle({ accountId: 1n, battleType: '1', result: 'win' }),
      battle({ accountId: 2n, battleType: '1', result: 'loss' }),
      battle({ accountId: 2n, battleType: '43', result: 'win' }),
      battle({ accountId: 3n, battleType: '2', result: 'win' })
    ]);

    const result = await service.compute();

    expect(result).toEqual({ tanks: 1, groups: 4, removed: 2, gameVersion: 'unknown' });

    expect(prisma.buildUsageAggregate.upsert.mock.calls.map(([args]) => `${args.create.mode}:${args.create.cohort}:${args.create.players}`)).toEqual([
      'random:all:2',
      'random:top10:1',
      'random:top1:1',
      'onslaught:all:1'
    ]);
  });

  it('ranks the cohorts of every tank with one query', async () => {
    const { prisma, queries, service } = createService();

    vi.mocked(prisma.battle.groupBy).mockResolvedValueOnce([mock<TankGroup>({ tankId: 7 }), mock<TankGroup>({ tankId: 8 })]);
    prisma.battle.findMany.mockResolvedValue([battle({ accountId: 2n, battleType: '1', result: 'win' })]);

    await service.compute();

    const cohorts = prisma.buildUsageAggregate.upsert.mock.calls.map(([args]) => `${args.create.tankId}:${args.create.cohort}`);

    expect(queries.buildRanks).toHaveBeenCalledOnce();
    expect(cohorts).toEqual(['7:all', '8:all', '8:top10', '8:top1']);
  });
});
