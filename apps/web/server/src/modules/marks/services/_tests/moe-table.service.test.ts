import type { VehicleSummary } from '@otmetki/schemas';

import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { TankThreshold } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { CatalogEntry } from '../../../reference';

import { ThresholdsService, VehicleCatalogService } from '../../../reference';
import { MOE_TABLE } from '../../config/marks.constants';
import { MoeTableService } from '../moe-table.service';
import { SweatIndexService } from '../sweat-index.service';

const vehicle = (tankId: number, name: string): VehicleSummary => ({
  tankId,
  name,
  shortName: name,
  slug: name,
  nation: 'ussr',
  type: 'heavyTank',
  tier: MOE_TABLE.minTier + 5,
  isPremium: false,
  isCollectible: false,
  status: 'researchable',
  images: { small: null, contour: null, big: null }
});

const entry = (summary: VehicleSummary): CatalogEntry => ({
  summary,
  dbType: 'heavyTank',
  specs: null,
  description: null,
  role: null,
  spec: { tags: [], role: null, notInShop: false },
  hasOffers: false
});

const threshold = (overrides: Partial<TankThreshold>): TankThreshold => ({
  kind: 'moe',
  tankId: 1,
  date: new Date('2026-09-20'),
  source: 'otmetki',
  level1: 2_000,
  level2: 2_600,
  level3: 3_100,
  level4: null,
  sampleSize: null,
  capturedAt: new Date(),
  ...overrides
});

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const thresholds = mock<ThresholdsService>();
  const catalog = mock<VehicleCatalogService>();
  const sweat = mock<SweatIndexService>();
  const empty = { moe: new Map(), mastery: new Map() };

  thresholds.latest.mockResolvedValue(empty);
  thresholds.asOf.mockResolvedValue(empty);
  catalog.filter.mockResolvedValue([entry(vehicle(1, 'IS-7')), entry(vehicle(2, 'Object 279'))]);

  sweat.all.mockResolvedValue(
    new Map([
      [1, { moe: 1.4, moeLevel: 'easy', mastery: null, masteryLevel: null }],
      [2, { moe: 2.1, moeLevel: 'hard', mastery: null, masteryLevel: null }]
    ])
  );

  return { service: new MoeTableService(prisma, thresholds, catalog, sweat), prisma };
};

describe('MoeTableService.table', () => {
  it('sorts by the sweat index, hardest first', async () => {
    const { service } = createService();

    const page = await service.table({ sort: 'sweat', limit: 25, offset: 0, order: 'desc' });

    expect(page.items.map((row) => row.vehicle.tankId)).toEqual([2, 1]);
    expect(page.items[0]?.sweat.moeLevel).toBe('hard');
  });

  it('finds tanks by a part of the name, ignoring case', async () => {
    const { service } = createService();

    const page = await service.table({ search: 'is-', limit: 25, offset: 0, order: 'desc' });

    expect(page.items.map((row) => row.vehicle.name)).toEqual(['IS-7']);
  });
});

describe('MoeTableService.historyBatch', () => {
  it('returns one series per requested tank, including those without data', async () => {
    const { service, prisma } = createService();

    prisma.tankThreshold.findMany.mockResolvedValue([threshold({ tankId: 1 })]);

    const batch = await service.historyBatch({ tankIds: [1, 2], days: 30 });

    expect(batch.series.map((series) => [series.tankId, series.points.length])).toEqual([
      [1, 1],
      [2, 0]
    ]);
  });
});
