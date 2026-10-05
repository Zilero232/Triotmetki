import type { PlusCountKey, PlusFeature } from '@otmetki/schemas';

import type { PrismaExecutor } from '../../core';
import type { PlusPlan } from './lib';

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
