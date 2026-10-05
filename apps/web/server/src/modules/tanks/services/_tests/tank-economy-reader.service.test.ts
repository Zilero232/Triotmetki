import type { TankEconomyQuery } from '@otmetki/schemas';

import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { Battle } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { VehicleCatalogService } from '../../../reference';
import type { TraitsEntry } from '../../tanks.types';
import type { TankTraitsReaderService } from '../tank-traits-reader.service';

import { TankEconomyReaderService } from '../tank-economy-reader.service';
import { catalogEntry, catalogOf, economyRow, vehicle } from './tanks.fixtures';

const query: TankEconomyQuery = { account: 'premium', minBattles: 0, order: 'desc', limit: 25, offset: 0 };

const eligible = [
  catalogEntry(vehicle({ tankId: 1, tier: 10 })),
  catalogEntry(vehicle({ tankId: 2, tier: 8 })),
  catalogEntry(vehicle({ tankId: 3, tier: 6 }))
];

const premiumTraits: TraitsEntry = { spec: { tags: [], role: null, notInShop: false }, hasOffers: true, traits: { status: 'premium', role: null } };

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const catalog = mock<VehicleCatalogService>();
  const traits = mock<TankTraitsReaderService>();

  catalog.filter.mockResolvedValue(eligible);
  traits.filter.mockImplementation(async ({ entries }) => [...entries]);
  traits.all.mockResolvedValue(new Map([[2, premiumTraits]]));

  prisma.tankEconomyAggregate.findMany.mockResolvedValue([
    economyRow({ tankId: 1, credits: 50_000, net: null }),
    economyRow({ tankId: 1, account: 'standard', credits: 30_000 }),
    economyRow({ tankId: 2, credits: 70_000, net: 45_000 }),
    economyRow({ tankId: 3, account: 'standard', credits: 90_000 })
  ]);

  return { service: new TankEconomyReaderService(prisma, catalog, traits), prisma, catalog, traits };
};

describe('TankEconomyReaderService.list', () => {
  it('lists only tanks with figures for the requested account, richest first', async () => {
    const { service } = createService();

    const page = await service.list(query);

    expect(page.items.map((row) => row.vehicle.tankId)).toEqual([2, 1]);
  });

  it('switches the figures with the account', async () => {
    const { service } = createService();

    const page = await service.list({ ...query, account: 'standard' });

    expect(page.items.map((row) => [row.vehicle.tankId, row.economy.standard?.credits])).toEqual([
      [3, 90_000],
      [1, 30_000]
    ]);
  });

  it('attaches known traits and defaults the rest to researchable', async () => {
    const { service } = createService();

    const page = await service.list(query);

    expect(page.items.map((row) => row.traits.status)).toEqual(['premium', 'researchable']);
  });

  it('puts tanks without the sorted figure last', async () => {
    const { service } = createService();

    const asc = await service.list({ ...query, sort: 'net', order: 'asc' });
    const desc = await service.list({ ...query, sort: 'net', order: 'desc' });

    expect(asc.items.map((row) => row.vehicle.tankId)).toEqual([2, 1]);
    expect(desc.items.map((row) => row.vehicle.tankId)).toEqual([2, 1]);
  });

  it('sorts by tier when asked', async () => {
    const { service } = createService();

    const page = await service.list({ ...query, sort: 'tier', order: 'asc' });

    expect(page.items.map((row) => row.vehicle.tankId)).toEqual([2, 1]);
  });

  it('keeps only tanks that pass the trait filter', async () => {
    const { service, traits } = createService();

    traits.filter.mockResolvedValue(eligible.slice(0, 1));

    expect((await service.list(query)).items.map((row) => row.vehicle.tankId)).toEqual([1]);
  });
});

describe('TankEconomyReaderService.forTank', () => {
  it('splits the aggregates of one tank by account', async () => {
    const { service, prisma } = createService();

    prisma.tankEconomyAggregate.findMany.mockResolvedValue([economyRow({ tankId: 1 })]);

    const economy = await service.forTank(1);

    expect(economy.premium?.credits).toBe(60_000);
    expect(economy.standard).toBeNull();
  });
});

describe('TankEconomyReaderService.account', () => {
  it('counts every battle but lists only tanks the catalog knows', async () => {
    const { service, prisma, catalog } = createService();

    catalog.all.mockResolvedValue(catalogOf(...eligible));

    prisma.battle.findMany.mockResolvedValue([
      mock<Battle>({
        tankId: 1,
        credits: 40_000,
        creditsGross: 40_000,
        repairCost: 5_000,
        ammoCost: 3_000,
        consumablesCost: 0,
        xp: 900,
        isPremiumAccount: false
      }),
      mock<Battle>({
        tankId: 99,
        credits: 10_000,
        creditsGross: 10_000,
        repairCost: null,
        ammoCost: null,
        consumablesCost: null,
        xp: 500,
        isPremiumAccount: false
      })
    ]);

    const economy = await service.account({ accountId: 42n, days: 30 });

    expect(economy.accountId).toBe(42);
    expect(economy.days).toBe(30);
    expect(economy.battles).toBe(2);
    expect(economy.tanks.map((tank) => tank.vehicle.tankId)).toEqual([1]);
  });
});
