import { describe, expect, it } from 'vitest';

import { USAGE_DEVICE } from '../../../config/usage-device.constants';
import { hashIp, networkOf, readDeviceToken, signDeviceToken } from '../device-token';

const SECRET = 'test-secret';

describe('readDeviceToken', () => {
  it('reads back the device id it signed', () => {
    expect(readDeviceToken({ token: signDeviceToken({ deviceId: 'device-1', secret: SECRET }), secret: SECRET })).toBe('device-1');
  });

  it('refuses a token signed with another secret', () => {
    expect(readDeviceToken({ token: signDeviceToken({ deviceId: 'device-1', secret: 'other' }), secret: SECRET })).toBeNull();
  });

  it('refuses a token whose device id was swapped', () => {
    const [, signature] = signDeviceToken({ deviceId: 'device-1', secret: SECRET }).split(USAGE_DEVICE.separator);

    expect(readDeviceToken({ token: `device-2${USAGE_DEVICE.separator}${signature}`, secret: SECRET })).toBeNull();
  });

  it('refuses a missing, unsigned or over-segmented token', () => {
    expect(readDeviceToken({ token: undefined, secret: SECRET })).toBeNull();
    expect(readDeviceToken({ token: 'device-1', secret: SECRET })).toBeNull();

    expect(
      readDeviceToken({ token: `${signDeviceToken({ deviceId: 'device-1', secret: SECRET })}${USAGE_DEVICE.separator}x`, secret: SECRET })
    ).toBeNull();
  });
});

describe('hashIp', () => {
  it('keeps the same address in the same fixed-length bucket', () => {
    const hashed = hashIp({ ip: '203.0.113.7', secret: SECRET });

    expect(hashed).toBe(hashIp({ ip: '203.0.113.7', secret: SECRET }));
    expect(hashed).toHaveLength(USAGE_DEVICE.ipHashLength);
  });

  it('puts different addresses in different buckets', () => {
    expect(hashIp({ ip: '203.0.113.7', secret: SECRET })).not.toBe(hashIp({ ip: '203.0.113.8', secret: SECRET }));
  });

  it('keeps every address of one IPv6 subscriber network in the same bucket', () => {
    expect(hashIp({ ip: '2001:db8:1:2:aaaa::1', secret: SECRET })).toBe(hashIp({ ip: '2001:db8:1:2:bbbb:cccc:dddd:eeee', secret: SECRET }));
  });

  it('keeps neighbouring IPv6 networks apart', () => {
    expect(hashIp({ ip: '2001:db8:1:2::1', secret: SECRET })).not.toBe(hashIp({ ip: '2001:db8:1:3::1', secret: SECRET }));
  });
});

describe('networkOf', () => {
  it('reads an IPv4-mapped IPv6 address as the IPv4 address it carries', () => {
    expect(networkOf('::ffff:203.0.113.7')).toBe(networkOf('203.0.113.7'));
  });

  it('writes the same IPv6 network the same way however the address is spelled', () => {
    expect(networkOf('2001:0db8:0001:0002::1')).toBe(networkOf('2001:db8:1:2:ffff::'));
  });

  it('keeps an unparsable value as it is', () => {
    expect(networkOf('unknown')).toBe('unknown');
  });
});
