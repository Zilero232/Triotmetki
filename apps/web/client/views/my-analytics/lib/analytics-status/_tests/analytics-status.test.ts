import { describe, expect, it } from 'vitest';

import { NotFoundError, PlusRequiredError, UnauthorizedError } from '@/shared/api/source';

import { ANALYTICS_VIEW } from '../../../config';
import { analyticsStatus, shouldRetryAnalytics } from '../analytics-status';

const READY = { requiresPlus: false, isPlus: false, isPlusPending: false, isPlusError: false, isPending: false, error: null } as const;
const PLUS_REQUIRED = new PlusRequiredError({ code: 'SUBSCRIPTION_REQUIRED', details: {}, message: 'Plus' });

describe('analyticsStatus', () => {
  it('asks for Plus before querying when the section needs it and the user has none', () => {
    expect(analyticsStatus({ ...READY, requiresPlus: true, isPending: true })).toBe('plus');
  });

  it('waits while the subscription is still loading instead of flashing the teaser', () => {
    expect(analyticsStatus({ ...READY, requiresPlus: true, isPlusPending: true })).toBe('pending');
  });

  it('reports a failed subscription lookup as an error instead of the teaser', () => {
    expect(analyticsStatus({ ...READY, requiresPlus: true, isPlusError: true })).toBe('error');
  });

  it('ignores a failed subscription lookup on a free section', () => {
    expect(analyticsStatus({ ...READY, isPlusError: true })).toBe('ready');
  });

  it('shows the teaser when the server refuses with a Plus error even for a subscriber', () => {
    expect(analyticsStatus({ ...READY, requiresPlus: true, isPlus: true, error: PLUS_REQUIRED })).toBe('plus');
  });

  it('treats a missing resource as a missing Lesta link', () => {
    expect(analyticsStatus({ ...READY, error: new NotFoundError() })).toBe('noAccount');
  });

  it('reports any other failure as an error', () => {
    expect(analyticsStatus({ ...READY, error: new Error('down') })).toBe('error');
  });

  it('never gates a free section behind Plus', () => {
    expect(analyticsStatus(READY)).toBe('ready');
  });
});

describe('shouldRetryAnalytics', () => {
  it('does not retry answers that another request cannot change', () => {
    [PLUS_REQUIRED, new NotFoundError(), new UnauthorizedError()].forEach((error) => {
      expect(shouldRetryAnalytics({ failureCount: 0, error })).toBe(false);
    });
  });

  it('retries a transient failure up to the configured attempts', () => {
    expect(shouldRetryAnalytics({ failureCount: 0, error: new Error('down') })).toBe(true);
    expect(shouldRetryAnalytics({ failureCount: ANALYTICS_VIEW.retryAttempts, error: new Error('down') })).toBe(false);
  });
});
