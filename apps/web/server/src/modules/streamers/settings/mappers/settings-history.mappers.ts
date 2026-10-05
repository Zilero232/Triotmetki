import type { SettingsHistoryEntry } from '@otmetki/schemas';

import { settingsGroupKeySchema, settingsSourceSchema } from '@otmetki/schemas';

import type { SettingsVersionRow } from './settings-history.types';

export const toSettingsHistoryEntry = (version: SettingsVersionRow): SettingsHistoryEntry => ({
  id: version.id,
  source: settingsSourceSchema.parse(version.source),
  changedGroups: version.changedGroups.flatMap((group) => {
    const parsed = settingsGroupKeySchema.safeParse(group);

    return parsed.success ? [parsed.data] : [];
  }),
  createdAt: version.createdAt.toISOString()
});
