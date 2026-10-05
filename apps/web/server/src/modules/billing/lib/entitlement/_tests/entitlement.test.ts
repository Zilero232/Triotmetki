import { addDays } from 'date-fns';
import { describe, expect, it } from 'vitest';

import { accessEndsAt, entitledSubscriptionWhere, isEntitled } from '../entitlement';

const now = new Date('2026-09-25T12:00:00Z');

describe('isEntitled', () => {
  it('needs both an entitled status and a running period', () => {
    const future = addDays(now, 1);

    expect(isEntitled({ subscription: { status: 'active', currentPeriodEnd: future }, now })).toBe(true);
    expect(isEntitled({ subscription: { status: 'pastDue', currentPeriodEnd: future }, now })).toBe(true);
    expect(isEntitled({ subscription: { status: 'expired', currentPeriodEnd: future }, now })).toBe(false);
    expect(isEntitled({ subscription: { status: 'active', currentPeriodEnd: addDays(now, -1) }, now })).toBe(false);
    expect(isEntitled({ subscription: null, now })).toBe(false);
  });

  it('keeps a failed renewal entitled through the grace days', () => {
    expect(isEntitled({ subscription: { status: 'pastDue', currentPeriodEnd: addDays(now, -2) }, now })).toBe(true);
    expect(isEntitled({ subscription: { status: 'pastDue', currentPeriodEnd: addDays(now, -3) }, now })).toBe(false);
  });

  it('gives no grace to a trial or an active period', () => {
    expect(isEntitled({ subscription: { status: 'trialing', currentPeriodEnd: addDays(now, -1) }, now })).toBe(false);
  });
});

describe('accessEndsAt', () => {
  it('adds the grace days only while the renewal is past due', () => {
    expect(accessEndsAt({ status: 'pastDue', currentPeriodEnd: now })).toEqual(addDays(now, 3));
    expect(accessEndsAt({ status: 'active', currentPeriodEnd: now })).toEqual(now);
    expect(accessEndsAt({ status: 'active', currentPeriodEnd: null })).toBeNull();
  });
});

describe('entitledSubscriptionWhere', () => {
  it('matches the same grace window as isEntitled', () => {
    expect(entitledSubscriptionWhere(now).OR).toContainEqual({ status: 'pastDue', currentPeriodEnd: { gt: addDays(now, -3) } });
    expect(entitledSubscriptionWhere(now).OR).toContainEqual({ status: { in: ['active', 'trialing'] }, currentPeriodEnd: { gt: now } });
  });
});
