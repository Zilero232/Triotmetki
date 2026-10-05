import type { StreamerSettings, StreamerSettingsView } from '@otmetki/schemas';

import { streamerSettingsSchema } from '@otmetki/schemas';

import type { StreamerProfile } from '../../../../../generated';

import { toIso } from '../../../../common/lib';

export const toSettingsView = (profile: StreamerProfile): StreamerSettingsView => {
  const settings: StreamerSettings = profile.settings === null ? {} : streamerSettingsSchema.parse(profile.settings);

  return {
    slug: profile.slug,
    displayName: profile.displayName,
    kind: profile.kind,
    settings,
    updatedAt: toIso(profile.settingsUpdatedAt)
  };
};
