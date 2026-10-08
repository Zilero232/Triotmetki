import { z } from 'zod';

import type { PLUS_LIMITS } from './plus.constants';

import { isoDateTimeSchema } from '../common/primitives/primitives.schemas';
import { PLUS_FEATURES, PLUS_STATES } from './plus.constants';

export const plusFeatureSchema = z.enum(PLUS_FEATURES);

export const plusStateKindSchema = z.enum(PLUS_STATES);

export const plusLimitKeySchema = z.enum([
  'linkedAccounts',
  'goals',
  'watchedTanks',
  'watchedPlayers',
  'overlays',
  'storedReplays',
  'streamerFollows',
  'historyDays'
] satisfies (keyof typeof PLUS_LIMITS)[]);

export const plusStateSchema = z.object({
  state: plusStateKindSchema,
  periodEnd: isoDateTimeSchema.nullable(),
  graceEndsAt: isoDateTimeSchema.nullable(),
  trialAvailable: z.boolean(),
  trialDays: z.number().int().positive()
});
