import { accountIdSchema, countSchema, isoDateTimeSchema, percentSchema, rngBucketSchema } from '@otmetki/schemas';
import { z } from 'zod';

import { RNG_PERIODS } from '../config/aggregate.constants';

export const rngPeriodSchema = z.enum(RNG_PERIODS);

export const rngLuckSchema = z.enum(['lucky', 'even', 'unlucky', 'unknown']);

export const rngQuerySchema = z.object({
  period: rngPeriodSchema.default('d30')
});

export const rngSummarySchema = z.object({
  battles: countSchema,
  players: countSchema,
  shots: countSchema,
  meanRoll: z.number().nullable(),
  withinSpread: percentSchema.nullable(),
  buckets: z.array(rngBucketSchema),
  hitRate: percentSchema.nullable(),
  penRate: percentSchema.nullable()
});

const rngTierRowSchema = rngSummarySchema.extend({ tier: z.number().int().min(1).max(11) });

const rngShellRowSchema = rngSummarySchema.extend({ shell: z.string() });

export const honestRngSchema = z.object({
  period: rngPeriodSchema,
  spread: z.number(),
  server: rngSummarySchema.nullable(),
  theory: z.array(rngBucketSchema),
  tiers: z.array(rngTierRowSchema),
  shells: z.array(rngShellRowSchema),
  computedAt: isoDateTimeSchema.nullable()
});

export const honestRngMineSchema = z.object({
  period: rngPeriodSchema,
  accountId: accountIdSchema,
  summary: rngSummarySchema,
  luck: rngLuckSchema,
  serverMeanRoll: z.number().nullable(),
  deltaVsServer: z.number().nullable()
});
