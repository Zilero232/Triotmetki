import type { FitCandidate, RankedCandidate, RankTanksInput, ToCandidateInput } from './tank-fit.types';

import { MISSION_METRIC_FIELD } from '../../config/suitable-tanks.constants';
import { TANK_FIT } from './tank-fit.constants';

export const toCandidate = ({ row, metric }: ToCandidateInput): FitCandidate => ({
  tankId: row.tankId,
  value: row[MISSION_METRIC_FIELD[metric]],
  winRate: row.winRate,
  battles: row.battles
});

export const rankTanks = ({ candidates, limit }: RankTanksInput): RankedCandidate[] => {
  const sorted = [...candidates].sort((a, b) => b.value - a.value || b.winRate - a.winRate || b.battles - a.battles);
  const last = Math.max(1, sorted.length - 1);
  const ranked = sorted.map((candidate, index) => ({
    ...candidate,
    score: sorted.length === 1 ? 100 : Math.round(((last - index) / last) * 100 * TANK_FIT.scorePrecision) / TANK_FIT.scorePrecision
  }));

  return limit === undefined ? ranked : ranked.slice(0, limit);
};
