import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { User } from '../../../../../generated';
import type { AppConfigService } from '../../../../config';
import type { PrismaService } from '../../../../core';
import type { CreateBlogPostRequest } from '../../blog.types';
import type { BlogPostRow } from '../../selects/blog-post.types';
import type { BlogImageService } from '../blog-image.service';

import { Prisma } from '../../../../../generated';
import { AppBadRequestException, AppConflictException, AppNotFoundException } from '../../../../common/exceptions';
import { PRISMA_CODE } from '../../../../core';
import { BLOG } from '../../config/blog.constants';
import { BLOG_IMAGES } from '../../config/image.constants';
import { BlogWriterService } from '../blog-writer.service';

const USER_ID = '22222222-2222-4222-8222-222222222222';
const OLD_KEY = `${BLOG_IMAGES.prefix}/0b4c8f1e-2a6d-4c1b-9f5e-3d7a8b9c0d1e.png`;
const NEW_KEY = `${BLOG_IMAGES.prefix}/9f4c8f1e-2a6d-4c1b-9f5e-3d7a8b9c0d1e.webp`;

const ROW: BlogPostRow = {
  id: '11111111-1111-4111-8111-111111111111',
  slug: 'patch-1-45',
  locale: 'ru',
  title: 'Разбор патча 1.45',
  excerpt: 'Что поменялось в балансе и почему это важно',
  body: '## Баланс\n\nТекст.',
  category: 'patches',
  tags: [],
  coverKey: OLD_KEY,
  coverUrl: null,
  seoTitle: null,
  seoDescription: null,
  isFeatured: false,
  readingMinutes: 1,
  status: 'draft',
  authorUserId: USER_ID,
  publishedAt: null,
  createdAt: new Date('2026-09-19T10:00:00.000Z'),
  updatedAt: new Date('2026-09-19T10:00:00.000Z'),
  author: { id: USER_ID, name: 'Редакция', image: null }
};

const CREATE: CreateBlogPostRequest = {
  userId: USER_ID,
  locale: 'ru',
  title: ROW.title,
  excerpt: ROW.excerpt,
  body: ROW.body,
  category: ROW.category,
  tags: [],
  coverKey: null,
  coverUrl: null,
  seoTitle: null,
  seoDescription: null,
  isFeatured: false,
  status: 'draft'
};

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const config = mock<AppConfigService>();
  const images = mock<BlogImageService>();

  config.get.mockReturnValue('http://localhost:4000');

  return { service: new BlogWriterService(prisma, config, images), prisma, images };
};

describe('BlogWriterService.access', () => {
  it('lets every editor role in', async () => {
    const { service, prisma } = createService();

    const results = await Promise.all(
      BLOG.editorRoles.map(async (role) => {
        prisma.user.findUnique.mockResolvedValueOnce(mock<User>({ role }));

        return service.access(USER_ID);
      })
    );

    expect(results.every(({ canEdit }) => canEdit)).toBe(true);
  });

  it('keeps an ordinary user out', async () => {
    const { service, prisma } = createService();

    prisma.user.findUnique.mockResolvedValue(mock<User>({ role: 'user' }));

    expect(await service.access(USER_ID)).toEqual({ canEdit: false });
  });

  it('keeps an anonymous visitor out without touching the database', async () => {
    const { service, prisma } = createService();

    expect(await service.access(null)).toEqual({ canEdit: false });
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});

describe('BlogWriterService.create', () => {
  it('stamps the publish date only when the post goes out published', async () => {
    const { service, prisma } = createService();

    prisma.blogPost.count.mockResolvedValue(0);
    prisma.blogPost.create.mockResolvedValue(ROW);

    await service.create({ ...CREATE, status: 'published' });
    await service.create(CREATE);

    const [published, draft] = prisma.blogPost.create.mock.calls.map(([args]) => args.data.publishedAt);

    expect(published).toBeInstanceOf(Date);
    expect(draft).toBeNull();
  });

  it('adds a suffix when the slug derived from the title is taken', async () => {
    const { service, prisma } = createService();

    prisma.blogPost.count.mockResolvedValue(1);
    prisma.blogPost.create.mockResolvedValue(ROW);

    await service.create(CREATE);

    const slug = prisma.blogPost.create.mock.calls[0]?.[0].data.slug;

    expect(slug).toMatch(/-[0-9a-f]{6}$/);
  });

  it('refuses a slug the editor typed when it is taken', async () => {
    const { service, prisma } = createService();

    prisma.blogPost.count.mockResolvedValue(1);

    await expect(service.create({ ...CREATE, slug: 'patch-1-45' })).rejects.toBeInstanceOf(AppConflictException);
    expect(prisma.blogPost.create).not.toHaveBeenCalled();
  });

  it('answers a conflict when another post takes the slug between the check and the insert', async () => {
    const { service, prisma } = createService();

    prisma.blogPost.count.mockResolvedValue(0);

    prisma.blogPost.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('unique', { code: PRISMA_CODE.uniqueViolation, clientVersion: 'test' })
    );

    await expect(service.create(CREATE)).rejects.toBeInstanceOf(AppConflictException);
  });

  it('refuses an uploaded cover and a cover URL at once', async () => {
    const { service } = createService();

    await expect(service.create({ ...CREATE, coverKey: NEW_KEY, coverUrl: 'https://example.com/a.png' })).rejects.toBeInstanceOf(
      AppBadRequestException
    );
  });
});

describe('BlogWriterService.update', () => {
  it('keeps the first publish date when a published post is saved again', async () => {
    const { service, prisma } = createService();

    prisma.blogPost.findUnique.mockResolvedValue({ ...ROW, status: 'published', publishedAt: new Date('2026-09-20T10:00:00.000Z') });
    prisma.blogPost.update.mockResolvedValue(ROW);

    await service.update({ id: ROW.id, status: 'published' });

    expect(prisma.blogPost.update.mock.calls[0]?.[0].data).not.toHaveProperty('publishedAt');
  });

  it('recomputes the reading time when the body changes', async () => {
    const { service, prisma } = createService();

    prisma.blogPost.findUnique.mockResolvedValue(ROW);
    prisma.blogPost.update.mockResolvedValue(ROW);

    await service.update({
      id: ROW.id,
      body: Array.from({ length: BLOG.wordsPerMinute * 3 })
        .fill('слово')
        .join(' ')
    });

    expect(prisma.blogPost.update.mock.calls[0]?.[0].data.readingMinutes).toBe(3);
  });

  it('deletes the replaced uploaded cover', async () => {
    const { service, prisma, images } = createService();

    prisma.blogPost.findUnique.mockResolvedValue(ROW);
    prisma.blogPost.update.mockResolvedValue({ ...ROW, coverKey: NEW_KEY });

    await service.update({ id: ROW.id, coverKey: NEW_KEY });

    expect(images.remove).toHaveBeenCalledWith(OLD_KEY);
  });

  it('refuses switching to a cover URL while the uploaded cover stays', async () => {
    const { service, prisma } = createService();

    prisma.blogPost.findUnique.mockResolvedValue(ROW);

    await expect(service.update({ id: ROW.id, coverUrl: 'https://example.com/a.png' })).rejects.toBeInstanceOf(AppBadRequestException);
  });

  it('reports a missing post', async () => {
    const { service, prisma } = createService();

    prisma.blogPost.findUnique.mockResolvedValue(null);

    await expect(service.update({ id: ROW.id, title: 'Новое название' })).rejects.toBeInstanceOf(AppNotFoundException);
  });
});

describe('BlogWriterService.remove', () => {
  it('removes the post and its uploaded cover', async () => {
    const { service, prisma, images } = createService();

    prisma.blogPost.findUnique.mockResolvedValue(ROW);

    await service.remove(ROW.id);

    expect(prisma.blogPost.delete).toHaveBeenCalledWith({ where: { id: ROW.id } });
    expect(images.remove).toHaveBeenCalledWith(OLD_KEY);
  });
});
