import { afterAll, beforeAll, expect, it } from 'vitest';

import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../core/prisma/_tests/test-database';
import { VehicleCatalogService } from '../../../reference';
import { BB, BB_TABLES, seedBestBattles } from '../../queries/_tests/best-battles.fixtures';
import { BestBattleFacetsReaderService } from '../best-battle-facets-reader.service';
import { BestBattleLookupsReaderService } from '../best-battle-lookups-reader.service';

describeWithDatabase('BestBattleFacetsReaderService.facets on a database', () => {
  const prisma = createTestPrisma();
  const catalog = new VehicleCatalogService(prisma);
  const service = new BestBattleFacetsReaderService(prisma, new BestBattleLookupsReaderService(prisma, catalog));

  const facets = (period: 'day' | 'month' | 'week') => service.facets({ query: { period }, now: BB.now });

  beforeAll(async () => {
    await truncateTables({ prisma, tables: [...BB_TABLES] });
    await seedBestBattles(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('counts the corroborated mod battles and owner-uploaded replays of the week and their top damage', async () => {
    const result = await facets('week');

    expect({
      period: result.period,
      since: result.since,
      battles: result.battles,
      topDamage: result.topDamage,
      computedAt: result.computedAt
    }).toEqual({
      period: 'week',
      since: '2026-09-28T12:00:00.000Z',
      battles: 9,
      topDamage: 9000,
      computedAt: BB.now.toISOString()
    });
  });

  it('ranks the medals of the week by battles, then by name', async () => {
    const { medals } = await facets('week');

    expect(medals).toEqual([
      { name: 'medalKay', title: 'Kay', image: 'kay.png', battles: 2 },
      { name: 'warrior', title: 'Warrior', image: null, battles: 2 },
      { name: 'unknownMedal', title: 'unknownMedal', image: null, battles: 1 }
    ]);
  });

  it('ranks the tanks of the week by battles', async () => {
    const { tanks } = await facets('week');

    expect(tanks.map(({ vehicle, battles }) => [vehicle.tankId, battles])).toEqual([
      [12, 5],
      [13, 3],
      [11, 1]
    ]);
  });

  it('ranks the arenas of the week by battles and skips battles without an arena', async () => {
    const { arenas } = await facets('week');

    expect(arenas).toEqual([
      { arenaId: 'map_b', name: 'Map B', battles: 4 },
      { arenaId: 'map_a', name: 'Map A', battles: 3 },
      { arenaId: 'map_c', name: 'map_c', battles: 1 }
    ]);
  });

  it('narrows the counts to the last day', async () => {
    const result = await facets('day');

    expect([result.battles, result.topDamage, result.tanks.map(({ vehicle, battles }) => [vehicle.tankId, battles])]).toEqual([
      6,
      9000,
      [
        [12, 3],
        [13, 2],
        [11, 1]
      ]
    ]);
  });

  it('widens the counts to the last month', async () => {
    const result = await facets('month');

    expect([result.battles, result.topDamage, result.arenas.map(({ arenaId, battles }) => [arenaId, battles])]).toEqual([
      11,
      9990,
      [
        ['map_b', 5],
        ['map_a', 4],
        ['map_c', 1]
      ]
    ]);
  });

  it('answers zeros for a period without battles', async () => {
    await truncateTables({ prisma, tables: ['battle', 'replay'] });

    const result = await facets('week');

    expect([result.battles, result.topDamage, result.medals, result.tanks, result.arenas]).toEqual([0, null, [], [], []]);
  });
});
