import { describe, expect, it } from 'vitest';

import { fromUnixSeconds, parseLocalDateTime } from '../local-date';

describe('parseLocalDateTime', () => {
  it('reads the manifest timestamps as local time', () => {
    const date = parseLocalDateTime('2026-09-27 21:47:05');

    expect([date?.getFullYear(), date?.getMonth(), date?.getDate(), date?.getHours(), date?.getMinutes()]).toEqual([2026, 8, 27, 21, 47]);
  });

  it('returns null for an empty or malformed value', () => {
    expect(parseLocalDateTime(null)).toBeNull();
    expect(parseLocalDateTime('27.09.2026')).toBeNull();
  });
});

describe('fromUnixSeconds', () => {
  it('reads the fractional seconds the game writes into profiles.json', () => {
    expect(fromUnixSeconds(1.5)?.getTime()).toBe(1_500);
    expect(fromUnixSeconds(null)).toBeNull();
  });
});
