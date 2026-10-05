import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { AccountAchievements, Achievement } from '../../../../../generated';
import type { RarityAggregateQueries, TankOwnersRow } from '../../queries/rarity-aggregate.types';

import { mockPrismaService } from '../../../../core/prisma/_tests/prisma-mock';
import { RarityAggregateService } from '../rarity-aggregate.service';

const NOW = new Date('2026-10-05T06:45:00Z');

type Setup = {
  counts: Record<string, number>[];
  owners: TankOwnersRow[];
};

const catalogEntry = (name: string, section: string) => Object.assign(mock<Achievement>(), { name, section });

const storedCounts = (counts: Record<string, number>, index: number) =>
  Object.assign(mock<AccountAchievements>(), { accountId: BigInt(index + 1), counts });

const setup = ({ counts, owners }: Setup) => {
  const prisma = mockPrismaService();
  const queries = mock<RarityAggregateQueries>();

  prisma.achievement.findMany.mockResolvedValue([catalogEntry('warrior', 'battle'), catalogEntry('memorial', 'memorial')]);
  prisma.accountAchievements.findMany.mockResolvedValue(counts.map(storedCounts));
  prisma.$transaction.mockResolvedValue([]);
  queries.tankOwners.mockResolvedValue(owners);
  queries.updateRollups.mockResolvedValue([]);

  return { queries, service: new RarityAggregateService(prisma, queries) };
};

describe('RarityAggregateService.compute', () => {
  it('reports the sample, the catalog plus held names, and the tanks', async () => {
    const { service } = setup({ counts: [{ warrior: 1, unlisted: 2 }, {}], owners: [{ tankId: 1, owners: 1, sample: 1 }] });

    const result = await service.compute(NOW);

    expect(result).toEqual({ sample: 2, achievements: 3, tanks: 1 });
  });

  it('hands every account rollup to the rollup query with a numeric account id', async () => {
    const { service, queries } = setup({ counts: [{ warrior: 1 }, {}], owners: [] });

    await service.compute(NOW);

    expect(
      queries.updateRollups.mock.calls[0]?.[0].rows.map((row) => ({ accountId: row.accountId, held: row.held, completion: row.completion }))
    ).toEqual([
      { accountId: 1, held: 1, completion: 100 },
      { accountId: 2, held: 0, completion: 0 }
    ]);
  });

  it('skips the achievement tables without stored collections', async () => {
    const { service, queries } = setup({ counts: [], owners: [] });

    const result = await service.compute(NOW);

    expect(result).toEqual({ sample: 0, achievements: 0, tanks: 0 });
    expect(queries.updateRollups).not.toHaveBeenCalled();
  });
});
