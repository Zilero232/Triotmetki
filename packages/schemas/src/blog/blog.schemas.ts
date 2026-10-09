import * as z from 'zod';

import { countSchema, isoDateTimeSchema, uuidSchema } from '../common/primitives/primitives.schemas';
import { paginatedSchema } from '../common/query/query.schemas';
import { authorSchema } from '../community/community.schemas';
import { BLOG_CONTRACT } from './blog.constants';

const imageFilePattern = `[0-9a-f-]{36}\\.(?:${BLOG_CONTRACT.imageExtensions.join('|')})`;

export const blogCategorySchema = z.enum(BLOG_CONTRACT.categories);

export const blogStatusSchema = z.enum(BLOG_CONTRACT.statuses);

export const blogLocaleSchema = z.enum(BLOG_CONTRACT.locales);

export const blogImageFileSchema = z.string().regex(new RegExp(`^${imageFilePattern}$`));

export const blogImageKeySchema = z.string().regex(new RegExp(`^${BLOG_CONTRACT.imagePrefix}/${imageFilePattern}$`));

export const blogTocItemSchema = z.object({ id: z.string(), text: z.string(), depth: z.number().int().min(1).max(6) });

export const blogPostSummarySchema = z.object({
  id: uuidSchema,
  slug: z.string(),
  locale: blogLocaleSchema,
  title: z.string(),
  excerpt: z.string(),
  cover: z.url().nullable(),
  category: blogCategorySchema,
  tags: z.array(z.string()),
  author: authorSchema.nullable(),
  readingMinutes: z.number().int().positive(),
  isFeatured: z.boolean(),
  publishedAt: isoDateTimeSchema.nullable(),
  updatedAt: isoDateTimeSchema
});

export const blogPostSchema = blogPostSummarySchema.extend({
  body: z.string(),
  toc: z.array(blogTocItemSchema),
  seoTitle: z.string().nullable(),
  seoDescription: z.string().nullable(),
  status: blogStatusSchema,
  createdAt: isoDateTimeSchema
});

export const blogArticleSchema = z.object({ post: blogPostSchema, related: z.array(blogPostSummarySchema) });

export const blogEditorPostSchema = blogPostSchema.extend({ coverKey: z.string().nullable(), coverUrl: z.string().nullable() });

export const blogEditorPostListSchema = z.array(blogEditorPostSchema);

export const blogPostPageSchema = paginatedSchema(blogPostSummarySchema);

export const blogTagCountSchema = z.object({ tag: z.string(), count: countSchema });

export const blogTagsSchema = z.array(blogTagCountSchema);

export const blogEditorAccessSchema = z.object({ canEdit: z.boolean() });

export const blogImageUploadSchema = z.object({ key: blogImageKeySchema, url: z.url() });
