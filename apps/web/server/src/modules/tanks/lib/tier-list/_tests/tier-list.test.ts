import { describe, expect, it } from 'vitest';

import type { TierListCandidate } from '../tier-list.types';

import { TIER_LIST } from '../../../config/tanks.constants';
import { rankTierList } from '../tier-list';

const candidate = ({
  tankId,
  winRateDiff,
  previousWinRateDiff = null
}: Pick<TierListCandidate, 'tankId' | 'winRateDiff'> & Partial<Pick<TierListCandidate, 'previousWinRateDiff'>>): TierListCandidate => ({
  tankId,
  winRateDiff,
  battles: 1_000,
  storedRank: null,
  previousWinRateDiff
});

const ranks = TIER_LIST.bands.map((band) => band.rank);

describe('rankTierList', () => {
  const field = Array.from({ length: 100 }, (_, index) => candidate({ tankId: index + 1, winRateDiff: (50 - index) / 1_000 }));

  it('never ranks a weaker tank above a stronger one', () => {
    const ranked = rankTierList(field);

    ranked.slice(1).forEach((current, index) => {
      const previous = ranked[index];

      expect(previous && ranks.indexOf(previous.rank)).toBeLessThanOrEqual(ranks.indexOf(current.rank));
    });
  });

  it('gives the strongest tank the top band and the weakest the bottom one', () => {
    const ranked = rankTierList(field);

    expect(ranked[0]?.rank).toBe(ranks[0]);
    expect(ranked.at(-1)?.rank).toBe(ranks.at(-1));
  });

  it('keeps a rank the collector already stored', () => {
    const [ranked] = rankTierList([{ ...candidate({ tankId: 1, winRateDiff: -0.2 }), storedRank: ranks[0] ?? 'S' }]);

    expect(ranked?.rank).toBe(ranks[0]);
  });

  it('reports a trend only when the change clears the threshold', () => {
    const [flat] = rankTierList([candidate({ tankId: 1, winRateDiff: 0.01, previousWinRateDiff: 0.01 + TIER_LIST.trendThreshold / 2 })]);
    const [up] = rankTierList([candidate({ tankId: 1, winRateDiff: 0.01 + TIER_LIST.trendThreshold * 2, previousWinRateDiff: 0.01 })]);
    const [unknown] = rankTierList([candidate({ tankId: 1, winRateDiff: 0.01 })]);

    expect(flat?.trend).toBe('flat');
    expect(up?.trend).toBe('up');
    expect(unknown?.trend).toBeNull();
  });
});
