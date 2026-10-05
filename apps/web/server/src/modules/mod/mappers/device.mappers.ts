import type { ModDevice } from '../../../../generated';
import type { ModDeviceView } from '../mod.types';

import { toIso } from '../../../common/lib';

export const toModDeviceView = (device: ModDevice): ModDeviceView => ({
  id: device.id,
  accountId: device.accountId === null ? null : Number(device.accountId),
  name: device.name,
  modVersion: device.modVersion,
  gameVersion: device.gameVersion,
  lastSeenAt: toIso(device.lastSeenAt),
  revokedAt: toIso(device.revokedAt),
  createdAt: device.createdAt.toISOString()
});
