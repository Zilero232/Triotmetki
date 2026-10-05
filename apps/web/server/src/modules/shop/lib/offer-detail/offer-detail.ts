import { unique } from 'remeda';

import type { OfferDetail, OfferDiscount, ParseOfferDetailInput } from './offer-detail.types';

import { latestDeadline, textLines } from '../../../../lib/scrape';
import { BONUS_CODE } from '../../config/bonus-codes.constants';
import { OFFER_SCRAPE } from '../../config/offers.constants';
import { OFFER_DETAIL } from './offer-detail.constants';

export const discountsOf = (lines: readonly string[]): OfferDiscount[] =>
  lines.flatMap((line, index) => {
    const found = OFFER_DETAIL.discount.exec(line);

    return found ? [{ percent: Number(found[1]), context: `${line} ${lines[index + 1] ?? ''}`.trim() }] : [];
  });

export const bonusCodesOf = (lines: readonly string[]): string[] => unique(lines.filter((line) => BONUS_CODE.pattern.test(line)));

export const parseOfferDetail = ({ $, publishedAt }: ParseOfferDetailInput): OfferDetail => {
  const lines = textLines($);
  const text = lines.join('\n');
  const discounts = discountsOf(lines);
  const tankDiscounts = discounts.filter((discount) => OFFER_SCRAPE.tankKeyword.test(discount.context)).map((discount) => discount.percent);

  return {
    text,
    discounts,
    tankDiscountPercent: tankDiscounts.length === 0 ? null : Math.max(...tankDiscounts),
    endsAt: latestDeadline({ text, reference: publishedAt }),
    bonusCodes: bonusCodesOf(lines)
  };
};
