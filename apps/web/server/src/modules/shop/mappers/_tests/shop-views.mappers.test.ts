import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { BonusCode, PremiumOffer } from '../../../../../generated';

import { Prisma } from '../../../../../generated';
import { toBonusCodeView, toOfferView } from '../shop-views.mappers';

const SEEN = new Date('2026-09-20T00:00:00Z');

const code = (fields: Partial<BonusCode>) =>
  Object.assign(mock<BonusCode>({ discoveredAt: SEEN }), { expiresAt: null, lastReportAt: null, sourceUrl: null, ...fields });

const offer = (fields: Partial<PremiumOffer>) =>
  Object.assign(mock<PremiumOffer>({ firstSeenAt: SEEN }), {
    url: null,
    image: null,
    priceRub: null,
    startsAt: null,
    endsAt: null,
    ...fields
  });

describe('toBonusCodeView', () => {
  it('keeps a well-formed reward list', () => {
    expect(toBonusCodeView(code({ rewards: ['7 days of premium'] })).rewards).toEqual(['7 days of premium']);
  });

  it('shows no rewards for a malformed stored list', () => {
    expect(toBonusCodeView(code({ rewards: { gold: 100 } })).rewards).toEqual([]);
  });

  it('drops a source link that is not http', () => {
    expect(toBonusCodeView(code({ rewards: [], sourceUrl: 'javascript:alert(1)' })).sourceUrl).toBeNull();
  });
});

describe('toOfferView', () => {
  it('converts decimal prices to numbers and keeps missing prices missing', () => {
    const view = toOfferView({ offer: offer({ priceRub: new Prisma.Decimal('499.90') }), timesSeen: 2 });

    expect(view).toMatchObject({ priceRub: 499.9, timesSeen: 2 });
  });

  it('counts an offer as seen at least once', () => {
    expect(toOfferView({ offer: offer({}), timesSeen: 0 }).timesSeen).toBe(1);
  });

  it('only exposes http links and images', () => {
    const view = toOfferView({ offer: offer({ url: '//cdn.test/offer', image: 'https://cdn.test/offer.png' }), timesSeen: 1 });

    expect(view).toMatchObject({ url: null, image: 'https://cdn.test/offer.png' });
  });
});
