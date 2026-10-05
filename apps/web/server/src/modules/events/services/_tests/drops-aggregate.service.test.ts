import { describe, expect, it } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import type { NewsItem } from '../../../../../generated';
import type { PrismaService } from '../../../../core';

import { EVENT_CALENDAR } from '../../config/calendar.constants';
import { DropsAggregateService } from '../drops-aggregate.service';

const now = new Date('2026-09-25T12:00:00Z');

const newsRow = (overrides: Partial<NewsItem>): NewsItem => ({
  id: 'n1',
  source: 'tanki.su',
  externalId: null,
  url: 'https://tanki.su/ru/news/n1/',
  kind: 'news',
  title: 'Новости',
  summary: null,
  image: null,
  tankIds: [],
  gameVersionId: null,
  publishedAt: now,
  enrichedAt: null,
  createdAt: now,
  ...overrides
});

describe('DropsAggregateService.run', () => {
  it('turns only drop-like news into drops events', async () => {
    const prisma = mockDeep<PrismaService>();

    prisma.newsItem.findMany.mockResolvedValue([
      newsRow({ id: 'drop', title: 'Смотрите стримы на Twitch и получайте награды', summary: 'Призы' }),
      newsRow({ id: 'patch', title: 'Обновление 2.1: список изменений' })
    ]);

    expect(await new DropsAggregateService(prisma).run(now)).toBe(1);
    expect(prisma.gameEvent.upsert).toHaveBeenCalledTimes(1);

    expect(prisma.gameEvent.upsert.mock.calls[0]?.[0]).toMatchObject({
      where: { slug: `${EVENT_CALENDAR.dropsSlugPrefix}drop` },
      create: { kind: 'drops', description: 'Призы', startsAt: now },
      update: {}
    });
  });

  it('looks back only over the configured news window', async () => {
    const prisma = mockDeep<PrismaService>();

    prisma.newsItem.findMany.mockResolvedValue([]);

    expect(await new DropsAggregateService(prisma).run(now)).toBe(0);

    expect(prisma.newsItem.findMany.mock.calls[0]?.[0]?.where).toEqual({
      publishedAt: { gte: new Date(now.getTime() - EVENT_CALENDAR.newsLookbackDays * 86_400_000) }
    });

    expect(prisma.gameEvent.upsert).not.toHaveBeenCalled();
  });
});
