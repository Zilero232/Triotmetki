import type { VehicleSummary } from '@otmetki/schemas';

import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { TankServerStats } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { CatalogEntry, MasteryThresholdRecord, MoeThresholdRecord, ThresholdsReaderService, VehicleCatalogService } from '../../../reference';

import { EMPTY_SWEAT } from '../../lib/sweat-index/sweat-index';
import { SweatIndexReaderService } from '../sweat-index-reader.service';

const summary = (tankId: number): VehicleSummary => ({
  tankId,
  name: `Tank ${tankId}`,
  shortName: `T${tankId}`,
  slug: `tank-${tankId}`,
  nation: 'ussr',
  type: 'heavyTank',
  tier: 10,
  isPremium: false,
  isCollectible: false,
  status: 'researchable',
  images: { small: null, contour: null, big: null }
});

const catalogOf = (...tankIds: number[]): Map<number, CatalogEntry> =>
  new Map(
    tankIds.map((tankId) => [
      tankId,
      {
        summary: summary(tankId),
        dbType: 'heavyTank',
        specs: null,
        description: null,
        role: null,
        spec: { tags: [], role: null, notInShop: false },
        hasOffers: false
      }
    ])
  );

const moe = (tankId: number, p95: number): MoeThresholdRecord => ({
  tankId,
  date: new Date('2026-09-20'),
  source: 'otmetki',
  p65: p95 / 2,
  p85: p95 * 0.8,
  p95,
  p100: null,
  sampleSize: null,
  capturedAt: new Date('2026-09-20')
});

const mastery = (tankId: number, master: number): MasteryThresholdRecord => ({
  tankId,
  date: new Date('2026-09-20'),
  source: 'otmetki',
  class3: master / 4,
  class2: master / 2,
  class1: master * 0.75,
  master,
  sampleSize: null,
  capturedAt: new Date('2026-09-20')
});

const stats = (overrides: Pick<TankServerStats, 'avgDamage' | 'avgXp' | 'cohort' | 'tankId'>): TankServerStats => ({
  mode: 'random',
  period: 'd30',
  battles: 1_000,
  players: 100,
  samples: 0,
  winRate: 50,
  playerWinRate: 50,
  winRateDiff: 0,
  avgFrags: 1,
  avgSpotted: 1,
  avgBlocked: 0,
  survivalRate: 30,
  accuracy: 70,
  popularityRank: null,
  tierListRank: null,
  computedAt: new Date('2026-09-20'),
  ...overrides
});

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const thresholds = mock<ThresholdsReaderService>();
  const catalog = mock<VehicleCatalogService>();

  catalog.all.mockResolvedValue(catalogOf(1, 2));
  thresholds.latest.mockResolvedValue({ moe: new Map([[1, moe(1, 3_000)]]), mastery: new Map([[1, mastery(1, 1_500)]]) });
  prisma.tankServerStats.findMany.mockResolvedValue([]);

  return { service: new SweatIndexReaderService(prisma, thresholds, catalog), prisma, thresholds, catalog };
};

describe('SweatIndexReaderService.forTank', () => {
  it('measures against the average-cohort baseline when both cohorts exist', async () => {
    const { service, prisma } = createService();

    prisma.tankServerStats.findMany.mockResolvedValue([
      stats({ tankId: 1, cohort: 'all', avgDamage: 1_000, avgXp: 500 }),
      stats({ tankId: 1, cohort: 'average', avgDamage: 1_500, avgXp: 750 })
    ]);

    const sweat = await service.forTank(1);

    expect(sweat.moe).toBe(3_000 / 1_500);
    expect(sweat.mastery).toBe(1_500 / 750);
  });

  it('falls back to the all-cohort baseline when the average cohort is missing', async () => {
    const { service, prisma } = createService();

    prisma.tankServerStats.findMany.mockResolvedValue([stats({ tankId: 1, cohort: 'all', avgDamage: 1_000, avgXp: 500 })]);

    expect((await service.forTank(1)).moe).toBe(3_000 / 1_000);
  });

  it('leaves the ratios empty for a catalog tank without a baseline', async () => {
    const { service } = createService();

    await expect(service.forTank(1)).resolves.toEqual(EMPTY_SWEAT);
  });

  it('returns the empty index for a tank outside the catalog', async () => {
    const { service } = createService();

    await expect(service.forTank(999)).resolves.toEqual(EMPTY_SWEAT);
  });

  it('builds the index once and serves later lookups from the cache', async () => {
    const { service, catalog } = createService();

    await service.forTank(1);
    await service.forTank(2);

    expect(catalog.all).toHaveBeenCalledTimes(1);
  });
});

describe('SweatIndexReaderService.all', () => {
  it('holds an entry for every catalog tank', async () => {
    const { service } = createService();

    expect([...(await service.all()).keys()]).toEqual([1, 2]);
  });
});
