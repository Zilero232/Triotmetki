import { describe, expect, it } from 'vitest';

import { MOD_DEVICE } from '../../../config';
import { newDeviceId } from '../../device-secret';
import { modDeviceTracker } from '../device-tracker';

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
