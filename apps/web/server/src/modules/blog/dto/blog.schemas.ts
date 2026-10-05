import {
  blogCategorySchema,
  blogImageFileSchema,
  blogImageKeySchema,
  blogLocaleSchema,
  blogStatusSchema,
  booleanParam,
  httpsUrlSchema,
  paginationQuerySchema
} from '@otmetki/schemas';
import { z } from 'zod';

import { BlogPostStatus } from '../../../../generated';
import { BLOG, BLOG_POST_LIMITS } from '../config/blog.constants';

const blogTagSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(BLOG_POST_LIMITS.tag.min)
  .max(BLOG_POST_LIMITS.tag.max)
  .regex(/^[\p{L}\p{N}][\p{L}\p{N}-]*$/u);

const blogSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(BLOG.slugMinLength)
  .max(BLOG.slugMaxLength)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const blogPostsQuerySchema = paginationQuerySchema.extend({
  category: blogCategorySchema.optional(),
  tag: blogTagSchema.optional(),
  locale: blogLocaleSchema.optional(),
  isFeatured: booleanParam.optional()
});

export const blogSlugParamsSchema = z.object({ slug: z.string().trim().min(1).max(BLOG.slugMaxLength) });

export const blogImageParamsSchema = z.object({ file: blogImageFileSchema });

const blogPostFieldsSchema = z.object({
  slug: blogSlugSchema.optional(),
  locale: blogLocaleSchema,
  title: z.string().trim().min(BLOG_POST_LIMITS.title.min).max(BLOG_POST_LIMITS.title.max),
  excerpt: z.string().trim().min(BLOG_POST_LIMITS.excerpt.min).max(BLOG_POST_LIMITS.excerpt.max),
  body: z.string().trim().min(BLOG_POST_LIMITS.body.min).max(BLOG_POST_LIMITS.body.max),
  category: blogCategorySchema,
  tags: z
    .array(blogTagSchema)
    .max(BLOG_POST_LIMITS.tags)
    .transform((tags) => [...new Set(tags)]),
  coverKey: blogImageKeySchema.nullable(),
  coverUrl: httpsUrlSchema.nullable(),
  seoTitle: z.string().trim().max(BLOG_POST_LIMITS.seoTitle).nullable(),
  seoDescription: z.string().trim().max(BLOG_POST_LIMITS.seoDescription).nullable(),
  isFeatured: z.boolean(),
  status: blogStatusSchema
});

export const createBlogPostSchema = blogPostFieldsSchema.extend({
  locale: blogLocaleSchema.default(BLOG.defaultLocale),
  tags: blogPostFieldsSchema.shape.tags.default([]),
  coverKey: blogPostFieldsSchema.shape.coverKey.default(null),
  coverUrl: blogPostFieldsSchema.shape.coverUrl.default(null),
  seoTitle: blogPostFieldsSchema.shape.seoTitle.default(null),
  seoDescription: blogPostFieldsSchema.shape.seoDescription.default(null),
  isFeatured: z.boolean().default(false),
  status: blogStatusSchema.default(BlogPostStatus.draft)
});

export const updateBlogPostSchema = blogPostFieldsSchema.partial();
