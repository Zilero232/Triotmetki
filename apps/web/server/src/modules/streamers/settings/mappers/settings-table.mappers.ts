import type { SettingsTableRow } from '@otmetki/schemas';

import { streamerSettingsSchema, zoomMax } from '@otmetki/schemas';

import type { SettingsTableProfileRow } from '../selects/settings-table.types';

export const toSettingsTableRow = (row: SettingsTableProfileRow): SettingsTableRow | null => {
  const parsed = streamerSettingsSchema.safeParse(row.settings);

  if (!parsed.success || !row.settingsUpdatedAt) {
    return null;
  }

  const values = parsed.data;

  return {
    slug: row.slug,
    displayName: row.displayName,
    isLive: row.isLive,
    sniperSensitivity: values.controls?.sensitivity?.sniper ?? null,
    fov: values.camera?.fov ?? null,
    preset: values.display?.preset ?? null,
    zoomMax: zoomMax(values.zoom?.steps),
    modsKind: values.mods?.kind ?? null,
    gpu: values.hardware?.gpu ?? null,
    updatedAt: row.settingsUpdatedAt.toISOString()
  };
};
