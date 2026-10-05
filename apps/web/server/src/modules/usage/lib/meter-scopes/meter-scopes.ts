import type { UsageMeterKey, UsageMeterState } from '@otmetki/schemas';

import { USAGE_METERS, usageLimit } from '@otmetki/schemas';

import type { CountKeyInput, MeterScope, MeterScopesInput, MeterStateInput, SeenKeyInput } from './meter-scopes.types';

import { USAGE_METER } from '../../config/usage-meter.constants';

const anonymousScopes = ({ meter, actor }: Omit<MeterScopesInput, 'audience'>): MeterScope[] => {
  const limit = usageLimit({ meter, audience: 'anonymous' }) ?? 0;

  return [
    ...(actor.deviceId ? [{ id: `device:${actor.deviceId}`, limit }] : []),
    ...(actor.ipHash ? [{ id: `ip:${actor.ipHash}`, limit: limit * USAGE_METER.anonymousIpFactor }] : [])
  ];
};

export const meterScopes = ({ meter, audience, actor }: MeterScopesInput): MeterScope[] => {
  if (audience === 'anonymous') {
    return anonymousScopes({ meter, actor });
  }

  const limit = usageLimit({ meter, audience });

  return actor.userId && limit !== null ? [{ id: `user:${actor.userId}`, limit }] : [];
};

export const unlimitedMeterState = (meter: UsageMeterKey): UsageMeterState => ({
  meter,
  feature: USAGE_METERS[meter].feature,
  limit: null,
  used: 0,
  remaining: null
});

export const meterState = ({ meter, scopes, counts }: MeterStateInput): UsageMeterState => {
  const [owner] = scopes;
  const remaining = scopes.map((scope, index) => Math.max(0, scope.limit - (counts[index] ?? 0)));

  return {
    meter,
    feature: USAGE_METERS[meter].feature,
    limit: owner?.limit ?? 0,
    used: Math.min(counts[0] ?? 0, owner?.limit ?? 0),
    remaining: remaining.length > 0 ? Math.min(...remaining) : 0
  };
};

export const countKey = ({ meter, period, scope }: CountKeyInput): string => `${USAGE_METER.keyPrefix}:count:${meter}:${period}:${scope}`;

export const seenKey = ({ meter, period, scope, subject }: SeenKeyInput): string =>
  `${USAGE_METER.keyPrefix}:seen:${meter}:${period}:${scope}:${subject}`;
