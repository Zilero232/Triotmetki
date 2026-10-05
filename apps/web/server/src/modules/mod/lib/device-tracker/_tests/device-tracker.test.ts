import { describe, expect, it } from 'vitest';

import { MOD_DEVICE } from '../../../config/device.constants';
import { newDeviceId } from '../../device-secret';
import { isModDeviceRequest, modDeviceTracker } from '../device-tracker';

const ip = '198.51.100.7';

describe('modDeviceTracker', () => {
  it('gives two devices behind one carrier-grade NAT address their own buckets', () => {
    const first = modDeviceTracker({ ip, headers: { [MOD_DEVICE.header]: newDeviceId() } });
    const second = modDeviceTracker({ ip, headers: { [MOD_DEVICE.header]: newDeviceId() } });

    expect(first).not.toBe(second);
  });

  it('falls back to the address when the device header is missing or malformed', () => {
    const bare = modDeviceTracker({ ip, headers: {} });

    expect(modDeviceTracker({ ip, headers: { [MOD_DEVICE.header]: 'dev_<script>' } })).toBe(bare);
    expect(modDeviceTracker({ ip, headers: { [MOD_DEVICE.header]: `${newDeviceId()}x` } })).toBe(bare);
  });
});

describe('isModDeviceRequest', () => {
  it('puts a request that names any device, even a forged one, under the address throttle', () => {
    expect(isModDeviceRequest({ ip, headers: { [MOD_DEVICE.header]: `${newDeviceId()}x` } })).toBe(true);
  });

  it('leaves a request without a device header to the default throttle alone', () => {
    expect(isModDeviceRequest({ ip, headers: {} })).toBe(false);
  });
});
