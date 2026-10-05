import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { NewsItem, PremiumOffer, Vehicle } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { VehicleCatalogService } from '../../../reference';
import type { TraitsEntry } from '../../tanks.types';
import type { TankTraitsReaderService } from '../tank-traits-reader.service';
import type { VehicleSourcesService } from '../vehicle-sources.service';

import { Prisma } from '../../../../../generated';
import { TankObtainReaderService } from '../tank-obtain-reader.service';
import { vehicle } from './tanks.fixtures';

const offer = (overrides: Partial<PremiumOffer>): PremiumOffer => ({
  id: 'o1',
  externalId: null,
  source: 'shop',
  title: 'Bundle',
  url: 'https://shop.tanki.su/bundle',
  image: null,
  tankIds: [1],
  contents: null,
  priceRub: null,
  priceGold: null,
  discountPercent: null,
  startsAt: null,
  endsAt: null,
  firstSeenAt: new Date('2026-09-01T00:00:00Z'),
  lastSeenAt: new Date('2026-09-20T00:00:00Z'),
  ...overrides
});

const premium: TraitsEntry = {
  spec: { tags: [], role: null, notInShop: false },
  hasOffers: true,
  traits: { status: 'premium', role: 'HT_break' }
};

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const catalog = mock<VehicleCatalogService>();
  const traits = mock<TankTraitsReaderService>();
  const sources = mock<VehicleSourcesService>();

  traits.of.mockResolvedValue(null);
  prisma.vehicle.findUnique.mockResolvedValue(null);
  prisma.premiumOffer.findMany.mockResolvedValue([]);
  prisma.premiumOffer.count.mockResolvedValue(0);
  prisma.newsItem.findMany.mockResolvedValue([]);
  sources.missionsFor.mockResolvedValue([]);
  sources.forTank.mockResolvedValue([]);
  catalog.summary.mockImplementation(async (tankId) => vehicle({ tankId }));

  return { service: new TankObtainReaderService(prisma, catalog, traits, sources), prisma, traits };
};

describe('TankObtainReaderService.obtain', () => {
  it('treats a tank with no traits or game data as a researchable tech-tree tank', async () => {
    const { service, prisma } = createService();

    const obtain = await service.obtain(1);

    expect(obtain).toMatchObject({
      status: 'researchable',
      role: null,
      sources: ['techTree'],
      priceCredits: null,
      priceGold: null,
      researchFrom: []
    });

    expect(prisma.vehicle.findMany).not.toHaveBeenCalled();
  });

  it('shows the research cost from every parent tank', async () => {
    const { service, prisma } = createService();

    prisma.vehicle.findUnique.mockResolvedValue(mock<Vehicle>({ priceCredit: 3_500_000, priceGold: null, prevTankIds: [5, 6] }));

    prisma.vehicle.findMany.mockResolvedValue([
      mock<Vehicle>({ tankId: 5, nextTanks: [{ tankId: 1, xp: 120_000 }] }),
      mock<Vehicle>({ tankId: 6, nextTanks: { 1: 150_000 } })
    ]);

    const obtain = await service.obtain(1);

    expect(obtain.priceCredits).toBe(3_500_000);

    expect(obtain.researchFrom.map((parent) => [parent.vehicle.tankId, parent.xp])).toEqual([
      [5, 120_000],
      [6, 150_000]
    ]);
  });

  it('lists shop offers with a readable link and a numeric price', async () => {
    const { service, prisma, traits } = createService();

    traits.of.mockResolvedValue(premium);
    prisma.premiumOffer.count.mockResolvedValue(7);

    prisma.premiumOffer.findMany.mockResolvedValue([
      offer({ priceRub: new Prisma.Decimal(1_990), startsAt: new Date('2026-09-10T00:00:00Z') }),
      offer({ id: 'o2', url: 'no link here' }),
      offer({ id: 'o3', url: null })
    ]);

    const obtain = await service.obtain(1);

    expect(obtain.offers.total).toBe(7);
    expect(obtain.offers.items.map((item) => item.url)).toEqual(['https://shop.tanki.su/bundle', null, null]);
    expect(obtain.offers.items[0]).toMatchObject({ priceRub: 1_990, startsAt: '2026-09-10T00:00:00.000Z', endsAt: null });
    expect(obtain.offers.items[1]?.priceRub).toBeNull();
  });

  it('lists a premium tank that has offers in both shops', async () => {
    const { service, prisma, traits } = createService();

    traits.of.mockResolvedValue(premium);
    prisma.premiumOffer.count.mockResolvedValue(1);

    const obtain = await service.obtain(1);

    expect(obtain).toMatchObject({ status: 'premium', role: 'HT_break' });
    expect(obtain.sources).toEqual(['inGameShop', 'premiumShop']);
  });

  it('drops news items whose link cannot be parsed', async () => {
    const { service, prisma } = createService();

    prisma.newsItem.findMany.mockResolvedValue([
      mock<NewsItem>({ title: 'Good', url: 'https://tanki.su/news/1', publishedAt: new Date('2026-09-20T00:00:00Z') }),
      mock<NewsItem>({ title: 'Bad', url: 'broken', publishedAt: new Date('2026-09-21T00:00:00Z') })
    ]);

    const obtain = await service.obtain(1);

    expect(obtain.news).toEqual([{ title: 'Good', url: 'https://tanki.su/news/1', publishedAt: '2026-09-20T00:00:00.000Z' }]);
  });
});
