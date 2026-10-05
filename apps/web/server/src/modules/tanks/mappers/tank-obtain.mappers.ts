import type { PremiumOffer } from '../../../../generated';
import type { TankNewsLink, TankNewsRow, TankOfferView } from './tank-obtain.types';

import { toIso } from '../../../common/lib';

export const toTankOffer = (offer: PremiumOffer): TankOfferView => ({
  title: offer.title,
  url: offer.url && URL.canParse(offer.url) ? offer.url : null,
  startsAt: toIso(offer.startsAt),
  endsAt: toIso(offer.endsAt),
  lastSeenAt: offer.lastSeenAt.toISOString(),
  priceRub: offer.priceRub === null ? null : offer.priceRub.toNumber(),
  priceGold: offer.priceGold,
  discountPercent: offer.discountPercent
});

export const toTankNewsLinks = (item: TankNewsRow): TankNewsLink[] =>
  URL.canParse(item.url) ? [{ title: item.title, url: item.url, publishedAt: item.publishedAt.toISOString() }] : [];
