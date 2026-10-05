import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { AppConfigService } from '../../../../config';
import type { BlogTagsQueries } from '../../queries/blog-tags.types';
import type { BlogPostRow } from '../../selects/blog-post.types';

import { AppNotFoundException } from '../../../../common/exceptions';
import { mockPrismaService } from '../../../../core/prisma/_tests/prisma-mock';
import { BLOG } from '../../config/blog.constants';
import { BlogReaderService } from '../blog-reader.service';

const ROW: BlogPostRow = {
  id: '11111111-1111-4111-8111-111111111111',
  slug: 'patch-1-45',
  locale: 'ru',
  title: 'Разбор патча 1.45',
  excerpt: 'Что поменялось в балансе и почему это важно',
  body: '## Баланс\n\nТекст.',
  category: 'patches',
  tags: ['баланс'],
  coverKey: null,
  coverUrl: null,
  seoTitle: null,
  seoDescription: null,
  isFeatured: false,
  readingMinutes: 1,
  status: 'published',
  authorUserId: null,
  publishedAt: new Date('2026-09-20T10:00:00.000Z'),
  createdAt: new Date('2026-09-19T10:00:00.000Z'),
  updatedAt: new Date('2026-09-19T10:00:00.000Z'),
  author: null
};

const createService = () => {
  const prisma = mockPrismaService();
  const config = mock<AppConfigService>();
  const queries = mock<BlogTagsQueries>();

  config.get.mockReturnValue('http://localhost:4000');

  return { service: new BlogReaderService(prisma, config, queries), prisma, queries };
};

describe('BlogReaderService.list', () => {
  it('lists only published posts and applies the filters', async () => {
    const { service, prisma } = createService();

    prisma.blogPost.findMany.mockResolvedValue([ROW]);
    prisma.blogPost.count.mockResolvedValue(1);

    const page = await service.list({ category: 'patches', tag: 'баланс', limit: 12, offset: 0 });

    expect(prisma.blogPost.findMany.mock.calls[0]?.[0]?.where).toEqual({ status: 'published', category: 'patches', tags: { has: 'баланс' } });
    expect(page).toMatchObject({ total: 1, limit: 12, offset: 0 });
  });

  it('returns an empty page when nothing is published', async () => {
    const { service, prisma } = createService();

    prisma.blogPost.findMany.mockResolvedValue([]);
    prisma.blogPost.count.mockResolvedValue(0);

    expect((await service.list({ limit: 12, offset: 0 })).items).toEqual([]);
  });
});

describe('BlogReaderService.article', () => {
  it('hides a post that is not published', async () => {
    const { service, prisma } = createService();

    prisma.blogPost.findFirst.mockResolvedValue(null);

    await expect(service.article('draft-post')).rejects.toBeInstanceOf(AppNotFoundException);
    expect(prisma.blogPost.findFirst.mock.calls[0]?.[0]?.where).toEqual({ slug: 'draft-post', status: 'published' });
  });

  it('looks for related posts by category or shared tags, never the post itself', async () => {
    const { service, prisma } = createService();

    prisma.blogPost.findFirst.mockResolvedValue(ROW);
    prisma.blogPost.findMany.mockResolvedValue([]);

    await service.article(ROW.slug);

    const query = prisma.blogPost.findMany.mock.calls[0]?.[0];

    expect(query?.where).toEqual({
      status: 'published',
      id: { not: ROW.id },
      OR: [{ category: ROW.category }, { tags: { hasSome: ROW.tags } }]
    });

    expect(query?.take).toBe(BLOG.relatedLimit);
  });
});
