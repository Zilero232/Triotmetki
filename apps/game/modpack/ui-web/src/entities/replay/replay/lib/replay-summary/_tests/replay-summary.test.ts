import { describe, expect, it } from 'vitest';

import { replayItem } from '../../../_tests/fixtures';
import { summarizeReplays } from '../replay-summary';

const ITEMS = [
  replayItem({ result: 'win', damage: 3000, xp: 1000, assist: null }),
  replayItem({ result: 'loss', damage: 1000, xp: 500, assist: 400 }),
  replayItem({ result: null, damage: null, xp: null, assist: null })
];

describe(summarizeReplays, () => {
  it('rates wins over the battles with a known result and averages the known numbers only', () => {
    const summary = summarizeReplays(ITEMS);

    expect(summary).toEqual({ battles: 3, wins: 1, winRate: 50, avgDamage: 2000, avgAssist: 400, avgXp: 750 });
  });

  it('has no rates without data', () => {
    const summary = summarizeReplays([]);

    expect(summary).toEqual({ battles: 0, wins: 0, winRate: null, avgDamage: null, avgAssist: null, avgXp: null });
  });
});
