import { Injectable } from '@nestjs/common';

import { SOURCES } from '../../../config';
import { PageCrawlerService, PrismaService } from '../../../core';
import { latestDeadline, parseTankiListing, textLines } from '../../../lib/scrape';
import { EVENT_CALENDAR } from '../config/calendar.constants';
import { eventKind, eventSlug } from '../lib/event-kind/event-kind';

@Injectable()
export class EventCalendarSyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crawler: PageCrawlerService
  ) {}

  async run(now: Date): Promise<number> {
    const [page] = await this.crawler.crawl({ urls: [SOURCES.tankiGameEvents] });
    const listing = page ? parseTankiListing({ $: page.$, baseUrl: SOURCES.tankiSite }) : [];
    const items = listing.map((item) => ({ ...item, slug: eventSlug(item.url) })).filter((item) => item.slug.length > 0);
    const known = await this.prisma.gameEvent.findMany({ where: { slug: { in: items.map((item) => item.slug) } }, select: { slug: true } });
    const knownSlugs = new Set(known.map((event) => event.slug));
    const fresh = items.filter((item) => !knownSlugs.has(item.slug)).slice(0, EVENT_CALENDAR.maxDetailPages);
    const details = await this.crawler.crawl({ urls: fresh.map((item) => item.url) });

    for (const item of fresh) {
      const detail = details.find((candidate) => candidate.url === item.url);
      const startsAt = item.publishedAt ?? now;
      const text = detail ? textLines(detail.$).join('\n') : '';

      await this.prisma.gameEvent.upsert({
        where: { slug: item.slug },
        create: {
          slug: item.slug,
          kind: eventKind(item.title),
          title: item.title,
          url: item.url,
          image: item.image,
          startsAt,
          endsAt: text ? latestDeadline({ text, reference: startsAt }) : null
        },
        update: {}
      });
    }

    return fresh.length;
  }
}
