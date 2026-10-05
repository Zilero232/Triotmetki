import type { ModeRank } from '@otmetki/schemas';

import { sortBy, sumBy } from 'remeda';

import type { RankedTank, RankModeTanksInput } from './mode-rank.types';

import { roundTo, winRateShare } from '../../../../common/lib';
import { MODE_RANKING } from '../../config';
import { MODE_RANK_SCORE } from './mode-rank.constants';

const rankAt = (position: number): ModeRank => MODE_RANKING.shares.find((share) => position < share.upTo)?.rank ?? 'D';

export const rankModeTanks = ({ tanks, minBattles }: RankModeTanksInput): Map<number, RankedTank> => {
  const eligible = tanks.filter((tank) => tank.battles >= minBattles && tank.decided > 0);
  const average = winRateShare({ wins: sumBy(eligible, (tank) => tank.wins), battles: sumBy(eligible, (tank) => tank.decided) });

  if (average === null) {
    return new Map();
  }

  const prior = MODE_RANKING.priorBattles;

  const scored = eligible.map((tank) => ({
    tankId: tank.tankId,
    score: roundTo({ value: ((tank.wins + prior * average) / (tank.decided + prior) - average) * 100, digits: MODE_RANK_SCORE.digits })
  }));

  const sorted = sortBy(scored, [(tank) => tank.score, 'desc']);

  return new Map(sorted.map((tank, index) => [tank.tankId, { score: tank.score, rank: rankAt(index / sorted.length) }]));
};
