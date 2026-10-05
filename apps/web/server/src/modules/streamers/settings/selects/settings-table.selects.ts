import type { Prisma } from '../../../../../generated';

export const SETTINGS_TABLE_SELECT = {
  slug: true,
  displayName: true,
  isLive: true,
  settings: true,
  settingsUpdatedAt: true
} as const satisfies Prisma.StreamerProfileSelect;
