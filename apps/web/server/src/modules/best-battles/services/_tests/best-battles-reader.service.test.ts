import { describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { VehicleCatalogService } from '../../../reference';
import type { BestBattleRow } from '../../best-battles.types';
import type { BestBattlesQueries } from '../../queries/best-battles.types';

import { mockPrismaService } from '../../../../core/prisma/_tests/prisma-mock';
import { bestBattlesQuerySchema } from '../../dto/best-battles.schemas';
import { BestBattleLookupsReaderService } from '../best-battle-lookups-reader.service';
import { BestBattlesReaderService } from '../best-battles-reader.service';

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

const row = (overrides: Partial<BestBattleRow> & Pick<BestBattleRow, 'battle_id' | 'damage'>): BestBattleRow => ({
  source: 'mod',
  account_id: 1,
  arena_unique_id: null,
  nickname: 'Alpha',
  tank_id: 11,
  arena_id: null,
  map_name: null,
  result: 'win',
  assisted: null,
  spotted: null,
  frags: null,
  xp: null,
  blocked: null,
  medals: [],
  played_at: new Date('2026-10-04T12:00:00Z'),
  replay_id: null,
  ...overrides
});

const createService = ({ mod = [], replays = [] }: { mod?: BestBattleRow[]; replays?: BestBattleRow[] }) => {
  const prisma = mockPrismaService();
  const catalog = mock<VehicleCatalogService>();
  const queries = {
    modFeedPage: vi.fn<BestBattlesQueries['modFeedPage']>().mockResolvedValue(mod),
    replayFeedPage: vi.fn<BestBattlesQueries['replayFeedPage']>().mockResolvedValue(replays),
    facetCounts: vi.fn<BestBattlesQueries['facetCounts']>()
  };

  catalog.summary.mockResolvedValue(VEHICLE);
  catalog.filter.mockResolvedValue([]);
  prisma.arena.findMany.mockResolvedValue([]);
  prisma.achievement.findMany.mockResolvedValue([]);

  return new BestBattlesReaderService(prisma, catalog, new BestBattleLookupsReaderService(prisma, catalog), queries);
};

const page = (service: BestBattlesReaderService, query: Record<string, unknown>) =>
  service.page({ query: bestBattlesQuerySchema.parse(query), now: NOW });

describe('BestBattlesReaderService.page', () => {
  it('merges both sources into one ranking by the metric', async () => {
    const service = createService({
      mod: [row({ battle_id: 'm1', damage: 3000 })],
      replays: [row({ battle_id: 'r1', source: 'replay', damage: 5000 })]
    });

    const result = await page(service, {});

    expect(result.items.map(({ key, rank }) => [key, rank])).toEqual([
      ['replay:r1', 1],
      ['mod:m1', 2]
    ]);
  });

  it('offers the next cursor when more battles remain', async () => {
    const service = createService({ mod: [row({ battle_id: 'm1', damage: 3000 }), row({ battle_id: 'm2', damage: 2000 })] });

    const result = await page(service, { limit: '1' });

    expect(result.nextCursor).toBe('1');
  });

  it('answers an empty page when the tier and type match no vehicle', async () => {
    const service = createService({ mod: [row({ battle_id: 'm1', damage: 3000 })] });

    const result = await page(service, { tier: '10' });

    expect([result.items, result.nextCursor]).toEqual([[], null]);
  });

  it('answers an empty page past the deepest rank', async () => {
    const service = createService({ mod: [row({ battle_id: 'm1', damage: 3000 })] });

    const result = await page(service, { cursor: '500' });

    expect(result.items).toEqual([]);
  });
});
