import { Injectable } from '@nestjs/common';
import Parser from 'rss-parser';

import { SOURCES } from '../../../../config';
import { HttpClientService, PrismaService } from '../../../../core';
import { NEWS } from '../config/news.constants';
import { toNewsItems } from '../mappers/news-item.mappers';

@Injectable()
export class NewsSyncService {
  private readonly parser = new Parser();

  constructor(
    private readonly prisma: PrismaService,
    private readonly http: HttpClientService
  ) {}

  async sync() {
    const xml = await this.http.getText({ url: SOURCES.newsRss, options: { timeout: NEWS.timeoutMs, headers: { accept: NEWS.accept } } });
    const feed = await this.parser.parseString(xml);
    const items = toNewsItems({ items: feed.items, now: new Date() });
    const { count } = await this.prisma.newsItem.createMany({ data: items, skipDuplicates: true });

    return { items: items.length, inserted: count };
  }
}
