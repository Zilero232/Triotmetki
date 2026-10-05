import { describe, expect, it } from 'vitest';

import type { BlogPostRow } from '../../selects/blog-post.types';

import { BLOG_IMAGES } from '../../config/image.constants';
import { toBlogEditorPostView, toBlogPostSummary, toBlogPostView } from '../blog-post-view.mappers';

const API_URL = 'https://api.triotmetki.ru';
const IMAGE_FILE = '0b4c8f1e-2a6d-4c1b-9f5e-3d7a8b9c0d1e.webp';

const POST: BlogPostRow = {
  id: '11111111-1111-4111-8111-111111111111',
  slug: 'patch-1-45',
  locale: 'ru',
  title: 'Разбор патча 1.45',
  excerpt: 'Что поменялось в балансе и почему это важно для отметок',
  body: '## Баланс\n\nТекст.\n\n### ИС-7\n\nЕщё текст.',
  category: 'patches',
  tags: ['баланс', 'patch'],
  coverKey: `${BLOG_IMAGES.prefix}/${IMAGE_FILE}`,
  coverUrl: null,
  seoTitle: null,
  seoDescription: null,
  isFeatured: true,
  readingMinutes: 3,
  status: 'published',
  authorUserId: '22222222-2222-4222-8222-222222222222',
  publishedAt: new Date('2026-09-20T10:00:00.000Z'),
  createdAt: new Date('2026-09-19T10:00:00.000Z'),
  updatedAt: new Date('2026-09-21T10:00:00.000Z'),
  author: { id: '22222222-2222-4222-8222-222222222222', name: 'Редакция', image: 'javascript:alert(1)' }
};

describe('toBlogPostSummary', () => {
  it('drops an author avatar that is not an http URL', () => {
    expect(toBlogPostSummary({ post: POST, apiUrl: API_URL }).author?.image).toBeNull();
  });

  it('keeps a post whose author was deleted', () => {
    expect(toBlogPostSummary({ post: { ...POST, author: null, authorUserId: null }, apiUrl: API_URL }).author).toBeNull();
  });

  it('reads an unknown stored locale as Russian', () => {
    expect(toBlogPostSummary({ post: { ...POST, locale: 'de' }, apiUrl: API_URL }).locale).toBe('ru');
  });
});

describe('toBlogPostView', () => {
  it('builds the table of contents from the body headings', () => {
    expect(toBlogPostView({ post: POST, apiUrl: API_URL }).toc.map(({ text }) => text)).toEqual(['Баланс', 'ИС-7']);
  });
});

describe('toBlogEditorPostView', () => {
  it('exposes the raw cover fields the editor writes back', () => {
    const view = toBlogEditorPostView({ post: POST, apiUrl: API_URL });

    expect({ coverKey: view.coverKey, coverUrl: view.coverUrl }).toEqual({ coverKey: POST.coverKey, coverUrl: POST.coverUrl });
  });
});
