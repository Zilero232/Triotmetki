import type { Prisma } from '../../../../../generated';
import type { SETTINGS_TABLE_SELECT } from './settings-table.selects';

export type SettingsTableProfileRow = Prisma.StreamerProfileGetPayload<{ select: typeof SETTINGS_TABLE_SELECT }>;
