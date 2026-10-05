import type { ExecutionContext } from '@nestjs/common';
import type { HttpArgumentsHost } from '@nestjs/common/interfaces';
import type { Reflector } from '@nestjs/core';
import type { PlusFeature } from '@otmetki/schemas';

import { addDays } from 'date-fns';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { Subscription } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { EntitlementsBusService } from '../../services/entitlements-bus.service';

import { AppForbiddenException, AppUnauthorizedException } from '../../../../common/exceptions';
import { PLUS_GUARD } from '../../config/plus-guard.constants';
import { EntitlementsService } from '../../services/entitlements.service';
import { PlusGuard } from '../plus.guard';

const now = new Date('2026-09-25T12:00:00Z');
const feature: PlusFeature = 'history';

const contextFor = (request: { session?: { user: { id: string } } | null }) => {
  const http = mock<HttpArgumentsHost>();

  http.getRequest.mockReturnValue(request);

  return mock<ExecutionContext>({ switchToHttp: () => http });
};

const signedIn = contextFor({ session: { user: { id: 'u1' } } });

const createGuard = (required: PlusFeature | undefined, subscription: Subscription | null) => {
  const prisma = mockDeep<PrismaService>();
  const reflector = mock<Reflector>();

  prisma.subscription.findUnique.mockResolvedValue(subscription);
  prisma.userLestaAccount.findMany.mockResolvedValue([]);
  prisma.referral.count.mockResolvedValue(0);
  prisma.plusTrial.count.mockResolvedValue(0);
  reflector.getAllAndOverride.mockReturnValue(required);

  return { guard: new PlusGuard(reflector, new EntitlementsService(prisma, mock<EntitlementsBusService>())), reflector, prisma };
};

const subscriptionIn = (status: Subscription['status'], endsInDays: number) =>
  mock<Subscription>({ status, currentPeriodEnd: addDays(now, endsInDays), trialStartedAt: status === 'trialing' ? now : null });

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('PlusGuard.canActivate', () => {
  it('lets anyone through a route that needs no Plus feature', async () => {
    const { guard, prisma } = createGuard(undefined, null);

    await expect(guard.canActivate(contextFor({ session: null }))).resolves.toBe(true);
    expect(prisma.subscription.findUnique).not.toHaveBeenCalled();
  });

  it('reads the required feature from the handler before the class', async () => {
    const { guard, reflector } = createGuard(undefined, null);
    const context = contextFor({ session: null });

    await guard.canActivate(context);

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(PLUS_GUARD.featureKey, [context.getHandler(), context.getClass()]);
  });

  it('asks an anonymous visitor to sign in', async () => {
    const { guard } = createGuard(feature, null);

    await expect(guard.canActivate(contextFor({}))).rejects.toBeInstanceOf(AppUnauthorizedException);
  });

  it('lets an active Plus subscriber through', async () => {
    const { guard } = createGuard(feature, subscriptionIn('active', 10));

    await expect(guard.canActivate(signedIn)).resolves.toBe(true);
  });

  it('lets a user on a running trial through', async () => {
    const { guard } = createGuard(feature, subscriptionIn('trialing', 3));

    await expect(guard.canActivate(signedIn)).resolves.toBe(true);
  });

  it('refuses an expired subscriber and names the feature', async () => {
    const { guard } = createGuard(feature, subscriptionIn('expired', -5));

    const refusal = guard.canActivate(signedIn);

    await expect(refusal).rejects.toBeInstanceOf(AppForbiddenException);
    await expect(refusal).rejects.toMatchObject({ response: { code: 'SUBSCRIPTION_REQUIRED' } });
  });

  it('refuses a signed-in user who never had Plus', async () => {
    const { guard } = createGuard(feature, null);

    await expect(guard.canActivate(signedIn)).rejects.toBeInstanceOf(AppForbiddenException);
  });
});
