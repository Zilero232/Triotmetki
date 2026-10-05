import type { BlogEditorPost, BlogPostSummary, BlogPostView } from '@otmetki/schemas';

import { isIncludedIn } from 'remeda';

import type { ToBlogPostViewInput } from './blog-post-view.types';

import { toIso } from '../../../common/lib';
import { toAuthorView } from '../../community-core';
import { BLOG } from '../config/blog.constants';
import { outlineArticle } from '../lib/article-outline/article-outline';
import { blogCoverUrl } from '../lib/image-url/image-url';

export const toBlogPostSummary = ({ post, apiUrl }: ToBlogPostViewInput): BlogPostSummary => ({
  id: post.id,
  slug: post.slug,
  locale: isIncludedIn(post.locale, BLOG.locales) ? post.locale : BLOG.defaultLocale,
  title: post.title,
  excerpt: post.excerpt,
  cover: blogCoverUrl({ post, apiUrl }),
  category: post.category,
  tags: post.tags,
  author: post.author ? toAuthorView(post.author) : null,
  readingMinutes: post.readingMinutes,
  isFeatured: post.isFeatured,
  publishedAt: toIso(post.publishedAt),
  updatedAt: post.updatedAt.toISOString()
});

export const toBlogPostView = ({ post, apiUrl }: ToBlogPostViewInput): BlogPostView => ({
  ...toBlogPostSummary({ post, apiUrl }),
  body: post.body,
  toc: outlineArticle(post.body).toc,
  seoTitle: post.seoTitle,
  seoDescription: post.seoDescription,
  status: post.status,
  createdAt: post.createdAt.toISOString()
});

export const toBlogEditorPostView = ({ post, apiUrl }: ToBlogPostViewInput): BlogEditorPost => ({
  ...toBlogPostView({ post, apiUrl }),
  coverKey: post.coverKey,
  coverUrl: post.coverUrl
});
