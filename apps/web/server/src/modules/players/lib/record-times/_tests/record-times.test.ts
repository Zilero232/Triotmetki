import { describe, expect, it } from 'vitest';

import type { CareerRecordTimes } from '../../../selects/players.selects';

import { achievedAt } from '../record-times';

const SEEN_AT = new Date('2026-09-01T10:00:00.000Z');

const TIMES: CareerRecordTimes = {
  maxDamage: 8_000,
  maxDamageAt: SEEN_AT,
  maxXp: 2_500,
  maxXpAt: null,
  maxFrags: 7,
  maxFragsAt: SEEN_AT
};

describe('achievedAt', () => {
  it('returns when the stored record was first seen', () => {
    expect(achievedAt({ key: 'maxDamage', value: 8_000, times: TIMES })).toBe(SEEN_AT.toISOString());
  });

  it('returns null when the stored record differs from the shown one', () => {
    expect(achievedAt({ key: 'maxFrags', value: 8, times: TIMES })).toBeNull();
  });

  it('returns null when the record time was never captured', () => {
    expect(achievedAt({ key: 'maxXp', value: 2_500, times: TIMES })).toBeNull();
  });
});
