import type { VehicleSummary } from '@otmetki/schemas';

import { BUILD_USAGE } from '@otmetki/schemas';
import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { Provision } from '../../../../../generated';
import type { CatalogEntry, VehicleCatalogService } from '../../../reference';
import type { TankDifficultyReaderService } from '../../../tanks';
import type { BuildsCatalogQueries, CatalogUsageRow } from '../../queries/builds-catalog.types';
import type { BuildDataReaderService } from '../build-data-reader.service';

import { mockPrismaService } from '../../../../core/prisma/_tests/prisma-mock';
import { BuildsCatalogReaderService } from '../builds-catalog-reader.service';

const entry = (summary: Pick<VehicleSummary, 'name' | 'tankId' | 'tier'>): CatalogEntry => ({
  summary: {
    shortName: summary.name,
    slug: summary.name,
    nation: 'ussr',
    type: 'mediumTank',
    isPremium: false,
    isCollectible: false,
    status: 'researchable',
    images: { small: null, contour: null, big: null },
    ...summary
  },
  dbType: 'mediumTank',
  specs: null,
  description: null,
  role: null,
  spec: { tags: [], role: null, notInShop: false },
  hasOffers: false
});

const provision = (provisionId: number): Provision => ({
  provisionId,
  name: `item ${provisionId}`,
  nameKey: null,
  descriptionKey: null,
  tag: `item_${provisionId}`,
  type: 'optionalDevice',
  description: null,
  image: null,
  priceCredit: null,
  priceGold: null,
  weight: null,
  tankIds: [],
  data: null,
  updatedAt: new Date('2026-09-20T00:00:00Z')
});

const pick = (id: number) => ({ id, battles: 40, share: 0.5, winRate: 55, avgDamage: 3_000 });

const usageRow = (overrides: Pick<CatalogUsageRow, 'tankId'> & Partial<CatalogUsageRow>): CatalogUsageRow => ({
  battles: BUILD_USAGE.minSample,
  players: 10,
  winRate: 52,
  avgDamage: 2_500,
  usage: { equipment: [{ slot: 0, picks: [pick(1)] }], consumables: [pick(2), pick(3)] },
  computedAt: new Date('2026-09-20T00:00:00Z'),
  ...overrides
});

const query = { mode: 'random' as const };

const createService = () => {
  const prisma = mockPrismaService();
  const queries = mock<BuildsCatalogQueries>();
  const vehicles = mock<VehicleCatalogService>();
  const data = mock<BuildDataReaderService>();
  const difficulty = mock<TankDifficultyReaderService>();

  vehicles.filter.mockResolvedValue([entry({ tankId: 1, name: 'A', tier: 8 })]);
  queries.latestCatalogUsage.mockResolvedValue([]);
  data.provisionsByIds.mockResolvedValue([provision(1), provision(2)]);

  return { service: new BuildsCatalogReaderService(prisma, vehicles, data, difficulty, queries), queries, vehicles, difficulty };
};

describe('BuildsCatalogReaderService.catalog', () => {
  it('lists a tank without usage as empty and not enough', async () => {
    const { service } = createService();

    const catalog = await service.catalog(query);

    expect(catalog.entries[0]).toMatchObject({
      battles: 0,
      players: 0,
      isEnough: false,
      winRate: null,
      avgDamage: null,
      topEquipment: [],
      topConsumables: [],
      computedAt: null
    });
  });

  it('shows results and top picks from the minimum sample on', async () => {
    const { service, queries } = createService();

    queries.latestCatalogUsage.mockResolvedValue([usageRow({ tankId: 1 })]);

    const [row] = (await service.catalog(query)).entries;

    expect(row).toMatchObject({ isEnough: true, winRate: 52, avgDamage: 2_500 });
    expect(row?.topEquipment.map((entry) => entry.option.id)).toEqual([1]);
  });

  it('hides results and picks just below the minimum sample', async () => {
    const { service, queries } = createService();

    queries.latestCatalogUsage.mockResolvedValue([usageRow({ tankId: 1, battles: BUILD_USAGE.minSample - 1 })]);

    const [row] = (await service.catalog(query)).entries;

    expect(row).toMatchObject({ battles: BUILD_USAGE.minSample - 1, isEnough: false, winRate: null, avgDamage: null, topEquipment: [] });
  });

  it('drops picks whose provision is no longer known', async () => {
    const { service, queries } = createService();

    queries.latestCatalogUsage.mockResolvedValue([usageRow({ tankId: 1 })]);

    const [row] = (await service.catalog(query)).entries;

    expect(row?.topConsumables.map((entry) => entry.option.id)).toEqual([2]);
  });

  it('orders by battles, then higher tier, then name', async () => {
    const { service, queries, vehicles } = createService();

    vehicles.filter.mockResolvedValue([
      entry({ tankId: 1, name: 'B', tier: 8 }),
      entry({ tankId: 2, name: 'A', tier: 8 }),
      entry({ tankId: 3, name: 'C', tier: 10 }),
      entry({ tankId: 4, name: 'D', tier: 5 })
    ]);

    queries.latestCatalogUsage.mockResolvedValue([usageRow({ tankId: 4, battles: 500 })]);

    const catalog = await service.catalog(query);

    expect(catalog.entries.map((row) => row.vehicle.tankId)).toEqual([4, 3, 2, 1]);
  });

  it('keeps only tanks of the requested difficulties', async () => {
    const { service, vehicles, difficulty } = createService();

    vehicles.filter.mockResolvedValue([entry({ tankId: 1, name: 'A', tier: 8 }), entry({ tankId: 2, name: 'B', tier: 8 })]);
    difficulty.matching.mockResolvedValue(new Set([2]));

    const catalog = await service.catalog({ ...query, difficulties: ['hard'] });

    expect(catalog.entries.map((row) => row.vehicle.tankId)).toEqual([2]);
  });

  it('does not consult difficulties when none are requested', async () => {
    const { service, difficulty } = createService();

    await service.catalog({ ...query, difficulties: [] });

    expect(difficulty.matching).not.toHaveBeenCalled();
  });

  it('describes the catalog cohort and sample floor', async () => {
    const { service } = createService();

    await expect(service.catalog(query)).resolves.toMatchObject({
      mode: 'random',
      cohort: BUILD_USAGE.catalogCohort,
      minSample: BUILD_USAGE.minSample
    });
  });
});
