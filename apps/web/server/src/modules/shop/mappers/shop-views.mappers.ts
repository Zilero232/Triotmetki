import { z } from 'zod';

import type { BonusCode } from '../../../../generated';
import type { BonusCodeView, PremiumOfferView } from '../shop.types';
import type { NewsView, NewsWithVersion, OfferViewInput } from './shop-views.types';

import { toIso } from '../../../common/lib';
import { httpUrl } from '../../../lib/scrape';
import { NEWS_KIND_FROM_DB } from '../config/enum-mapping.constants';

const rewardsSchema = z.array(z.string());

export const toBonusCodeView = (row: BonusCode): BonusCodeView => {
  const rewards = rewardsSchema.safeParse(row.rewards);

  return {
    code: row.code,
    title: row.title,
    rewards: rewards.success ? rewards.data : [],
    source: row.source,
    sourceUrl: httpUrl(row.sourceUrl),
    status: row.status,
    workingReports: row.workingReports,
    expiredReports: row.expiredReports,
    discoveredAt: row.discoveredAt.toISOString(),
    expiresAt: toIso(row.expiresAt),
    lastReportAt: toIso(row.lastReportAt)
  };
};

export const toOfferView = ({ offer, timesSeen }: OfferViewInput): PremiumOfferView => ({
  id: offer.id,
  title: offer.title,
  url: httpUrl(offer.url),
  image: httpUrl(offer.image),
  tankIds: offer.tankIds,
  priceRub: offer.priceRub === null ? null : Number(offer.priceRub),
  priceGold: offer.priceGold,
  discountPercent: offer.discountPercent,
  startsAt: toIso(offer.startsAt),
  endsAt: toIso(offer.endsAt),
  firstSeenAt: offer.firstSeenAt.toISOString(),
  timesSeen: Math.max(1, timesSeen)
});

export const toNewsView = (item: NewsWithVersion): NewsView => ({
  id: item.id,
  source: item.source,
  url: item.url,
  kind: NEWS_KIND_FROM_DB[item.kind],
  title: item.title,
  summary: item.summary,
  image: item.image,
  tankIds: item.tankIds,
  gameVersion: item.gameVersion?.version ?? null,
  publishedAt: item.publishedAt.toISOString()
});
