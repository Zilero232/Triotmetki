import { describe, expect, it } from 'vitest';

import { MOD_BADGES_QUOTA } from '../../../config/mod-badges.constants';
import { quotaKey, quotaMembers, secondsUntilNextDay } from '../badge-quota';

const SECRET = 'server-secret-for-tests';
const EVENING = new Date('2026-10-06T20:59:30.000Z');
const NEXT_MORNING = new Date('2026-10-06T21:00:30.000Z');

describe('quotaKey', () => {
  it('starts a new quota at Moscow midnight', () => {
    expect(quotaKey({ deviceId: 'dev_a', now: EVENING })).not.toBe(quotaKey({ deviceId: 'dev_a', now: NEXT_MORNING }));
  });

  it('keeps one quota per device', () => {
    expect(quotaKey({ deviceId: 'dev_a', now: EVENING })).not.toBe(quotaKey({ deviceId: 'dev_b', now: EVENING }));
  });
});

describe('quotaMembers', () => {
  it('never stores the asked account ids themselves', () => {
    const [member] = quotaMembers({ accountIds: [12_345_678], secret: SECRET, now: EVENING });

    expect(member).not.toContain('12345678');
  });

  it('maps the same account to the same member within a day, so asking twice costs once', () => {
    const first = quotaMembers({ accountIds: [12_345_678], secret: SECRET, now: EVENING });
    const second = quotaMembers({ accountIds: [12_345_678], secret: SECRET, now: new Date(EVENING.getTime() - 3_600_000) });

    expect(first).toEqual(second);
  });

  it('cannot be linked across days', () => {
    const today = quotaMembers({ accountIds: [12_345_678], secret: SECRET, now: EVENING });
    const tomorrow = quotaMembers({ accountIds: [12_345_678], secret: SECRET, now: NEXT_MORNING });

    expect(today).not.toEqual(tomorrow);
  });

  it('keeps members short', () => {
    const [member] = quotaMembers({ accountIds: [1], secret: SECRET, now: EVENING });

    expect(member).toHaveLength(MOD_BADGES_QUOTA.memberHexLength);
  });
});

describe('secondsUntilNextDay', () => {
  it('counts down to Moscow midnight', () => {
    expect(secondsUntilNextDay(EVENING)).toBe(30);
  });

  it('waits a whole day right after midnight', () => {
    expect(secondsUntilNextDay(new Date('2026-10-06T21:00:00.000Z'))).toBe(24 * 60 * 60);
  });
});
