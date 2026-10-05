import type { PlusCountKey, PlusFeature } from '@otmetki/schemas';

import type { Payment, Subscription } from '../../../generated';
import type { PrismaExecutor } from '../../core';
import type { PlusPlan } from './lib/pricing/pricing.types';
import type { YooKassaPayment } from './lib/yookassa/yookassa.types';

type SavedMethod = {
  id: string;
  title: string | null;
};

export type ActivateInput = {
  db: PrismaExecutor;
  userId: string;
  plan: PlusPlan;
  method: SavedMethod | null;
  now: Date;
};

export type ActivationInput = Pick<ActivateInput, 'method' | 'now' | 'plan'> & {
  current: Subscription | null;
};

export type GrantDaysInput = {
  db: PrismaExecutor;
  userId: string;
  days: number;
  now: Date;
};

export type CheckoutInput = {
  userId: string;
  plan: PlusPlan;
  promoCode?: string;
};

export type RequestPaymentInput = {
  userId: string;
  plan: PlusPlan;
  amountRub: number;
  promoCode: string | undefined;
};

export type RecordPendingInput = {
  userId: string;
  plan: PlusPlan;
  amountRub: number;
  paymentId: string;
  promoCode: string | null;
};

export type RecordPendingChargeInput = {
  subscription: Subscription;
  paymentId: string;
  plan: PlusPlan;
  amountRub: number;
};

export type PromoCodeInput = {
  userId: string;
  code: string;
};

export type RecordRedemptionInput = PromoCodeInput & {
  db: PrismaExecutor;
};

export type ClaimRedemptionInput = RecordRedemptionInput & {
  now: Date;
  reservedUntil?: Date;
};

export type ReleasePromoInput = {
  userId: string;
  code: string | undefined;
};

export type ReleaseReservationInput = RecordRedemptionInput & {
  lapsedBy?: Date;
};

export type RevokeRefundInput = {
  paymentId: string;
  now: Date;
};

export type FullRefundInput = {
  paymentId: string;
  row: Payment;
};

export type RevokeRefundedInput = {
  tx: PrismaExecutor;
  row: Payment;
  now: Date;
};

export type SubscriptionPaidLastInput = {
  tx: PrismaExecutor;
  row: Payment;
};

export type SucceedPaymentInput = {
  row: Payment;
  remote: YooKassaPayment;
};

export type ActivatePaidInput = {
  tx: PrismaExecutor;
  row: Payment;
  method: SavedMethod | null;
  now: Date;
};

export type SettledPayment = {
  referrer: string | null;
};

export type ClaimTrialInput = {
  tx: PrismaExecutor;
  userId: string;
  trialDays: number;
  now: Date;
};

export type RegisterReferralInput = {
  userId: string;
  referrerId: string;
};

export type RewardReferralInput = {
  db: PrismaExecutor;
  userId: string;
  now: Date;
};

export type SetAutoRenewInput = {
  userId: string;
  isEnabled: boolean;
};

export type LimitInput = {
  userId: string;
  key: PlusCountKey;
};

export type AssertFeatureInput = {
  userId: string;
  feature: PlusFeature;
};

export type AssertWithinLimitInput = LimitInput & {
  count: number;
  feature?: PlusFeature;
};

export type EntitlementChange = {
  userId: string;
  isLocal: boolean;
};

export type EntitlementMessageInput = {
  channel: string;
  message: string;
};
