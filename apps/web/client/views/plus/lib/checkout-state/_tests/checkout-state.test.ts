import { describe, expect, it } from 'vitest';

import { checkoutMode, checkoutNote } from '../checkout-state';

const SIGNED_IN = { isPending: false, isError: false, isSignedIn: true, isPlus: false, isCheckoutAvailable: false, trialAvailable: false } as const;

describe('checkoutNote', () => {
  it('tells a subscriber how long the current state lasts', () => {
    expect(
      checkoutNote({ isSignedIn: true, isPlus: true, state: 'trial', periodEnd: '2026-10-03T00:00:00.000Z', isCheckoutAvailable: false })
    ).toEqual({
      kind: 'state',
      state: 'trial',
      periodEnd: '2026-10-03T00:00:00.000Z'
    });
  });

  it('tells a guest what signing in unlocks', () => {
    expect(checkoutNote({ isSignedIn: false, isPlus: false, state: 'none', periodEnd: null, isCheckoutAvailable: false })).toEqual({
      kind: 'text',
      key: 'guestNote'
    });
  });

  it('explains that payments are not open yet while checkout is off', () => {
    expect(checkoutNote({ isSignedIn: true, isPlus: false, state: 'none', periodEnd: null, isCheckoutAvailable: false })).toEqual({
      kind: 'text',
      key: 'closedNote'
    });
  });

  it('shows the payment note once checkout is open', () => {
    expect(checkoutNote({ isSignedIn: true, isPlus: false, state: 'expired', periodEnd: null, isCheckoutAvailable: true })).toEqual({
      kind: 'text',
      key: 'note'
    });
  });
});

describe('checkoutMode', () => {
  it('reports a failed subscription lookup instead of offering a purchase', () => {
    expect(checkoutMode({ ...SIGNED_IN, isError: true, isCheckoutAvailable: true })).toBe('error');
  });

  it('waits while the session or the billing status loads', () => {
    expect(checkoutMode({ ...SIGNED_IN, isPending: true })).toBe('pending');
  });

  it('asks a guest to sign in', () => {
    expect(checkoutMode({ ...SIGNED_IN, isSignedIn: false })).toBe('guest');
  });

  it('sends a subscriber to manage the subscription', () => {
    expect(checkoutMode({ ...SIGNED_IN, isPlus: true, isCheckoutAvailable: true })).toBe('plus');
  });

  it('offers the purchase once checkout is open', () => {
    expect(checkoutMode({ ...SIGNED_IN, isCheckoutAvailable: true, trialAvailable: true })).toBe('buy');
  });

  it('leads with the trial while checkout is closed', () => {
    expect(checkoutMode({ ...SIGNED_IN, trialAvailable: true })).toBe('trial');
  });

  it('falls back to the promo code once the trial is used', () => {
    expect(checkoutMode(SIGNED_IN)).toBe('promo');
  });
});
