import { PLUS_LIMITS, PLUS_TRIAL } from '@otmetki/schemas';
import { addDays } from 'date-fns';
import { Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { Subscription, UserLestaAccount } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { EntitlementChange } from '../../billing.types';
import type { EntitlementsBusService } from '../entitlements-bus.service';

import { AppForbiddenException } from '../../../../common/exceptions';
import { EntitlementsService } from '../entitlements.service';

const NOW = new Date('2026-09-26T12:00:00Z');

const createService = () => {
  const prisma = mockDeep<PrismaService>();

  prisma.userLestaAccount.findMany.mockResolvedValue([mock<UserLestaAccount>({ accountId: 1n })]);
  prisma.referral.count.mockResolvedValue(0);
  prisma.plusTrial.count.mockResolvedValue(0);

  const changes = new Subject<EntitlementChange>();
  const bus = mock<EntitlementsBusService>();

  Object.defineProperty(bus, 'changes$', { value: changes.asObservable() });

  return { service: new EntitlementsService(prisma, bus), prisma, bus, changes };
};

const running = (status: Subscription['status']) => mock<Subscription>({ status, currentPeriodEnd: addDays(NOW, 5), trialStartedAt: null });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('EntitlementsService.plusState', () => {
  it('reads the subscription once within the cache window', async () => {
    const { service, prisma } = createService();

    prisma.subscription.findUnique.mockResolvedValue(running('active'));

    await service.plusState('u1');
    await service.plusState('u1');

    expect(prisma.subscription.findUnique).toHaveBeenCalledTimes(1);
  });

  it('reads again after an invalidation', async () => {
    const { service, prisma } = createService();

    prisma.subscription.findUnique.mockResolvedValueOnce(running('active')).mockResolvedValueOnce(null);

    expect((await service.plusState('u1')).state).toBe('active');
    service.invalidate('u1');
    expect((await service.plusState('u1')).state).toBe('none');
  });

  it('offers the trial only to a user with an untried linked account', async () => {
    const { service, prisma } = createService();

    prisma.subscription.findUnique.mockResolvedValue(null);
    prisma.plusTrial.count.mockResolvedValueOnce(0).mockResolvedValueOnce(1);

    expect((await service.refresh('u1')).trialAvailable).toBe(true);
    expect((await service.refresh('u1')).trialAvailable).toBe(false);
  });

  it('gives a referred user the longer trial', async () => {
    const { service, prisma } = createService();

    prisma.subscription.findUnique.mockResolvedValue(null);
    prisma.referral.count.mockResolvedValue(1);

    expect((await service.refresh('u1')).trialDays).toBe(PLUS_TRIAL.referralDays);
  });

  it('gives a user who was not referred the standard trial', async () => {
    const { service, prisma } = createService();

    prisma.subscription.findUnique.mockResolvedValue(null);

    expect((await service.refresh('u1')).trialDays).toBe(PLUS_TRIAL.days);
  });

  it('drops the cached state when another process changes it', async () => {
    const { service, prisma, changes } = createService();

    prisma.subscription.findUnique.mockResolvedValueOnce(running('active')).mockResolvedValueOnce(null);
    service.onModuleInit();

    expect((await service.plusState('u1')).state).toBe('active');
    changes.next({ userId: 'u1', isLocal: false });
    expect((await service.plusState('u1')).state).toBe('none');
  });

  it('keeps the cached state for a change this process already applied', async () => {
    const { service, prisma, changes } = createService();

    prisma.subscription.findUnique.mockResolvedValue(running('active'));
    service.onModuleInit();

    await service.plusState('u1');
    changes.next({ userId: 'u1', isLocal: true });
    await service.plusState('u1');

    expect(prisma.subscription.findUnique).toHaveBeenCalledTimes(1);
  });

  it('stops listening to the bus on shutdown', async () => {
    const { service, prisma, changes } = createService();

    prisma.subscription.findUnique.mockResolvedValue(running('active'));
    service.onModuleInit();
    service.onModuleDestroy();

    await service.plusState('u1');
    changes.next({ userId: 'u1', isLocal: false });
    await service.plusState('u1');

    expect(prisma.subscription.findUnique).toHaveBeenCalledTimes(1);
  });
});

describe('EntitlementsService.assertFeature', () => {
  it('lets a subscriber use a Plus feature', async () => {
    const { service, prisma } = createService();

    prisma.subscription.findUnique.mockResolvedValue(running('active'));

    await expect(service.assertFeature({ userId: 'u1', feature: 'analytics' })).resolves.toBeUndefined();
  });

  it('asks a free user to subscribe, naming the feature', async () => {
    const { service, prisma } = createService();

    prisma.subscription.findUnique.mockResolvedValue(null);

    await expect(service.assertFeature({ userId: 'u1', feature: 'analytics' })).rejects.toMatchObject({
      status: 403,
      response: { code: 'SUBSCRIPTION_REQUIRED', details: { feature: 'analytics' } }
    });
  });
});

describe('EntitlementsService.assertWithinLimit', () => {
  it('asks a free user at the free limit to subscribe, naming the limit', async () => {
    const { service, prisma } = createService();

    prisma.subscription.findUnique.mockResolvedValue(null);

    const failure = service.assertWithinLimit({ userId: 'u1', key: 'goals', count: PLUS_LIMITS.goals.free });

    await expect(failure).rejects.toBeInstanceOf(AppForbiddenException);

    await expect(failure).rejects.toMatchObject({
      response: { code: 'SUBSCRIPTION_REQUIRED', details: { limitKey: 'goals', limit: PLUS_LIMITS.goals.free } }
    });
  });

  it('lets a free user reach one below the free limit', async () => {
    const { service, prisma } = createService();

    prisma.subscription.findUnique.mockResolvedValue(null);

    await expect(service.assertWithinLimit({ userId: 'u1', key: 'goals', count: PLUS_LIMITS.goals.free - 1 })).resolves.toBeUndefined();
  });

  it('lets a subscriber past the free limit up to the plus limit', async () => {
    const { service, prisma } = createService();

    prisma.subscription.findUnique.mockResolvedValue(running('trialing'));

    await expect(service.assertWithinLimit({ userId: 'u1', key: 'goals', count: PLUS_LIMITS.goals.free })).resolves.toBeUndefined();

    await expect(service.assertWithinLimit({ userId: 'u1', key: 'goals', count: PLUS_LIMITS.goals.plus })).rejects.toMatchObject({
      response: { code: 'PLAN_LIMIT_REACHED' }
    });
  });
});

describe('EntitlementsService.syncTracking', () => {
  it('pulls a subscriber forward in the poll queue and leaves a lapsed user on the normal cadence', async () => {
    const { service, prisma } = createService();

    prisma.subscription.findUnique.mockResolvedValueOnce(running('active')).mockResolvedValueOnce(null);
    prisma.player.updateMany.mockResolvedValue({ count: 1 });

    await service.syncTracking('u1');
    await service.syncTracking('u1');

    expect(prisma.player.updateMany.mock.calls[0]?.[0].data).toHaveProperty('nextPollAt');
    expect(prisma.player.updateMany.mock.calls[1]?.[0].data).not.toHaveProperty('nextPollAt');
  });
});

describe('EntitlementsService.invalidate', () => {
  it('broadcasts the change so other processes drop their cached state', () => {
    const { service, bus } = createService();

    service.invalidate('u1');

    expect(bus.publish).toHaveBeenCalledWith('u1');
  });
});
