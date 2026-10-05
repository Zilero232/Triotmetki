import { sortBy } from 'remeda';
import { afterAll, beforeEach, expect, it } from 'vitest';

import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../core/prisma/_tests/test-database';
import { rarityPoints } from '../../lib/rarity/rarity';
import { RarityAggregateService } from '../rarity-aggregate.service';

const NOW = new Date('2026-10-05T06:45:00Z');
const EARLIER = new Date('2026-10-04T06:45:00Z');
const FETCHED_AT = new Date('2026-10-01T00:00:00Z');

const ACCOUNT = { collector: 3001n, casual: 3002n, empty: 3003n, dormant: 3004n } as const;
const TANK = { shared: 11, solo: 12, stale: 99 } as const;

describeWithDatabase('RarityAggregateService.compute', () => {
  const prisma = createTestPrisma();
  const service = new RarityAggregateService(prisma);

  const seedPlayers = () =>
    prisma.player.createMany({
      data: [
        { accountId: ACCOUNT.collector, nickname: 'collector' },
        { accountId: ACCOUNT.casual, nickname: 'casual', trackingTier: 'population' },
        { accountId: ACCOUNT.empty, nickname: 'empty' },
        { accountId: ACCOUNT.dormant, nickname: 'dormant', trackingTier: 'dormant' }
      ]
    });

  const seedCatalog = () =>
    prisma.achievement.createMany({
      data: [
        { name: 'warrior', section: 'battle', title: 'Warrior' },
        { name: 'kolobanov', section: 'epic', title: 'Kolobanov' },
        { name: 'memorial', section: 'memorial', title: 'Memorial' }
      ]
    });

  const seedCollections = () =>
    prisma.accountAchievements.createMany({
      data: [
        { accountId: ACCOUNT.collector, counts: { warrior: 2, kolobanov: 1, unlisted: 1 }, fetchedAt: FETCHED_AT },
        { accountId: ACCOUNT.casual, counts: { warrior: 1, memorial: 0 }, fetchedAt: FETCHED_AT },
        { accountId: ACCOUNT.empty, counts: {}, fetchedAt: FETCHED_AT }
      ]
    });

  const seedTanks = () =>
    prisma.playerTank.createMany({
      data: [
        { accountId: ACCOUNT.collector, tankId: TANK.shared, battles: 4 },
        { accountId: ACCOUNT.casual, tankId: TANK.shared, battles: 1 },
        { accountId: ACCOUNT.casual, tankId: TANK.solo, battles: 0, inGarage: true },
        { accountId: ACCOUNT.dormant, tankId: TANK.solo, battles: 7 }
      ]
    });

  const seedStaleResults = async () => {
    await prisma.achievementRarity.create({ data: { name: 'retired', holders: 1, sample: 1, share: 1, points: 10, computedAt: EARLIER } });
    await prisma.tankRarity.create({ data: { tankId: TANK.stale, owners: 1, sample: 1, share: 1, computedAt: EARLIER } });
  };

  const rarityRows = async () => sortBy(await prisma.achievementRarity.findMany(), (row) => row.name);

  const tankRows = async () => sortBy(await prisma.tankRarity.findMany(), (row) => row.tankId);

  const rollups = async () =>
    sortBy(
      (await prisma.accountAchievements.findMany({ select: { accountId: true, held: true, points: true, completion: true, computedAt: true } })).map(
        (row) => ({ ...row, accountId: Number(row.accountId) })
      ),
      (row) => row.accountId
    );

  beforeEach(async () => {
    await truncateTables({ prisma, tables: ['achievement_rarity', 'tank_rarity', 'account_achievements', 'achievement', 'player_tank', 'player'] });
    await seedPlayers();
    await seedCatalog();
    await seedTanks();
    await seedStaleResults();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('reports the sample, the achievements written and the tanks written', async () => {
    await seedCollections();

    expect(await service.compute(NOW)).toEqual({ sample: 3, achievements: 4, tanks: 2 });
  });

  it('replaces the achievement rarity table with every catalog and held name', async () => {
    await seedCollections();

    await service.compute(NOW);

    expect(await rarityRows()).toEqual([
      { name: 'kolobanov', holders: 1, sample: 3, share: 1 / 3, points: rarityPoints(1 / 3), computedAt: NOW },
      { name: 'memorial', holders: 0, sample: 3, share: 0, points: rarityPoints(0), computedAt: NOW },
      { name: 'unlisted', holders: 1, sample: 3, share: 1 / 3, points: rarityPoints(1 / 3), computedAt: NOW },
      { name: 'warrior', holders: 2, sample: 3, share: 2 / 3, points: rarityPoints(2 / 3), computedAt: NOW }
    ]);
  });

  it('writes each account rollup over the obtainable catalog', async () => {
    await seedCollections();

    await service.compute(NOW);

    expect(await rollups()).toEqual([
      {
        accountId: Number(ACCOUNT.collector),
        held: 3,
        points: rarityPoints(2 / 3) + rarityPoints(1 / 3) * 2,
        completion: 100,
        computedAt: NOW
      },
      { accountId: Number(ACCOUNT.casual), held: 1, points: rarityPoints(2 / 3), completion: 50, computedAt: NOW },
      { accountId: Number(ACCOUNT.empty), held: 0, points: 0, completion: 0, computedAt: NOW }
    ]);
  });

  it('replaces the tank rarity table with owner shares among tracked players', async () => {
    await seedCollections();

    await service.compute(NOW);

    expect(await tankRows()).toEqual([
      { tankId: TANK.shared, owners: 2, sample: 2, share: 1, computedAt: NOW },
      { tankId: TANK.solo, owners: 1, sample: 2, share: 0.5, computedAt: NOW }
    ]);
  });

  it('keeps the previous achievement rarity when no collection is stored, but still refreshes tanks', async () => {
    expect(await service.compute(NOW)).toEqual({ sample: 0, achievements: 0, tanks: 2 });
    expect((await rarityRows()).map((row) => row.name)).toEqual(['retired']);
    expect((await tankRows()).map((row) => row.tankId)).toEqual([TANK.shared, TANK.solo]);
  });
});
