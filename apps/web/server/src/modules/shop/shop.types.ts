import type {
  BonusCodeVerdict,
  BonusCode as BonusCodeView,
  newsPageSchema,
  newsQuerySchema,
  PremiumOffer as PremiumOfferView
} from '@otmetki/schemas';
import type { z } from 'zod';

import type { BonusCode, BonusCodeStatus } from '../../../generated';
import type { ListingItem } from '../../lib/scrape';
import type { offerArchiveSchema, offerPageSchema, offersQuerySchema } from './dto/shop.schemas';
import type { OfferDetail } from './lib/offer-detail/offer-detail.types';
import type { NamedVehicle } from './lib/tank-mentions/tank-mentions.types';

export type OffersQuery = z.output<typeof offersQuerySchema>;
export type OfferPage = z.infer<typeof offerPageSchema>;
export type OfferArchive = z.infer<typeof offerArchiveSchema>;
export type NewsQuery = z.output<typeof newsQuerySchema>;
export type NewsPage = z.infer<typeof newsPageSchema>;

export type DiscoverBonusCodeInput = Pick<BonusCode, 'code' | 'expiresAt' | 'source' | 'sourceUrl' | 'title'>;

export type ReportBonusCodeInput = {
  userId: string;
  code: string;
  verdict: BonusCodeVerdict;
  ip: string | null;
};

export type ListBonusCodesInput = {
  status: BonusCodeStatus | undefined;
};

export type ScrapeSummary = {
  seen: number;
  created: number;
  notified: number;
};

export type { BonusCodeView, PremiumOfferView };

export type RecountInput = {
  code: string;
  now: Date;
};

export type TalliesInput = {
  codes: string[];
  now: Date;
};

export type StoreOfferInput = {
  item: ListingItem;
  detail: OfferDetail | null;
  vehicles: readonly NamedVehicle[];
  now: Date;
};

export type ArchiveEntry = {
  appearances: Date[];
  lastDiscountPercent: number | null;
};

export type AnnounceReturnInput = {
  tankId: number;
  tankName: string;
  discountPercent: number | null;
  offerId: string;
  now: Date;
};
