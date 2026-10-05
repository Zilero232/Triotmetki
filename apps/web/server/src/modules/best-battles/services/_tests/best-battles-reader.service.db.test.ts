import { afterAll, beforeAll, expect, it } from 'vitest';

import type { BestBattle } from '../../best-battles.types';

import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../core/prisma/_tests/test-database';
import { VehicleCatalogService } from '../../../reference';
import { bestBattlesQuerySchema } from '../../dto/best-battles.schemas';
import { BB, BB_TABLES, seedBestBattles } from '../../queries/_tests/best-battles.fixtures';
import { BestBattleLookupsReaderService } from '../best-battle-lookups-reader.service';
import { BestBattlesReaderService } from '../best-battles-reader.service';

const KEY = {
  b1: '1:101',
  b2: '2:102',
  b9: '2:109',
  b5: '2:105',
  b6: '2:106',
  b8: '1:108',
  r2: '1:103',
  r3: '2:201',
  r11: '2:208',
  r12: '2:209',
  r15: `replay:${BB.replays.r15}`
} as const;

describeWithDatabase('BestBattlesReaderService.page on a database', () => {
  const prisma = createTestPrisma();
  const catalog = new VehicleCatalogService(prisma);
  const service = new BestBattlesReaderService(prisma, catalog, new BestBattleLookupsReaderService(prisma, catalog));

  const page = (query: Record<string, unknown>) => service.page({ query: bestBattlesQuerySchema.parse(query), now: BB.now });
  const keys = async (query: Record<string, unknown>) => (await page(query)).items.map((item) => item.key);

  beforeAll(async () => {
    await truncateTables({ prisma, tables: [...BB_TABLES] });
    await seedBestBattles(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('ranks corroborated mod battles and owner-uploaded replays of the week by damage, newest first on a tie', async () => {
    expect(await keys({})).toEqual([KEY.r2, KEY.r3, KEY.b1, KEY.b2, KEY.b9, KEY.b5, KEY.b8, KEY.r15]);
  });

  it('numbers the ranks from one and returns the head of the page', async () => {
    const result = await page({});

    expect(result.items.map((item) => item.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);

    expect({ period: result.period, metric: result.metric, since: result.since, nextCursor: result.nextCursor }).toEqual({
      period: 'week',
      metric: 'damage',
      since: '2026-09-28T12:00:00.000Z',
      nextCursor: null
    });
  });

  it('maps a mod battle with its earliest public replay, arena name and medal titles', async () => {
    const { items } = await page({});

    expect(items.find((item) => item.key === KEY.b1)).toEqual({
      key: KEY.b1,
      rank: 3,
      source: 'mod',
      accountId: 1,
      nickname: 'Alpha',
      vehicle: expect.objectContaining({ tankId: 11, name: 'Heavy X', tier: 10 }),
      arena: { arenaId: 'map_a', name: 'Map A' },
      result: 'win',
      damage: 5000,
      assisted: 350,
      spotted: 1,
      frags: 1,
      xp: 500,
      blocked: 300,
      medals: [
        { name: 'medalKay', title: 'Kay', image: 'kay.png' },
        { name: 'warrior', title: 'Warrior', image: null }
      ],
      playedAt: '2026-10-04T18:00:00.000Z',
      replayId: BB.replays.r1
    } satisfies BestBattle);
  });

  it('maps a replay with the recorder spotted and blocked from its summary', async () => {
    const { items } = await page({});

    expect(items.find((item) => item.key === KEY.r2)).toEqual({
      key: KEY.r2,
      rank: 1,
      source: 'replay',
      accountId: 1,
      nickname: 'Alpha',
      vehicle: expect.objectContaining({ tankId: 13 }),
      arena: { arenaId: 'map_a', name: 'Map A' },
      result: 'win',
      damage: 9000,
      assisted: 300,
      spotted: 3,
      frags: 3,
      xp: 1200,
      blocked: 450,
      medals: [{ name: 'medalKay', title: 'Kay', image: 'kay.png' }],
      playedAt: '2026-10-04T20:00:00.000Z',
      replayId: BB.replays.r2
    } satisfies BestBattle);
  });

  it('names an unknown arena after the replay map and leaves spotted and blocked empty without recorder players', async () => {
    const { items } = await page({});

    expect(items.find((item) => item.key === KEY.r3)).toMatchObject({
      nickname: 'Bravo',
      arena: { arenaId: 'map_c', name: 'Map C' },
      result: 'loss',
      spotted: null,
      blocked: null,
      medals: [],
      replayId: BB.replays.r3
    });
  });

  it('attaches the public replay a non-owner uploaded and no private replay to a mod battle', async () => {
    const { items } = await page({});

    expect(items.filter((item) => item.source === 'mod').map((item) => [item.key, item.replayId])).toEqual([
      [KEY.b1, BB.replays.r1],
      [KEY.b2, null],
      [KEY.b9, null],
      [KEY.b5, null],
      [KEY.b8, BB.replays.r8]
    ]);
  });

  it('falls back to the medal name for a medal missing from the catalogue', async () => {
    const { items } = await page({});

    expect(items.find((item) => item.key === KEY.b5)?.medals).toEqual([{ name: 'unknownMedal', title: 'unknownMedal', image: null }]);
  });

  it.each([
    ['frags', [KEY.r11, KEY.r2, KEY.r3, KEY.b8, KEY.b1, KEY.b2, KEY.b9, KEY.b5]],
    ['spotted', [KEY.r2, KEY.b8, KEY.b1, KEY.b2, KEY.b9, KEY.b5]],
    ['blocked', [KEY.r2, KEY.b8, KEY.b1, KEY.b2, KEY.b9, KEY.b5]],
    ['assisted', [KEY.b8, KEY.b1, KEY.b2, KEY.b9, KEY.b5, KEY.r2, KEY.r3]],
    ['xp', [KEY.r2, KEY.r3, KEY.b8, KEY.b1, KEY.b2, KEY.b9, KEY.b5]]
  ])('ranks by %s and skips replays without that value', async (metric, expected) => {
    expect(await keys({ metric })).toEqual(expected);
  });

  it('narrows to the last day', async () => {
    expect(await keys({ period: 'day' })).toEqual([KEY.r2, KEY.r3, KEY.b1, KEY.b8, KEY.r15]);
  });

  it('widens to the last month', async () => {
    expect(await keys({ period: 'month' })).toEqual([KEY.r12, KEY.r2, KEY.b6, KEY.r3, KEY.b1, KEY.b2, KEY.b9, KEY.b5, KEY.b8, KEY.r15]);
  });

  it.each([
    ['a tank', { tankId: '12' }, [KEY.r3, KEY.b2, KEY.b9, KEY.b8]],
    ['an arena', { arenaId: 'map_a' }, [KEY.r2, KEY.b1, KEY.b5]],
    ['a medal from replays and battles', { medal: 'medalKay' }, [KEY.r2, KEY.b1]],
    ['a medal of battles only', { medal: 'warrior' }, [KEY.b1, KEY.b2]],
    ['a tier', { tier: '8' }, [KEY.r2, KEY.b5, KEY.r15]],
    ['a vehicle type', { type: 'heavyTank' }, [KEY.b1]],
    ['a tier and a type', { tier: '10', type: 'mediumTank' }, [KEY.r3, KEY.b2, KEY.b9, KEY.b8]],
    ['a tier and a tank inside it', { tier: '10', tankId: '11' }, [KEY.b1]],
    ['a tank nobody played', { tankId: '99' }, []],
    ['a tier and a tank outside it', { tier: '10', tankId: '13' }, []]
  ])('filters by %s', async (_name, query, expected) => {
    expect(await keys(query)).toEqual(expected);
  });

  it('pages with a cursor of the next offset', async () => {
    const first = await page({ limit: '2' });
    const second = await page({ limit: '2', cursor: first.nextCursor });

    expect([first.items.map((item) => item.key), first.nextCursor]).toEqual([[KEY.r2, KEY.r3], '2']);

    expect([second.items.map((item) => item.key), second.items.map((item) => item.rank), second.nextCursor]).toEqual([[KEY.b1, KEY.b2], [3, 4], '4']);
  });

  it('ends the cursor on the last page', async () => {
    const last = await page({ limit: '3', cursor: '6' });

    expect([last.items.map((item) => item.key), last.nextCursor]).toEqual([[KEY.b8, KEY.r15], null]);
  });

  it('returns nothing past the deepest rank', async () => {
    const result = await page({ cursor: '500' });

    expect([result.items, result.nextCursor]).toEqual([[], null]);
  });
});
