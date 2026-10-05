import type { z } from 'zod';

import type {
  aggregateFieldSchema,
  applicableGroupSchema,
  applyRequestSchema,
  createApplyRequestSchema,
  modApplyListSchema,
  modDeviceRequestSchema,
  modSettingsExportSchema,
  saveStreamerSettingsSchema,
  settingsAggregatesSchema,
  settingsCohortSchema,
  settingsGroupKeySchema,
  settingsHistoryEntrySchema,
  settingsProvenanceSchema,
  settingsShareSchema,
  settingsSourceSchema,
  settingsTableRowSchema,
  settingsValuesSchema,
  streamerSettingsSchema,
  streamerSettingsViewSchema
} from './streamer-settings.schemas';

export type SettingsGroupKey = z.infer<typeof settingsGroupKeySchema>;
export type ApplicableGroup = z.infer<typeof applicableGroupSchema>;
export type SettingsSource = z.infer<typeof settingsSourceSchema>;
export type SettingsProvenance = z.infer<typeof settingsProvenanceSchema>;
export type SettingsCohort = z.infer<typeof settingsCohortSchema>;
export type SettingsValues = z.infer<typeof settingsValuesSchema>;
export type StreamerSettings = z.infer<typeof streamerSettingsSchema>;
export type SaveStreamerSettingsInput = z.input<typeof saveStreamerSettingsSchema>;
export type StreamerSettingsView = z.infer<typeof streamerSettingsViewSchema>;
export type SettingsHistoryEntry = z.infer<typeof settingsHistoryEntrySchema>;
export type SettingsTableRow = z.infer<typeof settingsTableRowSchema>;
export type AggregateField = z.infer<typeof aggregateFieldSchema>;
export type SettingsAggregates = z.infer<typeof settingsAggregatesSchema>;
export type CreateApplyRequestInput = z.input<typeof createApplyRequestSchema>;
export type ApplyRequest = z.infer<typeof applyRequestSchema>;
export type SettingsShare = z.infer<typeof settingsShareSchema>;
export type ModSettingsExport = z.infer<typeof modSettingsExportSchema>;
export type ModDeviceRequest = z.infer<typeof modDeviceRequestSchema>;
export type ModApplyList = z.infer<typeof modApplyListSchema>;
export type FlatValue = boolean | number | string | null;

export type FlatSettings = Record<string, FlatValue>;

export type SettingsDiffRow = {
  field: string;
  values: FlatValue[];
  differs: boolean;
};

export type ApplyValuesInput = {
  values: SettingsValues;
  groups: readonly ApplicableGroup[];
  includeResolution: boolean;
  includeSensitivity: boolean;
};

export type ChangedGroupsInput = {
  previous: SettingsValues | StreamerSettings | null;
  next: SettingsValues | StreamerSettings;
};

export type FlattenInput = {
  value: unknown;
  prefix: string;
  target: FlatSettings;
};
