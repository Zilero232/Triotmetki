import { CAREER_MODES } from '@otmetki/schemas';
import { describe, expect, it } from 'vitest';

import type { BattleStatsBlock } from '../../../../../../lib/lesta';

import { mergeBlocks, modeBlockOf } from '../mode-blocks';
import { ACCOUNT_MODE_SOURCES, CAREER_MODE_FROM_DB, MODE_STATS_MODES, TANK_MODE_SOURCES } from '../mode-blocks.constants';

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

describe('mergeBlocks', () => {
  it('returns null when no block has battles', () => {
    expect(mergeBlocks([block(0), block(0)])).toBeNull();
  });

  it('sums totals, weights averages by battles and keeps the highest record', () => {
    const merged = mergeBlocks([block(10, { avg_damage_blocked: 100, max_damage: 3000 }), block(30, { avg_damage_blocked: 200, max_damage: 5000 })]);

    expect(merged?.battles).toBe(40);
    expect(merged?.damage_dealt).toBe(40 * 1200);
    expect(merged?.avg_damage_blocked).toBeCloseTo((10 * 100 + 30 * 200) / 40);
    expect(merged?.max_damage).toBe(5000);
  });

  it('averages only over the blocks that report the value', () => {
    expect(mergeBlocks([block(10, { avg_damage_assisted: 300 }), block(30)])?.avg_damage_assisted).toBe(300);
    expect(mergeBlocks([block(5)])?.avg_damage_assisted).toBeUndefined();
  });
});

describe('modeBlockOf', () => {
  it('skips a value that is not a block and merges the rest', () => {
    expect(modeBlockOf({ source: { a: block(4), b: { battles: 'x' } }, keys: ['a', 'b'] })?.battles).toBe(4);
  });

  it('returns null for keys Lesta did not send', () => {
    expect(modeBlockOf({ source: {}, keys: ['epic'] })).toBeNull();
  });
});

describe('mode tables', () => {
  it('cover the same stats modes and map each onto a distinct career mode', () => {
    expect(Object.keys(ACCOUNT_MODE_SOURCES).toSorted()).toEqual([...MODE_STATS_MODES].toSorted());
    expect(Object.keys(TANK_MODE_SOURCES).toSorted()).toEqual([...MODE_STATS_MODES].toSorted());
    expect(Object.values(CAREER_MODE_FROM_DB).toSorted()).toEqual([...CAREER_MODES].toSorted());
  });
});
