import { z } from 'zod';

import { isoDateTimeSchema, uuidSchema } from '../common/primitives/primitives.schemas';
import { plusStateSchema } from '../plus/plus.schemas';
import { PROMO_CODE } from './billing.constants';

const plusPlanSchema = z.enum(['monthly', 'quarterly', 'yearly']);

export const subscriptionStatusSchema = z.enum(['trialing', 'active', 'pastDue', 'canceled', 'expired']);

export const paymentStatusSchema = z.enum(['pending', 'waitingForCapture', 'succeeded', 'canceled', 'refunded']);

export const planOfferSchema = z.object({
  plan: plusPlanSchema,
  months: z.number().int().positive(),
  priceRub: z.number().positive()
});

export const plansSchema = z.array(planOfferSchema);

export const checkoutSchema = z.object({
  plan: plusPlanSchema,
  promoCode: z.string().trim().min(PROMO_CODE.minLength).max(PROMO_CODE.maxLength).optional()
});

export const checkoutResultSchema = z.object({
  confirmationUrl: z.url(),
  paymentId: z.string()
});

export const billingStatusSchema = z.object({
  isPlus: z.boolean(),
  plan: plusPlanSchema.nullable(),
  status: subscriptionStatusSchema.nullable(),
  currentPeriodEnd: isoDateTimeSchema.nullable(),
  cancelAtPeriodEnd: z.boolean(),
  card: z.string().nullable(),
  isRecurringAvailable: z.boolean(),
  isCheckoutAvailable: z.boolean(),
  plus: plusStateSchema,
  plans: plansSchema
});

export const paymentHistoryItemSchema = z.object({
  id: uuidSchema,
  amount: z.number(),
  currency: z.string(),
  status: paymentStatusSchema,
  plan: plusPlanSchema.nullable(),
  isAutoCharge: z.boolean(),
  promoCode: z.string().nullable(),
  createdAt: isoDateTimeSchema,
  paidAt: isoDateTimeSchema.nullable()
});

export const paymentHistorySchema = z.array(paymentHistoryItemSchema);

export const promoRedeemSchema = z.object({
  code: z.string().trim().min(PROMO_CODE.minLength).max(PROMO_CODE.maxLength)
});

export const referralSchema = z.object({
  referrerId: uuidSchema
});
