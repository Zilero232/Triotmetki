import { MOD_REPORTS } from '@otmetki/schemas';
import { describe, expect, it } from 'vitest';

import { hmacSha256Hex } from '../../../../../common/lib';
import { MOD_REPORTS_API } from '../../../config/mod-reports.constants';
import { fitsReportLimits, hashReporter } from '../report-files';

const SECRET = 'secret-for-tests';

describe('fitsReportLimits', () => {
  it('accepts a file exactly at the per-file limit', () => {
    expect(fitsReportLimits([{ name: 'python.log', text: 'a'.repeat(MOD_REPORTS.maxFileTextBytes) }])).toBe(true);
  });

  it('counts UTF-8 bytes, not characters, against the per-file limit', () => {
    expect(fitsReportLimits([{ name: 'python.log', text: 'я'.repeat(MOD_REPORTS.maxFileTextBytes / 2 + 1) }])).toBe(false);
  });

  it('refuses files that each fit but together pass the total limit', () => {
    const half = { name: 'a.log', text: 'a'.repeat(MOD_REPORTS.maxTotalTextBytes / 2) };

    expect(fitsReportLimits([half, half])).toBe(true);
    expect(fitsReportLimits([half, half, { name: 'b.log', text: 'b' }])).toBe(false);
  });
});

describe('hashReporter', () => {
  it('never contains the address it hashes', () => {
    expect(hashReporter({ ip: '203.0.113.7', secret: SECRET })).not.toContain('203.0.113.7');
  });

  it('depends on the server secret', () => {
    expect(hashReporter({ ip: '203.0.113.7', secret: SECRET })).not.toBe(hashReporter({ ip: '203.0.113.7', secret: `${SECRET}!` }));
  });

  it('keys the hash with a key derived from the server secret, never the secret itself', () => {
    const withRawSecret = hmacSha256Hex({ key: SECRET, data: `${MOD_REPORTS_API.ipContext}203.0.113.7` });

    expect(hashReporter({ ip: '203.0.113.7', secret: SECRET })).not.toBe(withRawSecret);
  });

  it('puts the addresses of one IPv6 subnet under one hash', () => {
    expect(hashReporter({ ip: '2001:db8:0:1::1', secret: SECRET })).toBe(hashReporter({ ip: '2001:db8:0:1::2', secret: SECRET }));
  });
});
