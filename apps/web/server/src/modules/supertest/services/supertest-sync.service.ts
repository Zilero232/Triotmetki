import { Injectable } from '@nestjs/common';
import { subDays } from 'date-fns';

import type { StoreAnnouncementInput, SupertestSyncSummary } from '../supertest.types';

import { PageCrawlerService, PrismaService } from '../../../core';
import { textLines } from '../../../lib/scrape';
import { readVehicleStats } from '../../reference';
import { SUPERTEST_SCRAPE, SUPERTEST_SOURCES } from '../config/scrape.constants';
import { SUPERTEST_VIEW } from '../config/view.constants';
import { isSupertestTitle, parseSupertestArticle } from '../lib/supertest-article/supertest-article';
import { toChangeRows } from '../mappers/change-rows.mappers';

@Injectable()
export class SupertestSyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crawler: PageCrawlerService
  ) {}

  async run(now: Date): Promise<SupertestSyncSummary> {
    const news = await this.prisma.newsItem.findMany({
      where: {
        source: SUPERTEST_SOURCES.official,
        publishedAt: { gte: subDays(now, SUPERTEST_SCRAPE.lookbackDays) },
        OR: SUPERTEST_SCRAPE.titleNeedles.map((needle) => ({ title: { contains: needle, mode: 'insensitive' as const } }))
      },
      orderBy: { publishedAt: 'desc' },
      select: { url: true, title: true, summary: true, image: true, publishedAt: true }
    });

    const candidates = news.filter((item) => isSupertestTitle(item.title));
    const parsed = await this.prisma.supertestAnnouncement.findMany({
      where: { url: { in: candidates.map((item) => item.url) }, parsedAt: { not: null } },
      select: { url: true }
    });

    const parsedUrls = new Set(parsed.map((row) => row.url));
    const fresh = candidates.filter((item) => !parsedUrls.has(item.url)).slice(0, SUPERTEST_SCRAPE.maxPages);

    if (fresh.length === 0) {
      return { seen: candidates.length, fetched: 0, stored: 0, changes: 0 };
    }

    const pages = await this.crawler.crawl({ urls: fresh.map((item) => item.url) });
    const vehicles = await this.prisma.vehicle.findMany({ select: { tankId: true, name: true } });
    let stored = 0;
    let changes = 0;

    for (const item of fresh) {
      const page = pages.find((candidate) => candidate.url === item.url);

      if (!page) {
        continue;
      }

      changes += await this.store({
        announcement: { ...item, source: SUPERTEST_SOURCES.official },
        tanks: parseSupertestArticle({ lines: textLines(page.$), vehicles }),
        now
      });

      stored += 1;
    }

    return { seen: candidates.length, fetched: pages.length, stored, changes };
  }

  private async store({ announcement, tanks, now }: StoreAnnouncementInput): Promise<number> {
    const tankIds = tanks.flatMap((tank) => (tank.tankId === null ? [] : [tank.tankId]));
    const profiles = await this.prisma.vehicleProfile.findMany({
      where: { tankId: { in: tankIds }, profileId: SUPERTEST_VIEW.topProfile },
      select: { tankId: true, data: true }
    });

    const stats = new Map(profiles.map((profile) => [profile.tankId, readVehicleStats(profile.data)]));
    const rows = tanks.flatMap((tank) => toChangeRows({ tank, stats: tank.tankId === null ? null : (stats.get(tank.tankId) ?? null) }));

    await this.prisma.$transaction(async (tx) => {
      const { id } = await tx.supertestAnnouncement.upsert({
        where: { url: announcement.url },
        create: { ...announcement, fetchedAt: now, parsedAt: now },
        update: { ...announcement, fetchedAt: now, parsedAt: now },
        select: { id: true }
      });

      await tx.supertestChange.deleteMany({ where: { announcementId: id } });
      await tx.supertestChange.createMany({ data: rows.map((row, position) => ({ ...row, announcementId: id, position })) });
    });

    return rows.length;
  }
}
