import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { firstBy } from 'remeda';

import type { SupertestAnnouncementView, SupertestList, SupertestMine } from '../supertest.types';

import { AppNotFoundException } from '../../../common/exceptions';
import { parseJsonText } from '../../../common/lib';
import { PrismaService, REDIS } from '../../../core';
import { OwnAccountReaderService } from '../../analytics';
import { VehicleCatalogService } from '../../reference';
import { SUPERTEST_VIEW } from '../config/view.constants';
import { supertestListSchema } from '../dto/supertest.schemas';
import { narrowToTanks, supertestTotals } from '../lib/supertest-summary/supertest-summary';
import { toSupertestAnnouncement } from '../mappers/supertest-view.mappers';
import { SUPERTEST_ANNOUNCEMENT_SELECT } from '../selects/supertest-announcement.selects';

@Injectable()
export class SupertestReaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: VehicleCatalogService,
    private readonly accounts: OwnAccountReaderService,
    @Inject(REDIS) private readonly redis: Redis
  ) {}

  async list(): Promise<SupertestList> {
    const cached = await this.redis.get(SUPERTEST_VIEW.cacheKey);
    const parsed = cached ? supertestListSchema.safeParse(parseJsonText(cached)) : null;

    if (parsed?.success) {
      return parsed.data;
    }

    const announcements = await this.latest();
    const view: SupertestList = {
      announcements,
      totals: supertestTotals(announcements),
      updatedAt: firstBy(announcements, [(announcement) => announcement.parsedAt ?? '', 'desc'])?.parsedAt ?? null
    };

    await this.redis.set(SUPERTEST_VIEW.cacheKey, JSON.stringify(view), 'EX', SUPERTEST_VIEW.cacheSeconds);

    return view;
  }

  async detail(id: string): Promise<SupertestAnnouncementView> {
    const [row, catalog] = await Promise.all([
      this.prisma.supertestAnnouncement.findUnique({ where: { id }, select: SUPERTEST_ANNOUNCEMENT_SELECT }),
      this.catalog.all()
    ]);

    if (!row) {
      throw new AppNotFoundException('NOT_FOUND', `No supertest announcement ${id}`);
    }

    return toSupertestAnnouncement({ row, catalog });
  }

  async mine(userId: string): Promise<SupertestMine> {
    const [accountId, affected] = await Promise.all([
      this.accounts.resolve({ userId }),
      this.prisma.supertestChange.findMany({
        where: { tankId: { not: null } },
        distinct: ['tankId'],
        select: { tankId: true }
      })
    ]);

    const owned = await this.prisma.playerTank.findMany({
      where: { accountId, tankId: { in: affected.flatMap((row) => (row.tankId === null ? [] : [row.tankId])) } },
      select: { tankId: true }
    });

    const tankIds = new Set(owned.map((row) => row.tankId));
    const announcements = tankIds.size === 0 ? [] : narrowToTanks({ announcements: await this.latest([...tankIds]), tankIds });

    return { accountId: Number(accountId), announcements, totals: supertestTotals(announcements) };
  }

  private async latest(tankIds?: number[]): Promise<SupertestAnnouncementView[]> {
    const [rows, catalog] = await Promise.all([
      this.prisma.supertestAnnouncement.findMany({
        where: tankIds ? { changes: { some: { tankId: { in: tankIds } } } } : {},
        orderBy: { publishedAt: 'desc' },
        take: SUPERTEST_VIEW.listLimit,
        select: SUPERTEST_ANNOUNCEMENT_SELECT
      }),
      this.catalog.all()
    ]);

    return rows.map((row) => toSupertestAnnouncement({ row, catalog }));
  }
}
