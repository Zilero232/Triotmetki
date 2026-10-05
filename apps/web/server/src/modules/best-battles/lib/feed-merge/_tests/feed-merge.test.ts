import { describe, expect, it } from 'vitest';

import type { BestBattleRow } from '../../../best-battles.types';

import { BEST_BATTLES } from '../../../config/feed.constants';
import { battleKey, dedupeBattles, mergeFeed, sortByMetric } from '../feed-merge';

const row = (overrides: Partial<BestBattleRow> & Pick<BestBattleRow, 'battle_id'>): BestBattleRow => ({
  source: 'mod',
  account_id: 1,
  arena_unique_id: null,
  nickname: 'Tanker',
  tank_id: 1,
  arena_id: 'karelia',
  map_name: null,
  result: 'win',
  damage: 1000,
  assisted: 500,
  spotted: 1,
  frags: 1,
  xp: 800,
  blocked: 200,
  medals: [],
  played_at: new Date('2026-09-20T12:00:00.000Z'),
  replay_id: null,
  ...overrides
});

describe('battleKey', () => {
  it('keys a battle by account and arena so both sources collide', () => {
    const mod = row({ battle_id: 'b1', arena_unique_id: 77 });
    const replay = row({ battle_id: 'r1', source: 'replay', arena_unique_id: 77 });

    expect(battleKey(mod)).toBe(battleKey(replay));
  });

  it('falls back to the source row when the arena is unknown', () => {
    expect(battleKey(row({ battle_id: 'a' }))).not.toBe(battleKey(row({ battle_id: 'b' })));
  });
});

describe('dedupeBattles', () => {
  it('folds a mod battle and its replay into the mod entry carrying the replay id', () => {
    const replay = row({ battle_id: 'replay-1', source: 'replay', arena_unique_id: 5, spotted: null });
    const mod = row({ battle_id: 'battle-1', arena_unique_id: 5 });

    const merged = dedupeBattles([replay, mod]);

    expect(merged).toHaveLength(1);
    expect(merged[0]?.source).toBe('mod');
    expect(merged[0]?.replay_id).toBe('replay-1');
    expect(merged[0]?.spotted).toBe(mod.spotted);
  });

  it('keeps a replay id the mod row already linked', () => {
    const mod = row({ battle_id: 'battle-1', arena_unique_id: 5, replay_id: 'linked' });
    const replay = row({ battle_id: 'other', source: 'replay', arena_unique_id: 5 });

    expect(dedupeBattles([mod, replay])[0]?.replay_id).toBe('linked');
  });

  it('keeps battles of different players in the same arena apart', () => {
    const merged = dedupeBattles([row({ battle_id: 'a', arena_unique_id: 5 }), row({ battle_id: 'b', arena_unique_id: 5, account_id: 2 })]);

    expect(merged).toHaveLength(2);
  });
});

describe('sortByMetric', () => {
  it('orders by the chosen metric, highest first, with missing values last', () => {
    const rows = [row({ battle_id: 'low', spotted: 1 }), row({ battle_id: 'none', spotted: null }), row({ battle_id: 'high', spotted: 9 })];

    expect(sortByMetric({ rows, metric: 'spotted' }).map((entry) => entry.battle_id)).toEqual(['high', 'low', 'none']);
  });

  it('breaks ties by the newer battle', () => {
    const older = row({ battle_id: 'older', played_at: new Date('2026-09-01T00:00:00.000Z') });
    const newer = row({ battle_id: 'newer', played_at: new Date('2026-09-02T00:00:00.000Z') });

    expect(sortByMetric({ rows: [older, newer], metric: 'damage' })[0]?.battle_id).toBe('newer');
  });

  it('ranks by a different metric independently of damage', () => {
    const damage = row({ battle_id: 'damage', damage: 9000, frags: 1 });
    const frags = row({ battle_id: 'frags', damage: 1000, frags: 8 });

    expect(sortByMetric({ rows: [damage, frags], metric: 'frags' })[0]?.battle_id).toBe('frags');
    expect(sortByMetric({ rows: [damage, frags], metric: 'damage' })[0]?.battle_id).toBe('damage');
  });
});

describe('mergeFeed', () => {
  const rows = Array.from({ length: 7 }, (_, index) => row({ battle_id: `b${index}`, damage: 1000 + index * 100 }));

  it('ranks the page continuing from the offset', () => {
    const first = mergeFeed({ rows, metric: 'damage', offset: 0, limit: 3 });
    const second = mergeFeed({ rows, metric: 'damage', offset: 3, limit: 3 });

    expect(first.rows.map((entry) => entry.rank)).toEqual([1, 2, 3]);
    expect(second.rows[0]?.rank).toBe(4);
    expect(second.rows[0]?.damage).toBeLessThan(first.rows.at(-1)?.damage ?? 0);
  });

  it('offers a next offset only while rows remain', () => {
    expect(mergeFeed({ rows, metric: 'damage', offset: 0, limit: 3 }).nextOffset).toBe(3);
    expect(mergeFeed({ rows, metric: 'damage', offset: 6, limit: 3 }).nextOffset).toBeNull();
  });

  it('stops paging at the rank cap', () => {
    const many = Array.from({ length: BEST_BATTLES.maxRank + 5 }, (_, index) => row({ battle_id: `m${index}`, damage: index }));
    const last = mergeFeed({ rows: many, metric: 'damage', offset: BEST_BATTLES.maxRank - 2, limit: 10 });

    expect(last.rows).toHaveLength(2);
    expect(last.nextOffset).toBeNull();
  });
});
