import type { ApplicableGroup, CreateApplyRequestInput, StreamerSettings } from '@otmetki/schemas';

import { STREAMER_SETTINGS_APPLICABLE, STREAMER_SETTINGS_HARDWARE_SPECIFIC } from '@otmetki/schemas';

import { settingsRows } from '@/entities/streamer/settings';

import type { HardwareOptions, HardwareOptionsInput, HasAnyInput, ToApplyRequestInput } from './apply-form.types';

export const applicableGroups = (settings: StreamerSettings): ApplicableGroup[] =>
  STREAMER_SETTINGS_APPLICABLE.filter((group) => settingsRows({ settings, group }).length > 0);

const hasAny = ({ group, keys }: HasAnyInput): boolean => keys.some((key) => group?.[key] !== undefined && group[key] !== null);

export const hardwareOptions = ({ settings, groups }: HardwareOptionsInput): HardwareOptions => ({
  hasResolution: groups.includes('display') && hasAny({ group: settings.display, keys: STREAMER_SETTINGS_HARDWARE_SPECIFIC.display }),
  hasSensitivity: groups.includes('controls') && hasAny({ group: settings.controls, keys: STREAMER_SETTINGS_HARDWARE_SPECIFIC.controls })
});

export const toApplyRequest = ({ slug, values, options }: ToApplyRequestInput): CreateApplyRequestInput => ({
  slug,
  groups: values.groups,
  includeResolution: options.hasResolution && values.includeResolution,
  includeSensitivity: options.hasSensitivity && values.includeSensitivity
});
