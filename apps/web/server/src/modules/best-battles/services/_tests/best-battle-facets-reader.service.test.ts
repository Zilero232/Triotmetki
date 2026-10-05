import { describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { VehicleCatalogService } from '../../../reference';
import type { FacetCounts } from '../../mappers/best-battles.types';
import type { BestBattlesQueries } from '../../queries/best-battles.types';

import { mockPrismaService } from '../../../../core/prisma/_tests/prisma-mock';
import { BestBattleFacetsReaderService } from '../best-battle-facets-reader.service';
import { BestBattleLookupsReaderService } from '../best-battle-lookups-reader.service';

const NOW = new Date('2026-10-05T12:00:00Z');

const VEHICLE = {
  tankId: 11,
  name: 'Heavy X',
  shortName: 'HX',
  slug: 'heavy-x',
  nation: 'ussr',
  type: 'heavyTank',
  tier: 10,
  isPremium: false,
  isCollectible: false,
  status: 'researchable',
  images: { small: null, contour: null, big: null }
} as const;

const createService = (counts: FacetCounts) => {
  const prisma = mockPrismaService();
  const catalog = mock<VehicleCatalogService>();
  const queries = {
    modFeedPage: vi.fn<BestBattlesQueries['modFeedPage']>(),
    replayFeedPage: vi.fn<BestBattlesQueries['replayFeedPage']>(),
    facetCounts: vi.fn<BestBattlesQueries['facetCounts']>().mockResolvedValue(counts)
  };

  catalog.summary.mockResolvedValue(VEHICLE);
  prisma.arena.findMany.mockResolvedValue([]);
  prisma.achievement.findMany.mockResolvedValue([]);

  return new BestBattleFacetsReaderService(prisma, new BestBattleLookupsReaderService(prisma, catalog), queries);
};

describe('BestBattleFacetsReaderService.facets', () => {
  it('maps the counts onto medals, vehicles and arenas', async () => {
    const service = createService({
      battles: 4,
      top_damage: 7000,
      medals: [{ key: 'warrior', battles: 2 }],
      tanks: [{ tank_id: 11, battles: 3 }],
      arenas: [{ arena_id: 'map_a', battles: 1 }]
    });

    const result = await service.facets({ query: { period: 'week' }, now: NOW });

    expect(result).toEqual({
      period: 'week',
      since: '2026-09-28T12:00:00.000Z',
      battles: 4,
      topDamage: 7000,
      medals: [{ name: 'warrior', title: 'warrior', image: null, battles: 2 }],
      tanks: [{ vehicle: VEHICLE, battles: 3 }],
      arenas: [{ arenaId: 'map_a', name: 'map_a', battles: 1 }],
      computedAt: NOW.toISOString()
    });
  });

  it('answers zero battles when the counts are empty', async () => {
    const service = createService({ battles: null, top_damage: null, medals: [], tanks: [], arenas: [] });

    const result = await service.facets({ query: { period: 'day' }, now: NOW });

    expect([result.battles, result.topDamage]).toEqual([0, null]);
  });
});
