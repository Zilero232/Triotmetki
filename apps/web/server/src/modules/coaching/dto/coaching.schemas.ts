import {
  accountIdSchema,
  countSchema,
  httpsUrlSchema,
  isoDateTimeSchema,
  paginatedSchema,
  paginationQuerySchema,
  tankIdSchema,
  uuidSchema
} from '@otmetki/schemas';
import { z } from 'zod';

import { playerStatsSchema } from '../../community-core';
import { COACHING } from '../config/coaching.constants';

export const coachContactsSchema = z.object({
  telegram: httpsUrlSchema.optional(),
  discord: z.string().trim().min(2).max(COACHING.contactMaxLength).optional(),
  vk: httpsUrlSchema.optional(),
  booking: httpsUrlSchema.optional()
});

export const coachOfferSchema = z.object({
  id: uuidSchema,
  title: z.string(),
  description: z.string().nullable(),
  durationMinutes: z.number().int().positive(),
  withReplay: z.boolean(),
  isActive: z.boolean()
});

export const coachSchema = z.object({
  userId: uuidSchema,
  name: z.string(),
  image: z.url().nullable(),
  accountId: accountIdSchema,
  headline: z.string(),
  bio: z.string().nullable(),
  contacts: coachContactsSchema,
  tankIds: z.array(tankIdSchema),
  isActive: z.boolean(),
  rating: z.number().nullable(),
  ordersDone: countSchema,
  stats: playerStatsSchema.nullable(),
  offers: z.array(coachOfferSchema)
});

export const coachesQuerySchema = paginationQuerySchema.extend({
  tankId: tankIdSchema.optional()
});

export const coachPageSchema = paginatedSchema(coachSchema);

export const upsertCoachSchema = z.object({
  accountId: accountIdSchema,
  headline: z.string().trim().min(5).max(140),
  bio: z.string().trim().max(4000).optional(),
  contacts: coachContactsSchema.default({}),
  tankIds: z.array(tankIdSchema).max(30).default([]),
  isActive: z.boolean().optional()
});

const offerFieldsSchema = z.object({
  title: z.string().trim().min(3).max(140),
  description: z.string().trim().max(2000).optional(),
  durationMinutes: z.number().int().min(15).max(600),
  withReplay: z.boolean()
});

export const createOfferSchema = offerFieldsSchema.extend({ withReplay: z.boolean().default(false) });

export const updateOfferSchema = offerFieldsSchema.extend({ isActive: z.boolean() }).partial();

const coachingOrderStatusSchema = z.enum(['requested', 'accepted', 'completed', 'cancelled']);

export const coachingOrderSchema = z.object({
  id: uuidSchema,
  coachUserId: uuidSchema,
  studentUserId: uuidSchema,
  offerId: uuidSchema.nullable(),
  replayId: uuidSchema.nullable(),
  status: coachingOrderStatusSchema,
  notes: z.string().nullable(),
  studentContact: z.string().nullable().describe('Shown to the coach once the request is accepted'),
  review: z.string().nullable(),
  score: z.number().int().min(1).max(5).nullable(),
  createdAt: isoDateTimeSchema,
  completedAt: isoDateTimeSchema.nullable()
});

export const coachingOrderListSchema = z.array(coachingOrderSchema);

export const createOrderSchema = z.object({
  coachUserId: uuidSchema,
  offerId: uuidSchema.optional(),
  replayId: uuidSchema.optional(),
  notes: z.string().trim().max(2000).optional(),
  studentContact: z.string().trim().min(2).max(COACHING.contactMaxLength)
});

export const reviewOrderSchema = z.object({
  score: z.number().int().min(1).max(5),
  review: z.string().trim().max(2000).optional()
});
