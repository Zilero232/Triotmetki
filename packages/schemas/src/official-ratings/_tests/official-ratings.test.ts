import { describe, expect, it } from 'vitest';

import { OFFICIAL_RATINGS } from '../official-ratings.constants';
import {
  officialNeighborsQuerySchema,
  officialRankHistoryQuerySchema,
  officialRatingStatsSchema,
  officialTopQuerySchema
} from '../official-ratings.schemas';

describe('official ratings schemas', () => {
  it('defaults to the overall server rating', () => {
    expect(officialTopQuerySchema.parse({})).toMatchObject({
      period: OFFICIAL_RATINGS.defaultPeriod,
      field: OFFICIAL_RATINGS.defaultField,
      limit: OFFICIAL_RATINGS.top.defaultLimit,
      page: 1
    });
  });

  it('refuses limits and windows past their caps', () => {
    expect(officialTopQuerySchema.safeParse({ limit: OFFICIAL_RATINGS.top.maxLimit + 1 }).success).toBe(false);
    expect(officialNeighborsQuerySchema.safeParse({ limit: OFFICIAL_RATINGS.neighbors.maxLimit + 1 }).success).toBe(false);
    expect(officialRankHistoryQuerySchema.safeParse({ days: OFFICIAL_RATINGS.history.maxDays + 1 }).success).toBe(false);
  });

  it('accepts a period ranked on only some fields', () => {
    const parsed = officialRatingStatsSchema.parse({ period: '7d', fields: { winRate: { value: 55, rank: 10, rankDelta: -2 } } });

    expect(parsed.fields.winRate?.rank).toBe(10);
    expect(parsed.fields.avgDamage).toBeUndefined();
  });
});

describe('officialTopQuerySchema page', () => {
  it('caps the page so anonymous visitors cannot spend the Lesta quota on endless pages', () => {
    expect(officialTopQuerySchema.safeParse({ page: String(OFFICIAL_RATINGS.top.maxPage + 1) }).success).toBe(false);
  });
});
