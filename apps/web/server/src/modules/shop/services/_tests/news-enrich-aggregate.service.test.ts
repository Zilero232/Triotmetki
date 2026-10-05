import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { GameVersion, NewsItem, Vehicle } from '../../../../../generated';
import type { PrismaService } from '../../../../core';

import { NEWS_ENRICH } from '../../config/news.constants';
import { versionsOf } from '../../lib/patch-notes/patch-notes';
import { NewsEnrichAggregateService } from '../news-enrich-aggregate.service';

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

const createService = () => {
  const prisma = mockDeep<PrismaService>();

  prisma.vehicle.findMany.mockResolvedValue([mock<Vehicle>({ tankId: 7, name: 'Объект 252У Защитник' })]);

  return { service: new NewsEnrichAggregateService(prisma), prisma };
};

describe('NewsEnrichAggregateService.run', () => {
  it('returns 0 without loading vehicles when nothing is pending', async () => {
    const { service, prisma } = createService();

    prisma.newsItem.findMany.mockResolvedValue([]);

    expect(await service.run(now)).toBe(0);
    expect(prisma.vehicle.findMany).not.toHaveBeenCalled();
    expect(prisma.newsItem.update).not.toHaveBeenCalled();
  });

  it('marks patch notes and links the game version they name', async () => {
    const { service, prisma } = createService();
    const title = 'Обновление 2.1: список изменений';

    prisma.newsItem.findMany.mockResolvedValue([newsRow({ title })]);
    prisma.gameVersion.findMany.mockResolvedValue([mock<GameVersion>({ id: 42, version: versionsOf(title)[0] })]);

    expect(await service.run(now)).toBe(1);
    expect(prisma.gameVersion.findMany.mock.calls[0]?.[0]?.where).toEqual({ version: { in: versionsOf(title) } });

    expect(prisma.newsItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'n1' },
        data: { kind: 'patchNotes', gameVersionId: 42, tankIds: [], enrichedAt: now }
      })
    );
  });

  it('keeps an already linked version and merges mentioned tanks without duplicates', async () => {
    const { service, prisma } = createService();

    prisma.newsItem.findMany.mockResolvedValue([
      newsRow({ title: 'Скидки', summary: 'Объект 252У Защитник и другие', tankIds: [7, 3], gameVersionId: 5 })
    ]);

    await service.run(now);

    const data = prisma.newsItem.update.mock.calls[0]?.[0].data;

    expect(prisma.gameVersion.findMany).not.toHaveBeenCalled();
    expect(data).toMatchObject({ kind: 'news', gameVersionId: 5 });
    expect(data?.tankIds).toEqual([7, 3]);
  });

  it('reads one batch of unenriched items at a time', async () => {
    const { service, prisma } = createService();

    prisma.newsItem.findMany.mockResolvedValue([]);

    await service.run(now);

    expect(prisma.newsItem.findMany.mock.calls[0]?.[0]).toMatchObject({ where: { enrichedAt: null }, take: NEWS_ENRICH.batch });
  });
});
