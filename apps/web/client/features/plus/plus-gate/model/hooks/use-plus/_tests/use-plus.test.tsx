import type { BillingStatus } from '@otmetki/schemas';
import type { ReactNode } from 'react';

import { PLUS_TRIAL } from '@otmetki/schemas';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { afterAll, describe, expect, it, vi } from 'vitest';

import type { AuthSession } from '@/entities/auth/session';

import { plusLimitsFor } from '@/entities/plus/subscription';
import { getBillingStatus } from '@/entities/plus/subscription/api/billing/billing';
import { QUERY_KEYS } from '@/shared/constants';

import { usePlus } from '../use-plus';

vi.hoisted(() => vi.resetModules());

afterAll(() => {
  vi.resetModules();
});

vi.mock('@/entities/plus/subscription/api/billing/billing', () => ({
  getBillingStatus: vi.fn(),
  getPaymentHistory: vi.fn(),
  getPlusPlans: vi.fn(),
  startPlusTrial: vi.fn()
}));

const SESSION: AuthSession = {
  user: { id: 'user-1', name: 'Tanker', email: 'user-1@example.com', emailVerified: false, createdAt: new Date(0), updatedAt: new Date(0) },
  lestaAccountId: 1001
};

const TRIAL_STATUS: BillingStatus = {
  isPlus: true,
  plan: null,
  status: 'trialing',
  currentPeriodEnd: '2026-02-01T00:00:00.000Z',
  cancelAtPeriodEnd: false,
  card: null,
  isRecurringAvailable: true,
  isCheckoutAvailable: true,
  plus: { state: 'trial', periodEnd: '2026-02-01T00:00:00.000Z', graceEndsAt: null, trialAvailable: false, trialDays: 14 },
  plans: []
};

const EXPIRED_STATUS: BillingStatus = {
  ...TRIAL_STATUS,
  isPlus: false,
  status: 'expired',
  plus: { ...TRIAL_STATUS.plus, state: 'expired' }
};

const renderPlus = (session: AuthSession) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  client.setQueryData(QUERY_KEYS.auth.session, session);

  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

  return renderHook(() => usePlus(), { wrapper });
};

describe('usePlus', () => {
  it('gives a guest the free limits without asking for billing', () => {
    const { result } = renderPlus(null);

    expect(result.current).toMatchObject({ isSignedIn: false, isPlus: false, state: 'none', isPending: false, trialDays: PLUS_TRIAL.days });
    expect(result.current.limits).toEqual(plusLimitsFor(false));
    expect(getBillingStatus).not.toHaveBeenCalled();
  });

  it('stays pending for a signed-in viewer until billing arrives', () => {
    vi.mocked(getBillingStatus).mockReturnValue(new Promise(() => undefined));
    const { result } = renderPlus(SESSION);

    expect(result.current.isSignedIn).toBe(true);
    expect(result.current.isPending).toBe(true);
    expect(result.current.isPlus).toBe(false);
  });

  it('grants Plus limits during a trial and exposes its dates', async () => {
    vi.mocked(getBillingStatus).mockResolvedValue(TRIAL_STATUS);
    const { result } = renderPlus(SESSION);

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current).toMatchObject({
      isPlus: true,
      state: 'trial',
      periodEnd: TRIAL_STATUS.plus.periodEnd,
      graceEndsAt: null,
      trialAvailable: false,
      trialDays: TRIAL_STATUS.plus.trialDays,
      isCheckoutAvailable: true
    });

    expect(result.current.limits).toEqual(plusLimitsFor(true));
  });

  it('falls back to the free limits once Plus has expired', async () => {
    vi.mocked(getBillingStatus).mockResolvedValue(EXPIRED_STATUS);
    const { result } = renderPlus(SESSION);

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.isPlus).toBe(false);
    expect(result.current.state).toBe('expired');
    expect(result.current.limits).toEqual(plusLimitsFor(false));
  });

  it('reports a failed billing lookup instead of treating the viewer as free', async () => {
    vi.mocked(getBillingStatus).mockRejectedValue(new Error('billing down'));
    const { result } = renderPlus(SESSION);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.isPending).toBe(false);
  });

  it('retries the billing lookup on refetch', async () => {
    vi.mocked(getBillingStatus).mockRejectedValueOnce(new Error('billing down')).mockResolvedValue(TRIAL_STATUS);
    const { result } = renderPlus(SESSION);

    await waitFor(() => expect(result.current.isError).toBe(true));

    result.current.refetch();

    await waitFor(() => expect(result.current.isPlus).toBe(true));
  });

  it('never reports an error for a guest', () => {
    const { result } = renderPlus(null);

    expect(result.current.isError).toBe(false);
  });
});
