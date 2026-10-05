import { describe, expect, it } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import type { PrismaService } from '../../../../core';

import { NEWS_KIND_TO_DB } from '../../config/enum-mapping.constants';
import { NewsReaderService } from '../news-reader.service';

const publishedAt = new Date('2026-09-20T10:00:00Z');

const item = {
  id: '0b0f9a6e-9a36-4f59-8a61-1d1a4b6a0c11',
  source: 'tanki.su',
  externalId: null,
  url: 'https://tanki.su/ru/news/patch/',
  kind: 'patchNotes' as const,
  title: 'Обновление 2.1',
  summary: null,
  image: null,
  tankIds: [7],
  gameVersionId: 3,
  publishedAt,
  enrichedAt: publishedAt,
  createdAt: publishedAt,
  gameVersion: { version: '2.1.0.0' }
};

const unversioned = { ...item, id: 'other', gameVersion: null, gameVersionId: null };

describe('NewsReaderService.list', () => {
  it('translates the public kind to the stored one and filters by tank', async () => {
    const prisma = mockDeep<PrismaService>();

    prisma.newsItem.findMany.mockResolvedValue([item]);
    prisma.newsItem.count.mockResolvedValue(1);

    await new NewsReaderService(prisma).list({ kind: 'patch_notes', tankId: 7, limit: 10, offset: 0 });

    expect(prisma.newsItem.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: { kind: NEWS_KIND_TO_DB.patch_notes, tankIds: { has: 7 } } })
    );
  });

  it('exposes the linked game version and the public kind', async () => {
    const prisma = mockDeep<PrismaService>();

    prisma.newsItem.findMany.mockResolvedValue([item, unversioned]);
    prisma.newsItem.count.mockResolvedValue(2);

    const page = await new NewsReaderService(prisma).list({ kind: undefined, tankId: undefined, limit: 10, offset: 0 });

    expect(prisma.newsItem.count).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
    expect(page.items.map((news) => news.gameVersion)).toEqual([item.gameVersion.version, null]);
    expect(page.items[0]?.kind).toBe('patch_notes');
    expect(page.total).toBe(2);
  });
});
