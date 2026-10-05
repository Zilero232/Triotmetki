import type { NewsItem as NewsItemView } from '@otmetki/schemas';

import type { NewsItem, PremiumOffer } from '../../../../generated';

export type OfferViewInput = {
  offer: PremiumOffer;
  timesSeen: number;
};

export type NewsView = NewsItemView;

export type NewsWithVersion = NewsItem & {
  gameVersion: { version: string } | null;
};
