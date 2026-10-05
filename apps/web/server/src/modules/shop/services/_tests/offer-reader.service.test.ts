import { millisecondsInDay } from 'date-fns/constants';
import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { PremiumOffer, Vehicle } from '../../../../../generated';
import type { PrismaService } from '../../../../core';

import { OFFER_RETURN } from '../../config/offers.constants';
import { OfferReaderService } from '../offer-reader.service';

const start = new Date('2026-06-01T00:00:00Z');
const at = (days: number): Date => new Date(start.getTime() + days * millisecondsInDay);

const offerRow = (overrides: Partial<PremiumOffer>): PremiumOffer => ({
  id: 'o1',
  externalId: null,
  source: 'tanki.su',
  title: 'Offer',
  url: null,
  image: null,
  tankIds: [],
  contents: null,
  priceRub: null,
  priceGold: null,
  discountPercent: null,
  startsAt: null,
  endsAt: null,
  firstSeenAt: start,
  lastSeenAt: start,
  ...overrides
});

const createService = () => {
  const prisma = mockDeep<PrismaService>();

  prisma.vehicle.findMany.mockResolvedValue([mock<Vehicle>({ tankId: 1, name: 'Tank One' })]);

  return { service: new OfferReaderService(prisma), prisma };
};

describe('OfferReaderService.archive', () => {
  it('estimates the next return of a tank from the median gap between its offers', async () => {
    const { service, prisma } = createService();

    prisma.premiumOffer.findMany.mockResolvedValue([
      offerRow({ tankIds: [1, 2], startsAt: at(0), discountPercent: 20 }),
      offerRow({ tankIds: [1], startsAt: at(10), discountPercent: 30 }),
      offerRow({ tankIds: [1], startsAt: at(20), discountPercent: null })
    ]);

    const [entry, ...rest] = await service.archive(1);

    expect(rest).toEqual([]);

    expect(entry).toEqual({
      tankId: 1,
      tankName: 'Tank One',
      timesSeen: 3,
      lastSeenAt: at(20).toISOString(),
      lastDiscountPercent: 30,
      medianIntervalDays: 10,
      nextExpectedAt: at(30).toISOString()
    });
  });

  it('gives no estimate for a tank seen fewer times than needed', async () => {
    const { service, prisma } = createService();

    prisma.premiumOffer.findMany.mockResolvedValue(
      Array.from({ length: OFFER_RETURN.minOccurrences - 1 }, (_, index) => offerRow({ tankIds: [1], startsAt: at(index) }))
    );

    const [entry] = await service.archive(1);

    expect(entry?.medianIntervalDays).toBeNull();
    expect(entry?.nextExpectedAt).toBeNull();
  });

  it('falls back to the first sighting when an offer has no start and sorts the latest tank first', async () => {
    const { service, prisma } = createService();

    prisma.premiumOffer.findMany.mockResolvedValue([
      offerRow({ tankIds: [1], startsAt: null, firstSeenAt: at(1) }),
      offerRow({ tankIds: [2], startsAt: at(5) })
    ]);

    const archive = await service.archive(undefined);

    expect(archive.map((entry) => entry.tankId)).toEqual([2, 1]);
    expect(archive[1]?.lastSeenAt).toBe(at(1).toISOString());
    expect(archive[0]?.tankName).toBeNull();
  });
});

describe('OfferReaderService.list', () => {
  it('reports how many offers carried the tank of each offer', async () => {
    const { service, prisma } = createService();
    const offer = offerRow({ id: 'o1', tankIds: [1] });

    prisma.premiumOffer.findMany.mockResolvedValueOnce([offer]).mockResolvedValueOnce([offer, offerRow({ id: 'o2', tankIds: [1, 2] })]);
    prisma.premiumOffer.count.mockResolvedValue(1);

    const page = await service.list({ active: undefined, tankId: undefined, limit: 20, offset: 0 });

    expect(page.items[0]?.timesSeen).toBe(2);
  });
});
