import { z } from 'zod';

import { isoDateTimeSchema } from '../common/primitives/primitives.schemas';
import { modDeviceIdSchema, modRatingsRequestSchema } from '../mod/mod.schemas';
import { MOD_SYNC } from './mod-sync.constants';

const byteLength = (value: unknown): number => new TextEncoder().encode(JSON.stringify(value)).byteLength;

const syncTimeSchema = z.number().nonnegative();

const syncIdSchema = z.string().regex(MOD_SYNC.idPattern);

const syncNameSchema = z.string().trim().min(1).max(MOD_SYNC.nameMaxLength);

export const modSyncModeSchema = z.enum(MOD_SYNC.modes);

export const modSyncTombstoneSchema = z.object({
  id: syncIdSchema,
  deleted: syncTimeSchema
});

export const modComponentSetSchema = z.object({
  id: syncIdSchema,
  name: syncNameSchema,
  components: z.array(z.string().max(MOD_SYNC.componentIdMaxLength).regex(MOD_SYNC.componentIdPattern)).max(MOD_SYNC.maxComponents),
  created: syncTimeSchema,
  updated: syncTimeSchema
});

const modProfileDataSchema = z
  .object({
    config: z.record(z.string(), z.unknown()),
    components: z.record(z.string(), z.unknown())
  })
  .refine((data) => byteLength(data) <= MOD_SYNC.maxProfileDataBytes, {
    message: `Profile data must be at most ${MOD_SYNC.maxProfileDataBytes} bytes of JSON`
  });

export const modSyncProfileSchema = z.object({
  id: syncIdSchema,
  name: syncNameSchema,
  created: syncTimeSchema.nullable(),
  updated: syncTimeSchema.nullable(),
  data: modProfileDataSchema
});

const modSyncTombstonesSchema = z.array(modSyncTombstoneSchema).max(MOD_SYNC.maxTombstones);

const librarySchema = {
  deleted: z.array(modSyncTombstoneSchema),
  revision: z.number().int().nonnegative(),
  updated_at: isoDateTimeSchema.nullable()
};

export const modSetsLibrarySchema = z
  .object({ sets: z.array(modComponentSetSchema), ...librarySchema })
  .describe('The component sets the user keeps on the site, their tombstones and the revision of the stored state');

export const modProfilesLibrarySchema = z
  .object({ profiles: z.array(modSyncProfileSchema), ...librarySchema })
  .describe('The settings profiles the user keeps on the site, their tombstones and the revision of the stored state');

export const modSyncLibrariesSchema = z.object({
  sets: modSetsLibrarySchema,
  profiles: modProfilesLibrarySchema
});

export const modSyncReadRequestSchema = z
  .strictObject({
    device_id: modDeviceIdSchema,
    account_id: modRatingsRequestSchema.shape.account_id
  })
  .describe('Signed body of POST /mod/me/sets and /mod/me/profiles: the bound device and its account, nothing else');

export const modSetsWriteRequestSchema = z
  .strictObject({
    device_id: modDeviceIdSchema,
    account_id: modRatingsRequestSchema.shape.account_id,
    sets: z.array(modComponentSetSchema).max(MOD_SYNC.maxSets),
    deleted: modSyncTombstonesSchema,
    mode: modSyncModeSchema
  })
  .describe('Signed body of PUT /mod/me/sets: the local component sets and tombstones, merged by id or replacing the stored ones');

export const modProfilesWriteRequestSchema = z
  .strictObject({
    device_id: modDeviceIdSchema,
    account_id: modRatingsRequestSchema.shape.account_id,
    profiles: z.array(modSyncProfileSchema).max(MOD_SYNC.maxProfiles),
    deleted: modSyncTombstonesSchema,
    mode: modSyncModeSchema
  })
  .describe('Signed body of PUT /mod/me/profiles: the local settings profiles and tombstones, merged by id or replacing the stored ones');
