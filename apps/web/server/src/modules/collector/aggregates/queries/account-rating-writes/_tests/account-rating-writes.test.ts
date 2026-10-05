import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { Prisma } from '../../../../../../../generated';

import { RATING_PERIOD_FROM_DB, RATING_PERIOD_SQL } from '../../../../../../common/lib';
import { replaceAccountRatingsSql, replaceAccountTankRatingsSql } from '../account-rating-writes';

const ACCOUNT_ID = 9_007_199_254_740_993n;

const rating: Prisma.AccountRatingCreateManyInput = {
  accountId: ACCOUNT_ID,
  period: 'b1000',
  battles: 1_000,
  winRate: 52.5,
  avgDamage: 1_800.25,
  avgFrags: 0.9,
  avgTier: null,
  wn8: 1_650.5,
  eff: null,
  broneIndex: null,
  fromCapturedAt: new Date('2026-09-01T00:00:00Z'),
  toCapturedAt: new Date('2026-09-30T00:00:00Z')
};

const tankRating: Prisma.AccountTankRatingCreateManyInput = {
  accountId: ACCOUNT_ID,
  tankId: 1,
  period: 'h24',
  battles: 10,
  winRate: 60,
  avgDamage: 2_000,
  avgFrags: 1,
  avgXp: 700,
  wn8: null,
  damagePercentile: 55
};

const recordsOf = (sql: Prisma.Sql) => {
  const text = sql.values.find((value): value is string => typeof value === 'string');

  return z.array(z.record(z.string(), z.unknown())).parse(JSON.parse(text ?? '[]'));
};

describe('replaceAccountRatingsSql', () => {
  it('sends each period in its database spelling', () => {
    const [record] = recordsOf(replaceAccountRatingsSql({ accountId: ACCOUNT_ID, rows: [rating] }));

    expect(record?.period).toBe(RATING_PERIOD_SQL[RATING_PERIOD_FROM_DB[rating.period]]);
  });

  it('scopes the upsert and the stale-row deletion to the rated account', () => {
    const sql = replaceAccountRatingsSql({ accountId: ACCOUNT_ID, rows: [rating] });

    expect(sql.values.filter((value) => value === ACCOUNT_ID)).toHaveLength(2);
  });

  it('still deletes the account ratings when no period has battles', () => {
    const sql = replaceAccountRatingsSql({ accountId: ACCOUNT_ID, rows: [] });

    expect(recordsOf(sql)).toEqual([]);
    expect(sql.sql).toContain('DELETE FROM account_rating');
  });

  it('rewrites a stored row only when one of its values changed', () => {
    expect(replaceAccountRatingsSql({ accountId: ACCOUNT_ID, rows: [rating] }).sql).toContain('IS DISTINCT FROM');
  });

  it('keeps nullable ratings as explicit nulls', () => {
    const [record] = recordsOf(replaceAccountRatingsSql({ accountId: ACCOUNT_ID, rows: [rating] }));

    expect(record).toMatchObject({ avg_tier: null, eff: null, brone_index: null });
  });
});

describe('replaceAccountTankRatingsSql', () => {
  it('sends each period in its database spelling', () => {
    const [record] = recordsOf(replaceAccountTankRatingsSql({ accountId: ACCOUNT_ID, rows: [tankRating] }));

    expect(record).toMatchObject({ tank_id: tankRating.tankId, period: RATING_PERIOD_SQL[RATING_PERIOD_FROM_DB[tankRating.period]] });
  });

  it('scopes the upsert and the stale-row deletion to the rated account', () => {
    const sql = replaceAccountTankRatingsSql({ accountId: ACCOUNT_ID, rows: [tankRating] });

    expect(sql.values.filter((value) => value === ACCOUNT_ID)).toHaveLength(2);
  });

  it('matches stale rows on both the tank and the period', () => {
    expect(replaceAccountTankRatingsSql({ accountId: ACCOUNT_ID, rows: [] }).sql).toContain(
      'incoming.tank_id = stale.tank_id AND incoming.period = stale.period'
    );
  });
});
