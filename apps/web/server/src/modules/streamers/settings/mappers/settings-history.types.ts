import type { StreamerSettingsVersion } from '../../../../../generated';

export type SettingsVersionRow = Pick<StreamerSettingsVersion, 'changedGroups' | 'createdAt' | 'id' | 'source'>;
