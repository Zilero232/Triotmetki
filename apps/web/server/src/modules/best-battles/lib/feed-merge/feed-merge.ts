import { sortBy } from 'remeda';

import type { BestBattleRow } from '../../best-battles.types';
import type { BattleKeyInput, MergedFeed, MergeFeedInput, MergePairInput, SortByMetricInput } from './feed-merge.types';

import { BEST_BATTLES } from '../../config/feed.constants';

export const battleKey = ({ source, battle_id, account_id, arena_unique_id }: BattleKeyInput): string =>
  arena_unique_id === null ? `${source}:${battle_id}` : `${account_id}:${arena_unique_id}`;

const mergePair = ({ current, next }: MergePairInput): BestBattleRow => {
  const [primary, secondary] = current.source === 'mod' || next.source !== 'mod' ? [current, next] : [next, current];
  const replayId = primary.replay_id ?? (secondary.source === 'replay' ? secondary.battle_id : secondary.replay_id);

  return { ...primary, replay_id: replayId };
};

export const dedupeBattles = (rows: readonly BestBattleRow[]): BestBattleRow[] => {
  const merged = new Map<string, BestBattleRow>();

  for (const row of rows) {
    const key = battleKey(row);
    const current = merged.get(key);

    merged.set(key, current ? mergePair({ current, next: row }) : row);
  }

  return [...merged.values()];
};

export const sortByMetric = ({ rows, metric }: SortByMetricInput): BestBattleRow[] =>
  sortBy(rows, [(row) => row[metric] ?? -1, 'desc'], [(row) => row.played_at.getTime(), 'desc'], (row) => battleKey(row));

export const mergeFeed = ({ rows, metric, offset, limit }: MergeFeedInput): MergedFeed => {
  const sorted = sortByMetric({ rows: dedupeBattles(rows), metric });
  const end = Math.min(offset + limit, BEST_BATTLES.maxRank);
  const page = sorted.slice(offset, end).map((row, index) => ({ ...row, key: battleKey(row), rank: offset + index + 1 }));

  return {
    rows: page,
    nextOffset: sorted.length > end && end < BEST_BATTLES.maxRank ? end : null
  };
};
