import { mock } from 'vitest-mock-extended';

import type { AppConfigService } from '../../../../config';
import type { PrismaService } from '../../../../core';
import type { YooKassaClient } from '../../lib/yookassa';
import type { EntitlementsBusService } from '../entitlements-bus.service';

import { EntitlementsService } from '../entitlements.service';
import { PromoService } from '../promo.service';
import { ReferralService } from '../referral.service';
import { SubscriptionService } from '../subscription.service';
import { WebhookService } from '../webhook.service';

export const BILLING_DB_TABLES = ['user', 'player', 'promo_code', 'promo_redemption', 'payment', 'subscription', 'referral', 'plus_trial'] as const;

export const createBillingServices = (prisma: PrismaService) => {
  const config = mock<AppConfigService>();
  const yookassa = mock<YooKassaClient>({ isConfigured: true });

  config.get.mockReturnValue(true);

  const entitlements = new EntitlementsService(prisma, mock<EntitlementsBusService>());
  const subscriptions = new SubscriptionService(prisma, config, entitlements);
  const promos = new PromoService(prisma, subscriptions, entitlements);
  const referrals = new ReferralService(prisma, subscriptions);
  const payments = new WebhookService(prisma, yookassa, subscriptions, entitlements, promos, referrals);

  return { yookassa, entitlements, subscriptions, promos, referrals, payments };
};

export const seedUser = (prisma: PrismaService, id: string) => prisma.user.create({ data: { id, name: id, email: `${id}@otmetki.test` } });
