import type { BillingStatus } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';
import { addDays } from 'date-fns';

import type { ClaimTrialInput } from '../billing.types';

import { AppConflictException } from '../../../common/exceptions';
import { PrismaService } from '../../../core';
import { PLUS_PLANS } from '../config/plans.constants';
import { PLUS_SUBSCRIPTION } from '../lib/entitlement/entitlement.constants';
import { plusSubscriptionKey } from '../lib/subscription-key';
import { EntitlementsService } from './entitlements.service';
import { SubscriptionService } from './subscription.service';

@Injectable()
export class TrialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
    private readonly subscriptions: SubscriptionService
  ) {}

  async start(userId: string): Promise<BillingStatus> {
    const { trialAvailable, trialDays } = await this.entitlements.refresh(userId);

    if (!trialAvailable) {
      throw new AppConflictException('TRIAL_UNAVAILABLE', 'The Plus trial is available once per user and Lesta account, with a linked account');
    }

    const now = new Date();

    await this.prisma.$transaction(async (tx) => this.claimTrial({ tx, userId, trialDays, now }), { isolationLevel: 'Serializable' });
    await this.entitlements.syncTracking(userId);

    return this.subscriptions.status(userId);
  }

  private async claimTrial({ tx, userId, trialDays, now }: ClaimTrialInput): Promise<void> {
    const accounts = await tx.userLestaAccount.findMany({ where: { userId }, select: { accountId: true } });
    const accountIds = accounts.map((account) => account.accountId);
    const trialed = await tx.plusTrial.count({ where: { OR: [{ userId }, { accountId: { in: accountIds } }] } });

    if (accountIds.length === 0 || trialed > 0) {
      throw new AppConflictException('TRIAL_UNAVAILABLE', 'The Plus trial was already used');
    }

    await tx.plusTrial.createMany({ data: accountIds.map((accountId) => ({ accountId, userId, startedAt: now })) });

    const data = {
      plan: PLUS_PLANS.monthly.plan,
      status: 'trialing' as const,
      trialStartedAt: now,
      currentPeriodEnd: addDays(now, trialDays),
      cancelAtPeriodEnd: true
    };

    await tx.subscription.upsert({
      where: plusSubscriptionKey(userId),
      create: { userId, product: PLUS_SUBSCRIPTION.product, ...data },
      update: data
    });
  }
}
