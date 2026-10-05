import { z } from 'zod';

import { countSchema, httpUrlSchema, isoDateTimeSchema, uuidSchema } from '../common/primitives/primitives.schemas';
import { modDeviceIdSchema } from '../mod/mod.schemas';
import { STREAMER_SETTINGS, STREAMER_SETTINGS_APPLICABLE } from './streamer-settings.constants';

const text = z.string().trim().min(1).max(STREAMER_SETTINGS.textMax);
const sensitivity = z.number().min(STREAMER_SETTINGS.sensitivity.min).max(STREAMER_SETTINGS.sensitivity.max);
const volume = z.number().int().min(0).max(100);

export const settingsGroupKeySchema = z.enum(STREAMER_SETTINGS.groups);
export const settingsSourceSchema = z.enum(STREAMER_SETTINGS.sources);
export const graphicsOptionSchema = z.enum(STREAMER_SETTINGS.graphicsOptions);
export const zoomStepSchema = z.enum(STREAMER_SETTINGS.zoomSteps);
export const markerFieldSchema = z.enum(STREAMER_SETTINGS.markerFields);
export const settingsCohortSchema = z.enum(STREAMER_SETTINGS.cohorts);
export const applicableGroupSchema = z.enum(STREAMER_SETTINGS_APPLICABLE);

export const settingsProvenanceSchema = z.object({
  source: settingsSourceSchema,
  sourceUrl: httpUrlSchema.nullable(),
  checkedAt: isoDateTimeSchema
});

export const displayValuesSchema = z.object({
  resolution: z
    .string()
    .regex(/^\d{3,5}x\d{3,5}$/)
    .optional(),
  refreshRate: z.number().int().min(30).max(540).optional(),
  windowMode: z.enum(STREAMER_SETTINGS.windowModes).optional(),
  client: z.enum(STREAMER_SETTINGS.clients).optional(),
  preset: z.enum(STREAMER_SETTINGS.presets).optional(),
  overrides: z.partialRecord(graphicsOptionSchema, text).optional(),
  fpsCap: z.number().int().min(0).max(1000).optional(),
  vsync: z.boolean().optional(),
  tripleBuffering: z.boolean().optional()
});

export const cameraValuesSchema = z.object({
  fov: z.number().int().min(STREAMER_SETTINGS.fov.min).max(STREAMER_SETTINGS.fov.max).optional(),
  dynamicFov: z
    .tuple([z.number().int().min(STREAMER_SETTINGS.fov.min), z.number().int().max(STREAMER_SETTINGS.fov.max)])
    .nullable()
    .optional(),
  postMortem: z.boolean().optional(),
  sniperDynamicCamera: z.boolean().optional(),
  horizontalStabilisation: z.boolean().optional()
});

export const controlsValuesSchema = z.object({
  sensitivity: z.object({ arcade: sensitivity.optional(), sniper: sensitivity.optional(), artillery: sensitivity.optional() }).optional(),
  invert: z.boolean().optional(),
  notableBinds: z
    .record(text, text)
    .refine((binds) => Object.keys(binds).length <= STREAMER_SETTINGS.maxNotableBinds, {
      message: `At most ${STREAMER_SETTINGS.maxNotableBinds} binds`
    })
    .optional()
});

export const zoomValuesSchema = z.object({
  steps: z.array(zoomStepSchema).max(STREAMER_SETTINGS.zoomSteps.length).optional()
});

const sightModeSchema = z.object({
  reticle: text.optional(),
  gunMarker: z.enum(STREAMER_SETTINGS.gunMarkers).optional(),
  colour: text.optional()
});

export const sightValuesSchema = z.object({
  arcade: sightModeSchema.optional(),
  sniper: sightModeSchema.optional()
});

const markerFieldsSchema = z.array(markerFieldSchema).max(STREAMER_SETTINGS.markerFields.length);
const markerSetSchema = z.object({ base: markerFieldsSchema.optional(), alt: markerFieldsSchema.optional() });

export const markersValuesSchema = z.object({
  enemy: markerSetSchema.optional(),
  ally: markerSetSchema.optional(),
  destroyed: markerSetSchema.optional()
});

export const minimapValuesSchema = z.object({
  size: z.number().int().min(0).max(10).optional(),
  transparency: volume.optional(),
  viewRangeCircles: z.boolean().optional(),
  drawRangeCircle: z.boolean().optional(),
  spgFireSector: z.boolean().optional()
});

export const soundValuesSchema = z.object({
  master: volume.optional(),
  music: volume.optional(),
  effects: volume.optional(),
  voice: volume.optional(),
  sixthSenseSound: text.optional(),
  voicePack: text.optional()
});

export const battleUiValuesSchema = z.object({
  damagePanel: text.optional(),
  damageLog: z.boolean().optional(),
  efficiencyRibbons: z.boolean().optional(),
  sixthSenseIcon: text.optional()
});

export const hardwareValuesSchema = z.object({
  cpu: text.optional(),
  gpu: text.optional(),
  ramGb: z.number().int().min(1).max(1024).optional(),
  monitor: text.optional(),
  mouse: text.optional(),
  mouseDpi: z.number().int().min(100).max(50_000).optional(),
  pollingHz: z.number().int().min(100).max(8000).optional(),
  pad: text.optional(),
  keyboard: text.optional(),
  headset: text.optional()
});

export const modsValuesSchema = z.object({
  kind: z.enum(STREAMER_SETTINGS.modsKinds).optional(),
  preset: text.optional()
});

export const settingsValuesSchema = z.object({
  display: displayValuesSchema.optional(),
  camera: cameraValuesSchema.optional(),
  controls: controlsValuesSchema.optional(),
  zoom: zoomValuesSchema.optional(),
  sight: sightValuesSchema.optional(),
  markers: markersValuesSchema.optional(),
  minimap: minimapValuesSchema.optional(),
  sound: soundValuesSchema.optional(),
  battleUi: battleUiValuesSchema.optional(),
  hardware: hardwareValuesSchema.optional(),
  mods: modsValuesSchema.optional()
});

export const streamerSettingsSchema = z.object({
  display: displayValuesSchema.extend(settingsProvenanceSchema.shape).optional(),
  camera: cameraValuesSchema.extend(settingsProvenanceSchema.shape).optional(),
  controls: controlsValuesSchema.extend(settingsProvenanceSchema.shape).optional(),
  zoom: zoomValuesSchema.extend(settingsProvenanceSchema.shape).optional(),
  sight: sightValuesSchema.extend(settingsProvenanceSchema.shape).optional(),
  markers: markersValuesSchema.extend(settingsProvenanceSchema.shape).optional(),
  minimap: minimapValuesSchema.extend(settingsProvenanceSchema.shape).optional(),
  sound: soundValuesSchema.extend(settingsProvenanceSchema.shape).optional(),
  battleUi: battleUiValuesSchema.extend(settingsProvenanceSchema.shape).optional(),
  hardware: hardwareValuesSchema.extend(settingsProvenanceSchema.shape).optional(),
  mods: modsValuesSchema.extend(settingsProvenanceSchema.shape).optional()
});

export const saveStreamerSettingsSchema = z.object({
  source: z.enum(['creator', 'preferences']).default('creator'),
  values: settingsValuesSchema,
  sourceUrls: z.partialRecord(settingsGroupKeySchema, httpUrlSchema).optional()
});

export const streamerSettingsViewSchema = z.object({
  slug: z.string(),
  displayName: z.string(),
  kind: z.enum(['claimed', 'editorial']),
  settings: streamerSettingsSchema,
  updatedAt: isoDateTimeSchema.nullable()
});

export const settingsHistoryEntrySchema = z.object({
  id: uuidSchema,
  source: settingsSourceSchema,
  changedGroups: z.array(settingsGroupKeySchema),
  createdAt: isoDateTimeSchema
});

export const settingsHistorySchema = z.array(settingsHistoryEntrySchema);

export const settingsTableRowSchema = z.object({
  slug: z.string(),
  displayName: z.string(),
  isLive: z.boolean(),
  sniperSensitivity: z.number().nullable(),
  fov: z.number().int().nullable(),
  preset: z.string().nullable(),
  zoomMax: zoomStepSchema.nullable(),
  modsKind: z.string().nullable(),
  gpu: z.string().nullable(),
  updatedAt: isoDateTimeSchema
});

export const settingsTableSchema = z.array(settingsTableRowSchema);

export const settingsCompareQuerySchema = z.object({
  slugs: z
    .string()
    .transform((raw) => [...new Set(raw.split(',').map((slug) => slug.trim().toLowerCase()))].filter(Boolean))
    .pipe(z.array(z.string().min(1).max(32)).min(1).max(STREAMER_SETTINGS.compareMax))
});

export const settingsCompareSchema = z.array(streamerSettingsViewSchema);

export const aggregateBucketSchema = z.object({ bucket: z.string(), count: countSchema });

export const aggregateFieldSchema = z.object({
  field: z.string(),
  kind: z.enum(['numeric', 'categorical']),
  contributors: countSchema,
  median: z.number().nullable(),
  buckets: z.array(aggregateBucketSchema)
});

export const settingsAggregatesQuerySchema = z.object({
  cohort: settingsCohortSchema.default('creators')
});

export const settingsAggregatesSchema = z.object({
  cohort: settingsCohortSchema,
  minCohort: z.number().int().positive(),
  computedAt: isoDateTimeSchema.nullable(),
  fields: z.array(aggregateFieldSchema)
});

export const createApplyRequestSchema = z.object({
  slug: z.string().min(1).max(32),
  groups: z
    .array(applicableGroupSchema)
    .min(1)
    .max(STREAMER_SETTINGS_APPLICABLE.length)
    .transform((groups) => [...new Set(groups)]),
  includeResolution: z.boolean().default(false),
  includeSensitivity: z.boolean().default(false),
  deviceId: uuidSchema.optional()
});

export const applyRequestSchema = z.object({
  id: uuidSchema,
  slug: z.string(),
  groups: z.array(applicableGroupSchema),
  status: z.enum(STREAMER_SETTINGS.applyStatuses),
  createdAt: isoDateTimeSchema,
  appliedAt: isoDateTimeSchema.nullable()
});

export const settingsShareSchema = z.object({
  anonymousStats: z.boolean(),
  values: settingsValuesSchema,
  updatedAt: isoDateTimeSchema
});

export const updateSettingsShareSchema = z.object({
  anonymousStats: z.boolean()
});

export const modSettingsExportSchema = z.object({
  device_id: modDeviceIdSchema,
  account_id: z.number().int().positive(),
  mod_version: z.string().max(32),
  target: z.enum(STREAMER_SETTINGS.applyTargets),
  anonymous_stats: z.boolean(),
  settings: settingsValuesSchema.omit({ hardware: true, mods: true })
});

export const modDeviceRequestSchema = z.object({
  device_id: modDeviceIdSchema,
  account_id: z.number().int().positive()
});

export const modApplyItemSchema = z.object({
  id: uuidSchema,
  profile_slug: z.string(),
  groups: z.array(applicableGroupSchema),
  settings: settingsValuesSchema.omit({ hardware: true, mods: true })
});

export const modApplyListSchema = z.object({ requests: z.array(modApplyItemSchema) });

export const modApplyResultSchema = modDeviceRequestSchema.extend({
  status: z.enum(['applied', 'rejected'])
});
