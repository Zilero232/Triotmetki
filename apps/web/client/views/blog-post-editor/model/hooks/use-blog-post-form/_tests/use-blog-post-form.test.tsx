import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import type { BlogEditorPost } from '@/entities/blog/post';

import { messages } from '@/shared/i18n';
import { updateBlogPost } from '@/views/blog-post-editor/api/posts/posts';

import { useBlogPostForm } from '../use-blog-post-form';

vi.mock('@/shared/i18n/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

vi.mock('@/views/blog-post-editor/api/posts/posts', () => ({
  createBlogPost: vi.fn(),
  updateBlogPost: vi.fn(() => new Promise(() => undefined)),
  uploadBlogImage: vi.fn(),
  getEditorPost: vi.fn()
}));

const PUBLISHED: BlogEditorPost = {
  id: 'post-1',
  slug: 'patch-1-45',
  locale: 'ru',
  title: 'Patch 1.45 overview',
  excerpt: 'Everything that changed in the latest update, in one place.',
  cover: null,
  category: 'patches',
  tags: [],
  author: null,
  readingMinutes: 3,
  isFeatured: false,
  publishedAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  body: 'A long enough body for the article so that the form schema accepts it as valid input text.',
  toc: [],
  seoTitle: null,
  seoDescription: null,
  status: 'published',
  createdAt: '2026-10-01T00:00:00.000Z',
  coverKey: null,
  coverUrl: null
};

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>
    <NextIntlClientProvider locale='en' messages={messages.en} timeZone='UTC'>
      {children}
    </NextIntlClientProvider>
  </QueryClientProvider>
);

describe('useBlogPostForm', () => {
  it('asks before taking a published article back to drafts', () => {
    const { result } = renderHook(() => useBlogPostForm(PUBLISHED), { wrapper });

    act(() => {
      result.current.onSaveDraft();
    });

    expect(result.current.isUnpublishOpen).toBe(true);
    expect(updateBlogPost).not.toHaveBeenCalled();
  });
});
