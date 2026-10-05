import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { Battle, Build, Provision } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { BuildDataService } from '../build-data.service';

import { PopularBuildsReaderService } from '../popular-builds-reader.service';

const query = { limit: 5 };

const device = mock<Provision>({
  provisionId: 1,
  name: 'Rammer',
  tag: 'rammer',
  type: 'optionalDevice',
  image: null,
  priceGold: null,
  priceCredit: null,
  data: null
});

const battle = ({ loadout, ...fields }: Pick<Battle, 'damageDealt' | 'loadout' | 'result'>) => Object.assign(mock<Battle>(fields), { loadout });

const build = ({ loadout, ...fields }: Pick<Build, 'likesCount' | 'loadout'>) => Object.assign(mock<Build>(fields), { loadout });

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const data = mock<BuildDataService>();

  prisma.battle.findMany.mockResolvedValue([]);
  prisma.build.findMany.mockResolvedValue([]);
  data.provisionsByIds.mockResolvedValue([device]);

  return { service: new PopularBuildsReaderService(prisma, data), prisma, data };
};

describe('PopularBuildsReaderService', () => {
  it('ranks battle loadouts and skips the builds when battles exist', async () => {
    const { service, prisma } = createService();

    prisma.battle.findMany.mockResolvedValue([
      battle({ loadout: { optionalDevices: [1] }, result: 'win', damageDealt: 3_000 }),
      battle({ loadout: { optionalDevices: [1] }, result: 'draw', damageDealt: 1_000 })
    ]);

    const popular = await service.popular({ tankId: 1, query });

    expect(popular.source).toBe('battles');
    expect(popular.sampleSize).toBe(2);
    expect(popular.builds[0]?.winRate).toBe(100);
    expect(popular.builds[0]?.optionalDevices.map((option) => option.id)).toEqual([device.provisionId]);
    expect(prisma.build.findMany).not.toHaveBeenCalled();
  });

  it('reads the per-slot loadouts the mod sends and filters battles by mode', async () => {
    const { service, prisma } = createService();

    prisma.battle.findMany.mockResolvedValue([
      battle({ loadout: { optionalDevices: [null, 1, null], consumables: [] }, result: 'win', damageDealt: 2_000 })
    ]);

    const popular = await service.popular({ tankId: 1, query: { limit: 5, mode: 'onslaught' } });

    expect(popular.builds[0]?.optionalDevices.map((option) => option.id)).toEqual([device.provisionId]);
    expect(prisma.battle.findMany.mock.calls[0]?.[0]?.where?.battleType).toEqual({ in: ['43'] });
  });

  it('falls back to published builds weighted by likes', async () => {
    const { service, prisma } = createService();

    prisma.build.findMany.mockResolvedValue([build({ loadout: { equipment: [1, null], consumables: [], crewSkills: {} }, likesCount: 4 })]);

    const popular = await service.popular({ tankId: 1, query });

    expect(popular.source).toBe('builds');
    expect(popular.sampleSize).toBe(1 + 4);
    expect(popular.builds[0]?.winRate).toBeNull();
  });

  it('reports no source when neither battles nor builds exist', async () => {
    const { service, data } = createService();

    data.provisionsByIds.mockResolvedValue([]);

    await expect(service.popular({ tankId: 1, query })).resolves.toEqual({ tankId: 1, source: 'none', sampleSize: 0, builds: [] });
  });

  it('ignores stored loadouts it cannot read', async () => {
    const { service, prisma } = createService();

    prisma.battle.findMany.mockResolvedValue([battle({ loadout: { optionalDevices: ['x'] }, result: 'win', damageDealt: 0 })]);
    prisma.build.findMany.mockResolvedValue([build({ loadout: 'broken', likesCount: 0 })]);

    expect((await service.popular({ tankId: 1, query })).source).toBe('none');
  });

  it('falls back to builds when the battle loadouts are all empty', async () => {
    const { service, prisma } = createService();

    prisma.battle.findMany.mockResolvedValue([battle({ loadout: {}, result: 'win', damageDealt: 1_000 })]);
    prisma.build.findMany.mockResolvedValue([build({ loadout: { equipment: [1], consumables: [], crewSkills: {} }, likesCount: 0 })]);

    const popular = await service.popular({ tankId: 1, query });

    expect(popular.source).toBe('builds');
    expect(popular.sampleSize).toBe(1);
  });
});
