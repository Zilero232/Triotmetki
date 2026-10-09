import * as z from 'zod';

import { plusFeatureSchema, plusLimitKeySchema } from '../plus/plus.schemas';
import { API_ERROR_CODES } from './errors.constants';

export const apiErrorCodeSchema = z.enum(API_ERROR_CODES);

export const apiErrorIssueSchema = z.object({
  path: z.array(z.union([z.string(), z.number()])),
  message: z.string()
});

export const apiErrorDetailsSchema = z.object({
  feature: plusFeatureSchema.optional(),
  limitKey: plusLimitKeySchema.optional(),
  limit: z.number().int().nonnegative().optional()
});

export const apiErrorSchema = z.object({
  error: z.string(),
  code: apiErrorCodeSchema.catch('INTERNAL_ERROR'),
  issues: z.array(apiErrorIssueSchema).optional(),
  retryAfterSec: z.number().int().positive().optional(),
  details: apiErrorDetailsSchema.optional()
});
