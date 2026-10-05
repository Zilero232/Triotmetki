import { Injectable } from '@nestjs/common';

import type { PremiumOffer, Prisma } from '../../../../generated';
import type { AnnounceReturnInput, ScrapeSummary, StoreOfferInput } from '../shop.types';

import { toJsonValue } from '../../../common/lib';
import { SOURCES } from '../../../config';
import { isUniqueViolation, PageCrawlerService, PrismaService } from '../../../core';
import { parseTankiListing } from '../../../lib/scrape';
import { EntitlementsService } from '../../billing';
import { NotificationService } from '../../notifications';
import { NEWS_ENRICH } from '../config/news.constants';
import { OFFER_RETURN, OFFER_SCRAPE } from '../config/offers.constants';
import { parseOfferDetail } from '../lib/offer-detail/offer-detail';
import { absenceBeforeReturn } from '../lib/offer-return/offer-return';
import { matchTankNames } from '../lib/tank-mentions/tank-mentions';
import { BonusCodeWriterService } from './bonus-code-writer.service';

@Injectable()
export class OfferSyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
    private readonly bonusCodes: BonusCodeWriterService,
    private readonly entitlements: EntitlementsService,
    private readonly crawler: PageCrawlerService
  ) {}

  async run(now: Date): Promise<ScrapeSummary> {
    const [listingPage] = await this.crawler.crawl({ urls: [SOURCES.tankiSpecialOffers] });
    const listing = listingPage ? parseTankiListing({ $: listingPage.$, baseUrl: SOURCES.tankiSite }) : [];
    const known = await this.prisma.premiumOffer.findMany({
      where: { source: OFFER_SCRAPE.source, url: { in: listing.map((item) => item.url) } },
      select: { url: true }
    });

    const knownUrls = new Set(known.flatMap((offer) => (offer.url ? [offer.url] : [])));

    await this.prisma.premiumOffer.updateMany({ where: { source: OFFER_SCRAPE.source, url: { in: [...knownUrls] } }, data: { lastSeenAt: now } });

    const fresh = listing.filter((item) => !knownUrls.has(item.url)).slice(0, OFFER_SCRAPE.maxDetailPages);
    const pages = await this.crawler.crawl({ urls: fresh.map((item) => item.url) });
    const vehicles = fresh.length > 0 ? await this.prisma.vehicle.findMany({ where: { isActive: true }, select: { tankId: true, name: true } }) : [];
    let notified = 0;

    for (const item of fresh) {
      const page = pages.find((candidate) => candidate.url === item.url);

      notified += await this.store({
        item,
        detail: page ? parseOfferDetail({ $: page.$, publishedAt: item.publishedAt ?? now }) : null,
        vehicles,
        now
      });
    }

    return { seen: listing.length, created: fresh.length, notified };
  }

  private async store({ item, detail, vehicles, now }: StoreOfferInput): Promise<number> {
    const tankIds = matchTankNames({ text: `${item.title}\n${detail?.text ?? ''}`, vehicles, minLength: NEWS_ENRICH.minTankNameLength });
    const discountPercent = detail?.tankDiscountPercent || null;
    const offer = await this.createOffer({
      source: OFFER_SCRAPE.source,
      externalId: new URL(item.url).pathname,
      title: item.title,
      url: item.url,
      image: item.image,
      tankIds,
      discountPercent: detail?.tankDiscountPercent ?? null,
      contents: toJsonValue({ discounts: detail?.discounts ?? [], bonusCodes: detail?.bonusCodes ?? [] }),
      startsAt: item.publishedAt ?? now,
      endsAt: detail?.endsAt ?? null
    });

    if (!offer) {
      return 0;
    }

    for (const code of detail?.bonusCodes ?? []) {
      await this.bonusCodes.discover({
        code,
        title: item.title,
        source: OFFER_SCRAPE.source,
        sourceUrl: item.url,
        expiresAt: detail?.endsAt ?? null
      });
    }

    const names = new Map(vehicles.map((vehicle) => [vehicle.tankId, vehicle.name]));
    let notified = 0;

    for (const tankId of tankIds) {
      const tankName = names.get(tankId) ?? String(tankId);

      notified += await this.notifications.tankDiscounted({ tankId, tankName, discountPercent, offerId: offer.id });
      notified += await this.announceReturn({ tankId, tankName, discountPercent, offerId: offer.id, now });
    }

    return notified;
  }

  private async announceReturn({ tankId, tankName, discountPercent, offerId, now }: AnnounceReturnInput): Promise<number> {
    const previous = await this.prisma.premiumOffer.findMany({
      where: { tankIds: { has: tankId }, id: { not: offerId } },
      select: { endsAt: true, lastSeenAt: true }
    });

    const absentDays = absenceBeforeReturn({ previous, now, minDays: OFFER_RETURN.minAbsentDays });

    if (absentDays === null) {
      return 0;
    }

    const follows = await this.prisma.follow.findMany({
      where: { kind: 'tank', targetId: BigInt(tankId), isFollowing: true, OR: [{ events: { has: 'tankReturned' } }, { events: { isEmpty: true } }] },
      select: { userId: true }
    });

    const plusUsers = (await Promise.all(follows.map(async ({ userId }) => ((await this.entitlements.isPlus(userId)) ? [userId] : [])))).flat();

    return this.notifications.notifyMany({
      userIds: plusUsers,
      notification: { event: 'tankReturned', tankId, tankName, absentDays, discountPercent },
      dedupeKey: `returned-${tankId}-${offerId}`
    });
  }

  private async createOffer(data: Prisma.PremiumOfferUncheckedCreateInput): Promise<PremiumOffer | null> {
    try {
      return await this.prisma.premiumOffer.create({ data });
    } catch (error) {
      if (isUniqueViolation(error)) {
        return null;
      }

      throw error;
    }
  }
}
