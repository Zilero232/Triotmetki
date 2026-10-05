import { describe, expect, it } from 'vitest';

import type { RankableTank } from '../mode-rank.types';

import { MODE_RANKING } from '../../../config/modes.constants';
import { rankModeTanks } from '../mode-rank';

const tank = (tankId: number, wins: number, decided: number): RankableTank => ({ tankId, battles: decided, wins, decided });

const TEN = Array.from({ length: 10 }, (_, index) => tank(index + 1, 40 + index * 2, 100));

describe('rankModeTanks', () => {
  it('ranks a stronger tank no lower than a weaker one', () => {
    const ranked = rankModeTanks({ tanks: TEN, minBattles: 1 });
    const order = MODE_RANKING.shares.map((share) => share.rank);
    const best = ranked.get(10);
    const worst = ranked.get(1);

    expect(best && worst && order.indexOf(best.rank) <= order.indexOf(worst.rank)).toBe(true);
    expect((best?.score ?? 0) > (worst?.score ?? 0)).toBe(true);
  });

  it('uses every rank for a large enough list', () => {
    const ranked = rankModeTanks({ tanks: TEN, minBattles: 1 });

    expect(new Set([...ranked.values()].map((entry) => entry.rank))).toEqual(new Set(MODE_RANKING.shares.map((share) => share.rank)));
  });

  it('pulls a tiny sample towards the average', () => {
    const ranked = rankModeTanks({ tanks: [...TEN, tank(99, 3, 3)], minBattles: 1 });

    expect(ranked.get(99)?.score ?? 0).toBeLessThan(ranked.get(10)?.score ?? 0);
  });

  it('leaves out tanks under the sample floor', () => {
    expect(rankModeTanks({ tanks: TEN, minBattles: 101 }).size).toBe(0);
  });
});
