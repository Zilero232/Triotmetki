import type { ReplayItem } from '../../model/schemas';

export type ReplaySummary = {
  battles: number;
  wins: number;
  winRate: number | null;
  avgDamage: number | null;
  avgAssist: number | null;
  avgXp: number | null;
};

export type AverageOfInput = { items: readonly ReplayItem[]; pick: (item: ReplayItem) => number | null };
