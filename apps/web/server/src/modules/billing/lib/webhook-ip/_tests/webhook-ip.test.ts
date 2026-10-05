import { describe, expect, it } from 'vitest';

import { YOOKASSA_CIDRS } from '../../../config/webhook.constants';
import { buildAllowList, isAllowedIp } from '../webhook-ip';

const list = buildAllowList(YOOKASSA_CIDRS);

describe('isAllowedIp', () => {
  it('accepts addresses inside the YooKassa ranges, including IPv4-mapped IPv6', () => {
    expect(isAllowedIp({ list, ip: '185.71.76.5' })).toBe(true);
    expect(isAllowedIp({ list, ip: '::ffff:77.75.156.11' })).toBe(true);
    expect(isAllowedIp({ list, ip: '2a02:5180::1' })).toBe(true);
  });

  it('rejects addresses just outside a range', () => {
    expect(isAllowedIp({ list, ip: '185.71.76.32' })).toBe(false);
    expect(isAllowedIp({ list, ip: '77.75.156.12' })).toBe(false);
  });

  it('rejects loopback unless it is explicitly allowed', () => {
    expect(isAllowedIp({ list, ip: '127.0.0.1' })).toBe(false);
    expect(isAllowedIp({ list: buildAllowList(['127.0.0.1/32']), ip: '127.0.0.1' })).toBe(true);
  });

  it('rejects garbage', () => {
    expect(isAllowedIp({ list, ip: '' })).toBe(false);
    expect(isAllowedIp({ list, ip: 'yookassa.ru' })).toBe(false);
  });
});
