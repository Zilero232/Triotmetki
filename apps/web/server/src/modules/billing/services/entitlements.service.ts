import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { PlusState } from '@otmetki/schemas';
import type { Subscription } from 'rxjs';

import { Injectable } from '@nestjs/common';
import { isPlusState, plusLimit } from '@otmetki/schemas';
import { LRUCache } from 'lru-cache';

import type { AssertFeatureInput, AssertWithinLimitInput, LimitInput } from '../billing.types';

import { AppForbiddenException } from '../../../common/exceptions';
import { PrismaService } from '../../../core';
import { ENTITLEMENTS } from '../config/entitlements.constants';
import { plusStateOf } from '../lib/plus-state';
import { plusSubscriptionKey } from '../lib/subscription-key';
import { isTrialEligible, trialDaysFor } from '../lib/trial';
import { EntitlementsBusService } from './entitlements-bus.service';

@Injectable()
export class EntitlementsService implements OnModuleInit, OnModuleDestroy {
  private readonly cache = new LRUCache<string, PlusState>({ max: ENTITLEMENTS.cacheMaxEntries, ttl: ENTITLEMENTS.cacheTtlMs });
  private subscription: Subscription | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly bus: EntitlementsBusService
  ) {}

  onModuleInit(): void {
    this.subscription = this.bus.changes$.subscribe(({ userId, isLocal }) => {
      if (!isLocal) {
        this.cache.delete(userId);
      }
    });
  }

  onModuleDestroy(): void {
    this.subscription?.unsubscribe();
  }

  async plusState(userId: string): Promise<PlusState> {
    return this.cache.get(userId) ?? this.refresh(userId);
  }

  async refresh(userId: string): Promise<PlusState> {
    const [subscription, accounts, referral] = await Promise.all([
      this.prisma.subscription.findUnique({
        where: plusSubscriptionKey(userId),
        select: { status: true, currentPeriodEnd: true, trialStartedAt: true }
      }),
      this.prisma.userLestaAccount.findMany({ where: { userId }, select: { accountId: true } }),
      this.prisma.referral.count({ where: { referredUserId: userId } })
    ]);

    const trialedRecords = await this.prisma.plusTrial.count({
      where: { OR: [{ userId }, { accountId: { in: accounts.map((account) => account.accountId) } }] }
    });

    const state = plusStateOf({
      subscription,
      now: new Date(),
      trialAvailable: isTrialEligible({ linkedAccounts: accounts.length, trialedRecords, hasStartedTrial: subscription?.trialStartedAt != null }),
      trialDays: trialDaysFor(referral > 0)
    });

    this.cache.set(userId, state);

    return state;
  }

  invalidate(userId: string): void {
    this.cache.delete(userId);
    this.bus.publish(userId);
  }

  async isPlus(userId: string): Promise<boolean> {
    return isPlusState((await this.plusState(userId)).state);
  }

  async limit({ userId, key }: LimitInput): Promise<number> {
    return plusLimit({ key, isPlus: await this.isPlus(userId) });
  }

  async assertFeature({ userId, feature }: AssertFeatureInput): Promise<void> {
    if (!(await this.isPlus(userId))) {
      throw new AppForbiddenException('SUBSCRIPTION_REQUIRED', `${feature} needs Plus`, { feature });
    }
  }

  async assertWithinLimit({ userId, key, count, feature }: AssertWithinLimitInput): Promise<void> {
    const isPlus = await this.isPlus(userId);
    const limit = plusLimit({ key, isPlus });

    if (count >= limit) {
      throw new AppForbiddenException(isPlus ? 'PLAN_LIMIT_REACHED' : 'SUBSCRIPTION_REQUIRED', `The ${key} limit of ${limit} is reached`, {
        limitKey: key,
        limit,
        ...(feature ? { feature } : {})
      });
    }
  }

  async syncTracking(userId: string): Promise<number> {
    this.invalidate(userId);

    const accounts = await this.prisma.userLestaAccount.findMany({ where: { userId }, select: { accountId: true } });

    if (accounts.length === 0) {
      return 0;
    }

    const isPlus = await this.isPlus(userId);
    const accountIds = accounts.map((account) => account.accountId);

    const updated = await this.prisma.player.updateMany({
      where: { accountId: { in: accountIds } },
      data: isPlus ? { trackingTier: 'active', nextPollAt: new Date() } : { trackingTier: 'active' }
    });

    return updated.count;
  }
}
