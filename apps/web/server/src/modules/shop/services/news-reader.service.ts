import { Injectable } from '@nestjs/common';

import type { Prisma } from '../../../../generated';
import type { NewsPage, NewsQuery } from '../shop.types';

import { paginate } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { NEWS_KIND_TO_DB } from '../config/enum-mapping.constants';
import { toNewsView } from '../mappers/shop-views.mappers';

@Injectable()
export class NewsReaderService {
  constructor(private readonly prisma: PrismaService) {}

  async list({ kind, tankId, limit, offset }: NewsQuery): Promise<NewsPage> {
    const where: Prisma.NewsItemWhereInput = {
      ...(kind ? { kind: NEWS_KIND_TO_DB[kind] } : {}),
      ...(tankId === undefined ? {} : { tankIds: { has: tankId } })
    };

    const page = await paginate({
      limit,
      offset,
      fetch: (window) =>
        this.prisma.newsItem.findMany({
          where,
          orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
          include: { gameVersion: { select: { version: true } } },
          ...window
        }),
      count: () => this.prisma.newsItem.count({ where })
    });

    return { ...page, items: page.items.map(toNewsView) };
  }
}
