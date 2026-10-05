import type { PlusState } from '@otmetki/schemas';

import { PLUS_TRIAL } from '@otmetki/schemas';
import { addDays } from 'date-fns';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { UserLestaAccount } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { EntitlementsService } from '../entitlements.service';
import type { SubscriptionWriterService } from '../subscription-writer.service';

import { TrialWriterService } from '../trial-writer.service';

const state = (overrides: Partial<PlusState> = {}): PlusState => ({
  state: 'none',
  periodEnd: null,
  graceEndsAt: null,
  trialAvailable: true,
  trialDays: PLUS_TRIAL.days,
  ...overrides
});

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const entitlements = mock<EntitlementsService>();
  const subscriptions = mock<SubscriptionWriterService>();

  prisma.$transaction.mockImplementation(async (run) => (typeof run === 'function' ? run(prisma) : Promise.all(run)));
  prisma.userLestaAccount.findMany.mockResolvedValue([mock<UserLestaAccount>({ accountId: 1n }), mock<UserLestaAccount>({ accountId: 2n })]);
  prisma.plusTrial.count.mockResolvedValue(0);

  return { service: new TrialWriterService(prisma, entitlements, subscriptions), prisma, entitlements };
};

const now = new Date('2026-09-26T12:00:00Z');

afterEach(() => {
  vi.useRealTimers();
});

describe('TrialWriterService.start', () => {
  it('refuses a user whose trial is not available', async () => {
    const { service, prisma, entitlements } = createService();

    entitlements.refresh.mockResolvedValue(state({ trialAvailable: false }));

    await expect(service.start('u1')).rejects.toMatchObject({ response: { code: 'TRIAL_UNAVAILABLE' } });
    expect(prisma.subscription.upsert).not.toHaveBeenCalled();
  });

  it('burns the trial for every linked account and runs it for the offered days without a card', async () => {
    const { service, prisma, entitlements } = createService();

    vi.useFakeTimers({ now });
    entitlements.refresh.mockResolvedValue(state({ trialDays: PLUS_TRIAL.referralDays }));

    await service.start('u1');

    expect(prisma.plusTrial.createMany.mock.calls[0]?.[0]?.data).toEqual([
      expect.objectContaining({ accountId: 1n, userId: 'u1' }),
      expect.objectContaining({ accountId: 2n, userId: 'u1' })
    ]);

    expect(prisma.subscription.upsert.mock.calls[0]?.[0].update).toMatchObject({
      status: 'trialing',
      cancelAtPeriodEnd: true,
      trialStartedAt: now,
      currentPeriodEnd: addDays(now, PLUS_TRIAL.referralDays)
    });

    expect(entitlements.syncTracking).toHaveBeenCalledWith('u1');
  });

  it('refuses when an account got a trial meanwhile', async () => {
    const { service, prisma, entitlements } = createService();

    entitlements.refresh.mockResolvedValue(state());
    prisma.plusTrial.count.mockResolvedValue(1);

    await expect(service.start('u1')).rejects.toMatchObject({ response: { code: 'TRIAL_UNAVAILABLE' } });
    expect(prisma.plusTrial.createMany).not.toHaveBeenCalled();
  });

  it('refuses a user whose linked accounts were all unlinked meanwhile', async () => {
    const { service, prisma, entitlements } = createService();

    entitlements.refresh.mockResolvedValue(state());
    prisma.userLestaAccount.findMany.mockResolvedValue([]);

    await expect(service.start('u1')).rejects.toMatchObject({ response: { code: 'TRIAL_UNAVAILABLE' } });
    expect(prisma.subscription.upsert).not.toHaveBeenCalled();
    expect(entitlements.syncTracking).not.toHaveBeenCalled();
  });
});
