import type { CheerioAPI } from 'cheerio';

import { load } from 'cheerio';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { PremiumOffer, Vehicle } from '../../../../../generated';
import type { PageCrawlerService, PrismaService } from '../../../../core';
import type { EntitlementsService } from '../../../billing';
import type { NotificationService } from '../../../notifications';
import type { BonusCodeWriterService } from '../bonus-code-writer.service';

import { Prisma } from '../../../../../generated';
import { SOURCES } from '../../../../config';
import { parseTankiListing } from '../../../../lib/scrape';
import { OFFER_SCRAPE } from '../../config/offers.constants';
import { parseOfferDetail } from '../../lib/offer-detail/offer-detail';
import { OfferSyncService } from '../offer-sync.service';

const fixture = (path: string): CheerioAPI => load(readFileSync(new URL(path, import.meta.url), 'utf8'));

const listingPage = fixture('../../../../lib/scrape/tanki-listing/_tests/fixtures/tanki-special-offers.html');
const detailPage = fixture('../../lib/offer-detail/_tests/fixtures/tanki-offer-detail.html');
const listing = parseTankiListing({ $: listingPage, baseUrl: SOURCES.tankiSite });
const [knownItem, detailItem] = listing;
const now = new Date('2026-09-25T12:00:00Z');
const defender = mock<Vehicle>({ tankId: 1, name: 'Объект 252У Защитник' });
const unmentioned = mock<Vehicle>({ tankId: 2, name: 'Нет такого танка' });

const pages = new Map<string, CheerioAPI>([
  [SOURCES.tankiSpecialOffers, listingPage],
  [detailItem?.url ?? '', detailPage]
]);

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const notifications = mock<NotificationService>();
  const bonusCodes = mock<BonusCodeWriterService>();
  const entitlements = mock<EntitlementsService>();
  const crawler = mock<PageCrawlerService>();

  crawler.crawl.mockImplementation(async ({ urls }) =>
    urls.flatMap((url) => {
      const $ = pages.get(url);

      return $ ? [{ url, $ }] : [];
    })
  );

  prisma.premiumOffer.findMany.mockResolvedValueOnce([mock<PremiumOffer>({ url: knownItem?.url ?? null })]).mockResolvedValue([]);
  prisma.premiumOffer.create.mockResolvedValue(mock<PremiumOffer>({ id: 'offer-1' }));
  prisma.vehicle.findMany.mockResolvedValue([defender, unmentioned]);
  notifications.tankDiscounted.mockResolvedValue(1);

  return {
    service: new OfferSyncService(prisma, notifications, bonusCodes, entitlements, crawler),
    prisma,
    notifications,
    bonusCodes,
    entitlements,
    crawler
  };
};

describe('OfferSyncService.run', () => {
  it('creates an offer for every listing item not seen before and refreshes the known ones', async () => {
    const { service, prisma } = createService();

    const summary = await service.run(now);
    const createdUrls = prisma.premiumOffer.create.mock.calls.map(([args]) => args.data.url);

    expect(summary.seen).toBe(listing.length);
    expect(summary.created).toBe(listing.length - 1);
    expect(createdUrls).toEqual(listing.slice(1).map((item) => item.url));
    expect(createdUrls).not.toContain(knownItem?.url);

    expect(prisma.premiumOffer.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { source: OFFER_SCRAPE.source, url: { in: [knownItem?.url] } },
        data: { lastSeenAt: now }
      })
    );
  });

  it('notifies about the tanks named on the offer page with its discount', async () => {
    const { service, notifications } = createService();
    const detail = parseOfferDetail({ $: detailPage, publishedAt: detailItem?.publishedAt ?? now });

    const summary = await service.run(now);

    expect(notifications.tankDiscounted).toHaveBeenCalledTimes(1);

    expect(notifications.tankDiscounted).toHaveBeenCalledWith({
      tankId: defender.tankId,
      tankName: defender.name,
      discountPercent: detail.tankDiscountPercent,
      offerId: 'offer-1'
    });

    expect(summary.notified).toBe(1);
  });

  it('tells the Plus followers that a tank is back after a long absence', async () => {
    const { service, prisma, notifications, entitlements } = createService();

    prisma.premiumOffer.findMany
      .mockReset()
      .mockResolvedValueOnce([mock<PremiumOffer>({ url: knownItem?.url ?? null })])
      .mockResolvedValue([mock<PremiumOffer>({ endsAt: new Date('2026-06-01T00:00:00Z'), lastSeenAt: new Date('2026-05-30T00:00:00Z') })]);

    prisma.follow.findMany.mockResolvedValue([mock({ userId: 'plus' }), mock({ userId: 'free' })]);
    entitlements.isPlus.mockImplementation(async (userId) => userId === 'plus');
    notifications.notifyMany.mockResolvedValue(1);

    await service.run(now);

    expect(notifications.notifyMany).toHaveBeenCalledWith(
      expect.objectContaining({ userIds: ['plus'], notification: expect.objectContaining({ event: 'tankReturned', tankId: defender.tankId }) })
    );
  });

  it('stays quiet about a tank that was on sale a few days ago', async () => {
    const { service, prisma, notifications } = createService();

    prisma.premiumOffer.findMany
      .mockReset()
      .mockResolvedValueOnce([mock<PremiumOffer>({ url: knownItem?.url ?? null })])
      .mockResolvedValue([mock<PremiumOffer>({ endsAt: new Date('2026-09-20T00:00:00Z'), lastSeenAt: new Date('2026-09-20T00:00:00Z') })]);

    await service.run(now);

    expect(notifications.notifyMany).not.toHaveBeenCalled();
  });

  it('discovers the bonus codes printed on the offer page', async () => {
    const { service, bonusCodes } = createService();
    const detail = parseOfferDetail({ $: detailPage, publishedAt: detailItem?.publishedAt ?? now });

    await service.run(now);

    expect(detail.bonusCodes.length).toBeGreaterThan(0);
    expect(bonusCodes.discover.mock.calls.map(([input]) => input.code)).toEqual(detail.bonusCodes);

    expect(bonusCodes.discover).toHaveBeenCalledWith(
      expect.objectContaining({ source: OFFER_SCRAPE.source, sourceUrl: detailItem?.url, expiresAt: detail.endsAt })
    );
  });

  it('skips an offer another run already stored and keeps going with the rest', async () => {
    const { service, prisma, notifications } = createService();

    prisma.premiumOffer.create.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: 'test' }));

    const summary = await service.run(now);

    expect(prisma.premiumOffer.create).toHaveBeenCalledTimes(listing.length - 1);
    expect(summary.created).toBe(listing.length - 1);
    expect(notifications.tankDiscounted).not.toHaveBeenCalled();
  });

  it('creates nothing and skips the vehicle lookup when the listing is unavailable', async () => {
    const { service, prisma, crawler } = createService();

    crawler.crawl.mockResolvedValue([]);
    prisma.premiumOffer.findMany.mockResolvedValue([]);

    expect(await service.run(now)).toEqual({ seen: 0, created: 0, notified: 0 });
    expect(prisma.vehicle.findMany).not.toHaveBeenCalled();
    expect(prisma.premiumOffer.create).not.toHaveBeenCalled();
  });
});
