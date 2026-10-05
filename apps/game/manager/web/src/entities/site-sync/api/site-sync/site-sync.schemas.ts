import { z } from 'zod';

import { SITE_SYNC } from '../../config';

const localSyncSchema = z.object({
  syncedAt: z.number().nullable(),
  pending: z.number().int().nonnegative()
});

export const syncStatusSchema = z.object({
  linked: z.boolean(),
  sets: localSyncSchema,
  profiles: localSyncSchema.nullable()
});

const syncOutcomeSchema = z.enum(SITE_SYNC.outcomes);

export const syncResolutionSchema = z.enum(SITE_SYNC.resolutions);

const librarySyncSchema = z.object({
  outcome: syncOutcomeSchema,
  local: z.number().int().nonnegative(),
  remote: z.number().int().nonnegative(),
  localChanges: z.number().int().nonnegative(),
  remoteChanges: z.number().int().nonnegative()
});

export const syncReportSchema = z.object({
  sets: librarySyncSchema,
  profiles: librarySyncSchema.nullable()
});
