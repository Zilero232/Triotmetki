import { describe, expect, it } from 'vitest';

import type { TrendRow } from '../../../tanks.types';

import { toTrendPoints } from '../tank-trend-points';

const row: TrendRow = { day: '2026-09-01', battles: 200, wins: 110, damage: 400_000, players: 50 };

describe('toTrendPoints', () => {
  it('derives the win rate as a percent and the damage per battle', () => {
    expect(toTrendPoints([row])).toEqual([
      {
        date: row.day,
        battles: row.battles,
        players: row.players,
        winRate: (row.wins * 100) / row.battles,
        avgDamage: row.damage / row.battles
      }
    ]);
  });

  it('reports no win rate or damage for a day without battles', () => {
    const [point] = toTrendPoints([{ ...row, battles: 0 }]);

    expect(point?.winRate).toBeNull();
    expect(point?.avgDamage).toBeNull();
  });

  it('clamps negative counts to zero', () => {
    const [point] = toTrendPoints([{ ...row, battles: -3, players: -1 }]);

    expect(point?.battles).toBe(0);
    expect(point?.players).toBe(0);
  });

  it('reports an unknown player count as null instead of zero', () => {
    const [point] = toTrendPoints([{ ...row, players: null }]);

    expect(point?.players).toBeNull();
  });

  it('rounds a fractional battle count before dividing by it', () => {
    const battles = 199.6;
    const [point] = toTrendPoints([{ ...row, battles }]);

    expect(point?.battles).toBe(Math.round(battles));
    expect(point?.avgDamage).toBe(row.damage / Math.round(battles));
  });

  it('keeps the order of the rows', () => {
    const days = ['2026-09-01', '2026-09-02', '2026-09-03'];

    expect(toTrendPoints(days.map((day) => ({ ...row, day }))).map((point) => point.date)).toEqual(days);
  });
});
