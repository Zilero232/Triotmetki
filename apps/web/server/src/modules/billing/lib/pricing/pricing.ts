import { clamp } from 'remeda';

import type { DescribePlanInput, PlanPriceInput, PlusPlan } from './pricing.types';

import { PAYMENT_DESCRIPTION, PLUS_PLANS, PRICING } from '../../config/plans.constants';

export const planPrice = ({ plan, discountPercent }: PlanPriceInput): number => {
  const base = PLUS_PLANS[plan].priceRub;
  const discount = clamp(discountPercent ?? 0, { min: 0, max: 100 });

  return Math.max(PRICING.minPriceRub, Math.round(base * (100 - discount)) / 100);
};

export const describePlan = ({ plan, isRenewal }: DescribePlanInput): string =>
  (isRenewal ? PAYMENT_DESCRIPTION.renewal : PAYMENT_DESCRIPTION.purchase).replace('{months}', String(PLUS_PLANS[plan].months));

export const isPlusPlan = (plan: string | null): plan is PlusPlan => plan !== null && Object.hasOwn(PLUS_PLANS, plan);

export const storedPlan = (plan: string | null): PlusPlan => (isPlusPlan(plan) ? plan : PLUS_PLANS.monthly.plan);
