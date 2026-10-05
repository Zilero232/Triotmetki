import { describe, expect, it } from 'vitest';

import type { AccountStatistics, BattleStatsBlock, TankStats } from '../../../../../../lib/lesta';

import { ACCOUNT_MODE_SOURCES } from '../../mode-blocks/mode-blocks.constants';
import { accountModeRows, tankModeRows } from '../mode-stats';

const block = (battles: number, extra: Partial<BattleStatsBlock> = {}): BattleStatsBlock => ({
  battles,
  wins: Math.floor(battles / 2),
  losses: battles - Math.floor(battles / 2),
  draws: 0,
  xp: battles * 600,
  damage_dealt: battles * 1200,
  damage_received: battles * 800,
  frags: battles,
  spotted: battles,
  capture_points: 0,
  dropped_capture_points: 0,
  hits: battles * 4,
  shots: battles * 5,
  survived_battles: Math.floor(battles / 3),
  ...extra
});

const statistics = (blocks: Partial<AccountStatistics>): AccountStatistics => ({ all: block(1000), ...blocks });

describe('accountModeRows', () => {
  it('folds the three Global Map blocks into one mode', () => {
    const rows = accountModeRows({
      accountId: 1n,
      statistics: statistics({ globalmap_absolute: block(5), globalmap_middle: block(7), globalmap_champion: block(0) })
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ mode: 'globalmap', battles: 12 });
  });

  it('writes nothing for modes the player never played or Lesta did not return', () => {
    expect(accountModeRows({ accountId: 1n, statistics: statistics({ epic: block(0) }) })).toEqual([]);
  });

  it('maps every source block to its own stats mode', () => {
    const played = Object.fromEntries(Object.values(ACCOUNT_MODE_SOURCES).flatMap((keys) => keys.map((key) => [key, block(3)])));
    const rows = accountModeRows({ accountId: 1n, statistics: statistics(played) });

    expect(rows.map((row) => row.mode).toSorted()).toEqual(Object.keys(ACCOUNT_MODE_SOURCES).toSorted());
  });
});

describe('tankModeRows', () => {
  it('keeps one row per tank and played mode', () => {
    const stats: TankStats[] = [
      { tank_id: 1, account_id: 9, mark_of_mastery: 0, all: block(50), epic: block(4), ranked_battles: block(0) },
      { tank_id: 2, account_id: 9, mark_of_mastery: 0, all: block(20), stronghold_skirmish: block(6) }
    ];

    expect(tankModeRows({ accountId: 9n, stats }).map((row) => [row.tankId, row.mode, row.battles])).toEqual([
      [1, 'epic', 4],
      [2, 'strongholdSkirmish', 6]
    ]);
  });
});
