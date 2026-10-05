import { OFFICIAL_RATING_FIELDS, OFFICIAL_RATING_PERIODS } from '@otmetki/schemas';
import { describe, expect, it } from 'vitest';

import { availablePeriods, toOfficialFields, toOfficialRank } from '../official-rating';
import { OFFICIAL_FIELD_TO_LESTA, OFFICIAL_PERIOD_TO_LESTA } from '../official-rating.constants';

describe('toOfficialRank', () => {
  it('keeps value, place and daily change', () => {
    expect(toOfficialRank({ value: 55.2, rank: 120, rank_delta: -4 })).toEqual({ value: 55.2, rank: 120, rankDelta: -4 });
  });

  it('distinguishes a missing entry from an unranked one', () => {
    expect(toOfficialRank(null)).toBeNull();
    expect(toOfficialRank({ value: 12, rank: 0, rank_delta: null })).toEqual({ value: 12, rank: null, rankDelta: null });
  });
});

describe('toOfficialFields', () => {
  it('renames the Lesta rank fields and leaves out the ones Lesta did not rank', () => {
    const fields = toOfficialFields({
      account_id: 1,
      wins_ratio: { value: 51.3, rank: 10, rank_delta: 2 },
      damage_avg: null,
      xp_max: { value: null, rank: null, rank_delta: null }
    });

    expect(fields).toEqual({ winRate: { value: 51.3, rank: 10, rankDelta: 2 } });
  });

  it('maps every official field onto a distinct Lesta rank field', () => {
    expect(Object.keys(OFFICIAL_FIELD_TO_LESTA).toSorted()).toEqual([...OFFICIAL_RATING_FIELDS].toSorted());
    expect(new Set(Object.values(OFFICIAL_FIELD_TO_LESTA)).size).toBe(OFFICIAL_RATING_FIELDS.length);
  });
});

describe('availablePeriods', () => {
  it('keeps only the periods Lesta offers, in the wanted order', () => {
    expect(availablePeriods({ wanted: ['28d', '7d'], lestaTypes: [OFFICIAL_PERIOD_TO_LESTA['7d'], 'all'] })).toEqual(['7d']);
  });

  it('offers nothing when Lesta lists no known type', () => {
    expect(availablePeriods({ wanted: OFFICIAL_RATING_PERIODS, lestaTypes: ['365'] })).toEqual([]);
  });
});
