import { addDays, addHours, differenceInHours } from 'date-fns';
import { describe, expect, it } from 'vitest';

import { GOALS, MOD_GOALS } from '../../../config/me.constants';
import { goalBattles, goalWindow, hangarGoalsSince, isGoalEndAllowed } from '../goal';

const now = new Date('2026-09-26T12:00:00Z');

describe('isGoalEndAllowed', () => {
  it('accepts an end inside the allowed window', () => {
    expect(isGoalEndAllowed({ endsAt: addDays(now, 30), now })).toBe(true);
  });

  it('accepts the last allowed day itself', () => {
    expect(isGoalEndAllowed({ endsAt: addDays(now, GOALS.maxDurationDays), now })).toBe(true);
  });

  it('refuses an end in the past or right now', () => {
    expect(isGoalEndAllowed({ endsAt: now, now })).toBe(false);
  });

  it('refuses an end past the allowed window', () => {
    expect(isGoalEndAllowed({ endsAt: addDays(now, GOALS.maxDurationDays + 1), now })).toBe(false);
  });
});

describe('hangarGoalsSince', () => {
  it('reaches back exactly the configured window of ended goals', () => {
    expect(differenceInHours(now, hangarGoalsSince(now))).toBe(MOD_GOALS.endedWithinHours);
  });
});

describe('goalWindow', () => {
  const startsAt = addDays(now, -3);

  it('counts a running goal up to now', () => {
    expect(goalWindow({ startsAt, endsAt: addDays(now, 2), now })).toEqual({ from: startsAt, to: now });
  });

  it('stops counting at the end of an ended goal', () => {
    const endsAt = addHours(now, -5);

    expect(goalWindow({ startsAt, endsAt, now })).toEqual({ from: startsAt, to: endsAt });
  });
});

describe('goalBattles', () => {
  it('takes the larger of the mod battles and the API battles', () => {
    expect(goalBattles({ modBattles: 4, apiBattles: 9 })).toBe(9);
    expect(goalBattles({ modBattles: 7, apiBattles: 2 })).toBe(7);
  });

  it('falls back to the mod battles when the API has no deltas in the window', () => {
    expect(goalBattles({ modBattles: 3, apiBattles: null })).toBe(3);
    expect(goalBattles({ modBattles: 0, apiBattles: null })).toBe(0);
  });
});
