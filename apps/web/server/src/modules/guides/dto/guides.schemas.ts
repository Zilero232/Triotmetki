import { authorSchema, countSchema, isoDateTimeSchema, paginatedSchema, paginationQuerySchema, tankIdSchema, uuidSchema } from '@otmetki/schemas';
import { z } from 'zod';

import { arenaIdSchema, moderationStatusSchema } from '../../community-core';
import { COMMENTS, GUIDES } from '../config/guides.constants';

const guideKindSchema = z.enum(['tank', 'map', 'general']);

export const guideSchema = z.object({
  id: uuidSchema,
  slug: z.string(),
  kind: guideKindSchema,
  tankId: tankIdSchema.nullable(),
  arenaId: z.string().nullable(),
  locale: z.string(),
  title: z.string(),
  body: z.string(),
  status: moderationStatusSchema,
  likesCount: countSchema,
  likedByMe: z.boolean(),
  author: authorSchema,
  publishedAt: isoDateTimeSchema.nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema
});

export const guidesQuerySchema = paginationQuerySchema.extend({
  kind: guideKindSchema.optional(),
  tankId: tankIdSchema.optional(),
  arenaId: arenaIdSchema.optional(),
  sort: z.enum(['popular', 'recent']).default('recent')
});

export const guidePageSchema = paginatedSchema(guideSchema);

export const guideListSchema = z.array(guideSchema);

const guideLocaleSchema = z.enum(['ru', 'en']);

const guideFieldsSchema = z.object({
  kind: guideKindSchema,
  tankId: tankIdSchema.optional(),
  arenaId: arenaIdSchema.optional(),
  locale: guideLocaleSchema,
  title: z.string().trim().min(5).max(140),
  body: z.string().trim().min(50).max(GUIDES.maxBodyLength)
});

export const createGuideSchema = guideFieldsSchema.extend({ locale: guideLocaleSchema.default('ru') });

export const updateGuideSchema = guideFieldsSchema.partial().extend({
  tankId: tankIdSchema.nullable().optional(),
  arenaId: arenaIdSchema.nullable().optional()
});

export const guideAuthorSchema = z.object({ author: authorSchema, guides: countSchema, likes: countSchema });

export const guideAuthorsSchema = z.array(guideAuthorSchema);

const commentTargetSchema = z.enum(['build', 'guide', 'replay', 'tactic_board']);

export const commentSchema = z.object({
  id: uuidSchema,
  target: commentTargetSchema,
  targetId: z.string(),
  parentId: uuidSchema.nullable(),
  body: z.string(),
  author: authorSchema,
  createdAt: isoDateTimeSchema
});

export const commentsQuerySchema = z.object({
  target: commentTargetSchema,
  targetId: z.string().trim().min(1).max(64)
});

export const commentListSchema = z.array(commentSchema);

export const createCommentSchema = commentsQuerySchema.extend({
  parentId: uuidSchema.optional(),
  body: z.string().trim().min(1).max(COMMENTS.maxBodyLength)
});
