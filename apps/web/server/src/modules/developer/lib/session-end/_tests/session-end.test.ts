import { addMinutes, subMinutes } from 'date-fns';
import { describe, expect, it } from 'vitest';

import { isSessionEnded } from '../session-end';

const lastActivityAt = new Date('2026-09-28T19:00:00Z');
const idleSince = subMinutes(lastActivityAt, 10);

describe('isSessionEnded', () => {
  it('ends a session the player logged out of after the last battle, before the idle timeout', () => {
    expect(isSessionEnded({ lastActivityAt, logoutAt: addMinutes(lastActivityAt, 2), idleSince })).toBe(true);
  });

  it('keeps a session open when the logout predates the last battle or is unknown', () => {
    expect(isSessionEnded({ lastActivityAt, logoutAt: subMinutes(lastActivityAt, 30), idleSince })).toBe(false);
    expect(isSessionEnded({ lastActivityAt, logoutAt: lastActivityAt, idleSince })).toBe(false);
    expect(isSessionEnded({ lastActivityAt, logoutAt: null, idleSince })).toBe(false);
  });

  it('ends an idle session whatever the logout says', () => {
    expect(isSessionEnded({ lastActivityAt, logoutAt: null, idleSince: addMinutes(lastActivityAt, 1) })).toBe(true);
  });
});
