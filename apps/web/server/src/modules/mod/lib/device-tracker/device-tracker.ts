import { DEFAULT_IPV6_SUBNET_PREFIX, normalizeIp } from '@nestjs/throttler';

import type { TrackedRequest } from './device-tracker.types';

import { MOD_DEVICE } from '../../config';

export const modDeviceTracker = ({ ip, headers }: TrackedRequest): string => {
  const device = headers?.[MOD_DEVICE.header];

  if (typeof device === 'string' && MOD_DEVICE.idPattern.test(device)) {
    return `${MOD_DEVICE.trackerPrefix}${device}`;
  }

  return normalizeIp(ip ?? '', DEFAULT_IPV6_SUBNET_PREFIX);
};

export const isModDeviceRequest = ({ headers }: TrackedRequest): boolean => headers?.[MOD_DEVICE.header] !== undefined;
