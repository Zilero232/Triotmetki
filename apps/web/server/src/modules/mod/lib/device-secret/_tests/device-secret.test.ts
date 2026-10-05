import { describe, expect, it } from 'vitest';

import { MOD_DEVICE } from '../../../config/device.constants';
import { deviceSecret, hashSecret, matchesSecretHash, newDeviceId, normalizeBindCode } from '../device-secret';

describe('deviceSecret', () => {
  it('is deterministic per device and server secret', () => {
    const secret = deviceSecret({ deviceId: 'dev_a', serverSecret: 'k' });

    expect(deviceSecret({ deviceId: 'dev_a', serverSecret: 'k' })).toBe(secret);
    expect(deviceSecret({ deviceId: 'dev_b', serverSecret: 'k' })).not.toBe(secret);
    expect(deviceSecret({ deviceId: 'dev_a', serverSecret: 'other' })).not.toBe(secret);
  });
});

describe('matchesSecretHash', () => {
  it('accepts the secret behind a hash and rejects any other', () => {
    const hash = hashSecret('secret');

    expect(matchesSecretHash({ secret: 'secret', hash })).toBe(true);
    expect(matchesSecretHash({ secret: 'secreT', hash })).toBe(false);
  });
});

describe('newDeviceId', () => {
  it('carries the device prefix and never repeats', () => {
    const id = newDeviceId();

    expect(id.startsWith(MOD_DEVICE.idPrefix)).toBe(true);
    expect(newDeviceId()).not.toBe(id);
  });
});

describe('normalizeBindCode', () => {
  it('drops spaces and dashes and upper-cases the code', () => {
    expect(normalizeBindCode(' ab-c d12 ')).toBe('ABCD12');
  });
});
