import { describe, expect, it } from 'vitest';

import { MOD_BADGES_QUOTA } from '../../../config/mod-badges.constants';
import { quotaKey, quotaMembers } from '../badge-quota';

const SECRET = 'server-secret-for-tests';
const EVENING = new Date('2026-10-06T20:59:30.000Z');
const NEXT_MORNING = new Date('2026-10-06T21:00:30.000Z');

const PREFIX = MOD_BADGES_QUOTA.keyPrefix;

describe('quotaKey', () => {
  it('starts a new quota at Moscow midnight', () => {
    const evening = quotaKey({ prefix: PREFIX, subject: 'dev_a', now: EVENING });
    const morning = quotaKey({ prefix: PREFIX, subject: 'dev_a', now: NEXT_MORNING });

    expect(evening).not.toBe(morning);
  });

  it('keeps one quota per subject', () => {
    const first = quotaKey({ prefix: PREFIX, subject: 'dev_a', now: EVENING });
    const second = quotaKey({ prefix: PREFIX, subject: 'dev_b', now: EVENING });

    expect(first).not.toBe(second);
  });

  it('keeps the own-id quota apart from the lookup quota', () => {
    const asked = quotaKey({ prefix: PREFIX, subject: 'dev_a', now: EVENING });
    const own = quotaKey({ prefix: MOD_BADGES_QUOTA.ownKeyPrefix, subject: 'dev_a', now: EVENING });

    expect(asked).not.toBe(own);
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

  it('charges an account asked twice in one request once', () => {
    const members = quotaMembers({ accountIds: [12_345_678, 12_345_678], secret: SECRET, now: EVENING });

    expect(members).toHaveLength(1);
  });

  it('keeps members short', () => {
    const [member] = quotaMembers({ accountIds: [1], secret: SECRET, now: EVENING });

    expect(member).toHaveLength(MOD_BADGES_QUOTA.memberHexLength);
  });
});
