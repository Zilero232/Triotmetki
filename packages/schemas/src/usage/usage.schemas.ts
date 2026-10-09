import * as z from 'zod';

import type { USAGE_METERS } from './usage.constants';

import { countSchema, isoDateTimeSchema } from '../common/primitives/primitives.schemas';
import { plusFeatureSchema } from '../plus/plus.schemas';
import { USAGE_AUDIENCES, USAGE_METER_KEYS } from './usage.constants';

export const usageMeterKeySchema = z.enum(USAGE_METER_KEYS satisfies readonly (keyof typeof USAGE_METERS)[]);

export const usageAudienceSchema = z.enum(USAGE_AUDIENCES);

export const usageMeterStateSchema = z.object({
  meter: usageMeterKeySchema,
  feature: plusFeatureSchema,
  limit: countSchema.nullable().describe('Uses per calendar month; null means unlimited'),
  used: countSchema,
  remaining: countSchema.nullable().describe('Uses left this month; null means unlimited')
});

export const usageSchema = z.object({
  audience: usageAudienceSchema,
  resetsAt: isoDateTimeSchema.describe('Start of the next calendar month, Moscow time'),
  meters: z.array(usageMeterStateSchema)
});
