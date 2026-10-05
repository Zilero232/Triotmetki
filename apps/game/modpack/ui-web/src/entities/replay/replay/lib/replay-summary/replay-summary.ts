import { meanBy } from 'remeda';

import type { ReplayItem } from '../../model/schemas';
import type { AverageOfInput, ReplaySummary } from './replay-summary.types';

const averageOf = ({ items, pick }: AverageOfInput): number | null => {
  const known = items.map(pick).filter((value): value is number => value !== null);

  return known.length > 0 ? meanBy(known, (value) => value) : null;
};

export const summarizeReplays = (items: readonly ReplayItem[]): ReplaySummary => {
  const decided = items.filter((item) => item.result !== null);
  const wins = decided.filter((item) => item.result === 'win').length;

  return {
    battles: items.length,
    wins,
    winRate: decided.length > 0 ? (wins / decided.length) * 100 : null,
    avgDamage: averageOf({ items, pick: (item) => item.damage }),
    avgAssist: averageOf({ items, pick: (item) => item.assist }),
    avgXp: averageOf({ items, pick: (item) => item.xp })
  };
};
