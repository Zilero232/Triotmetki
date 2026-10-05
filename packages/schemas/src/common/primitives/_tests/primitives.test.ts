import { describe, expect, it } from 'vitest';

import { accountIdSchema, countSchema, httpsUrlSchema, httpUrlSchema, nicknameSchema, percentSchema, ratioSchema } from '../primitives.schemas';

describe('primitives', () => {
  it('coerces numeric ids from query strings and rejects non-positive ones', () => {
    expect(accountIdSchema.parse('123')).toBe(123);
    expect(accountIdSchema.safeParse('0').success).toBe(false);
    expect(accountIdSchema.safeParse('1.5').success).toBe(false);
  });

  it('trims nicknames and enforces the Lesta alphabet and length', () => {
    expect(nicknameSchema.parse('  Straik_1 ')).toBe('Straik_1');
    expect(nicknameSchema.safeParse('a').success).toBe(false);
    expect(nicknameSchema.safeParse('bad name').success).toBe(false);
    expect(nicknameSchema.safeParse('x'.repeat(25)).success).toBe(false);
  });

  it('bounds ratios, percents and counts', () => {
    expect(ratioSchema.safeParse(1.01).success).toBe(false);
    expect(percentSchema.safeParse(100).success).toBe(true);
    expect(percentSchema.safeParse(-1).success).toBe(false);
    expect(countSchema.safeParse(2.5).success).toBe(false);
  });

  it('accepts only web links with a host name, never a script or data URL', () => {
    expect(httpUrlSchema.safeParse('https://t.me/coach').success).toBe(true);
    expect(httpUrlSchema.safeParse('http://example.com/x').success).toBe(true);
    expect(httpUrlSchema.safeParse('javascript:alert(1)').success).toBe(false);
    expect(httpUrlSchema.safeParse('data:text/html,hi').success).toBe(false);
    expect(httpsUrlSchema.safeParse('http://example.com/x').success).toBe(false);
  });
});
