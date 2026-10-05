import { describe, expect, it } from 'vitest';

import type { ModeMetaRow } from '../mode-meta.types';

import { toModeRecord } from '../mode-meta.mappers';

const ROW: ModeMetaRow = {
  tank_id: 1,
  battles: 10,
  players: 4,
  wins: 6,
  decided: 8,
  avg_damage: 2500,
  avg_xp: 900,
  avg_frags: 1.2,
  survival_rate: 40,
  mod_battles: 7,
  replay_battles: 3
};

const at = new Date('2026-09-26T00:00:00Z');

describe('toModeRecord', () => {
  it('counts the win rate over decided battles only', () => {
    expect(toModeRecord({ row: ROW, mode: 'onslaught', windowDays: 30, computedAt: at }).winRate).toBe((ROW.wins * 100) / ROW.decided);
  });

  it('has no win rate when every battle was a draw', () => {
    expect(toModeRecord({ row: { ...ROW, wins: 0, decided: 0 }, mode: 'onslaught', windowDays: 30, computedAt: at }).winRate).toBeNull();
  });

  it('drops a non-finite average instead of storing it', () => {
    const record = toModeRecord({ row: { ...ROW, avg_damage: Number.NaN, survival_rate: null }, mode: 'ranked', windowDays: 30, computedAt: at });

    expect(record.avgDamage).toBeNull();
    expect(record.survivalRate).toBeNull();
  });
});
