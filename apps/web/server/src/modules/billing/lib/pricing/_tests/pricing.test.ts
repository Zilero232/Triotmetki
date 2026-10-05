import { describe, expect, it } from 'vitest';

import { PLUS_PLANS, PRICING } from '../../../config/plans.constants';
import { describePlan, isPlusPlan, planPrice, storedPlan } from '../pricing';

describe('planPrice', () => {
  it('charges the list price without a discount', () => {
    expect(planPrice({ plan: 'monthly', discountPercent: null })).toBe(PLUS_PLANS.monthly.priceRub);
  });

  it('applies a percent discount rounded to kopecks', () => {
    const price = planPrice({ plan: 'yearly', discountPercent: 15 });

    expect(price).toBeCloseTo(PLUS_PLANS.yearly.priceRub * 0.85, 2);
    expect(Math.round(price * 100)).toBe(price * 100);
  });

  it('never goes below the minimum payable amount', () => {
    expect(planPrice({ plan: 'monthly', discountPercent: 100 })).toBe(PRICING.minPriceRub);
  });

  it('ignores a discount outside 0–100', () => {
    expect(planPrice({ plan: 'monthly', discountPercent: -20 })).toBe(PLUS_PLANS.monthly.priceRub);
  });
});

describe('describePlan', () => {
  it('mentions the length of the plan', () => {
    expect(describePlan({ plan: 'yearly', isRenewal: false })).toContain(String(PLUS_PLANS.yearly.months));
    expect(describePlan({ plan: 'yearly', isRenewal: true })).not.toBe(describePlan({ plan: 'yearly', isRenewal: false }));
  });
});

describe('isPlusPlan', () => {
  it('accepts only the plans on sale', () => {
    expect(isPlusPlan('monthly')).toBe(true);
    expect(isPlusPlan('halfYearly')).toBe(false);
    expect(isPlusPlan('toString')).toBe(false);
    expect(isPlusPlan(null)).toBe(false);
  });
});

describe('storedPlan', () => {
  it('keeps a plan on sale and falls back to the monthly plan otherwise', () => {
    expect(storedPlan(PLUS_PLANS.yearly.plan)).toBe(PLUS_PLANS.yearly.plan);
    expect(storedPlan('halfYearly')).toBe(PLUS_PLANS.monthly.plan);
    expect(storedPlan(null)).toBe(PLUS_PLANS.monthly.plan);
  });
});
