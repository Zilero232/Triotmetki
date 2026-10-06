import { DEFAULT_IPV6_SUBNET_PREFIX, normalizeIp } from '@nestjs/throttler';

import type { TrackedRequest } from './device-tracker.types';

import { MOD_DEVICE } from '../../config/device.constants';

export const modDeviceTracker = ({ ip, headers }: TrackedRequest): string => {
  const address = normalizeIp(ip ?? '', DEFAULT_IPV6_SUBNET_PREFIX);
  const device = headers?.[MOD_DEVICE.header];

  if (typeof device === 'string' && MOD_DEVICE.idPattern.test(device)) {
    return `${MOD_DEVICE.trackerPrefix}${device}:${address}`;
  }

  return address;
};

export const isModDeviceRequest = ({ headers }: TrackedRequest): boolean => headers?.[MOD_DEVICE.header] !== undefined;
