import { Injectable } from '@nestjs/common';
import { subDays } from 'date-fns';

import { PrismaService } from '../../../core';
import { EVENT_CALENDAR } from '../config/calendar.constants';
import { eventKind } from '../lib/event-kind/event-kind';

@Injectable()
export class DropsAggregateService {
  constructor(private readonly prisma: PrismaService) {}

  async run(now: Date): Promise<number> {
    const since = subDays(now, EVENT_CALENDAR.newsLookbackDays);
    const news = await this.prisma.newsItem.findMany({
      where: { publishedAt: { gte: since } },
      select: { id: true, title: true, url: true, image: true, summary: true, publishedAt: true }
    });

    const drops = news.filter((item) => eventKind(item.title) === 'drops');

    for (const item of drops) {
      await this.prisma.gameEvent.upsert({
        where: { slug: `${EVENT_CALENDAR.dropsSlugPrefix}${item.id}` },
        create: {
          slug: `${EVENT_CALENDAR.dropsSlugPrefix}${item.id}`,
          kind: 'drops',
          title: item.title,
          description: item.summary,
          url: item.url,
          image: item.image,
          startsAt: item.publishedAt
        },
        update: {}
      });
    }

    return drops.length;
  }
}
