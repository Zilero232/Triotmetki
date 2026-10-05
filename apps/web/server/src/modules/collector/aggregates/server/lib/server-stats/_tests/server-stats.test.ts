import { describe, expect, it } from 'vitest';

import type { DailyStatsRow } from '../server-stats.types';

import { buildServerStats, periodPlayersAt } from '../server-stats';

type RowInput = {
  tankId: number;
  cohort: string;
  battles: number;
  wins: number;
  playerWinRate: number;
};

const row = ({ tankId, cohort, battles, wins, playerWinRate }: RowInput): DailyStatsRow => ({
  tankId,
  cohort,
  samples: 1,
  battles,
  wins,
  damage: battles * 2000,
  frags: battles,
  spotted: battles,
  xp: battles * 900,
  blocked: battles * 400,
  survived: battles / 2,
  hits: battles * 6,
  shots: battles * 8,
  playerWins: playerWinRate * battles
});

const rows = [
  row({ tankId: 1, cohort: 'good', battles: 100, wins: 60, playerWinRate: 55 }),
  row({ tankId: 1, cohort: 'beginner', battles: 100, wins: 44, playerWinRate: 47 }),
  row({ tankId: 2, cohort: 'good', battles: 50, wins: 25, playerWinRate: 55 })
];

const players = [
  { tankId: 1, cohort: 'good', players: 3 },
  { tankId: 1, cohort: 'beginner', players: 2 },
  { tankId: 1, cohort: 'all', players: 4 }
];

const stats = buildServerStats({ rows, players, tiers: new Map([[1, 8]]), mode: 'random', period: 'd7' });
const find = (tankId: number, cohort: string) => stats.find((entry) => entry.tankId === tankId && entry.cohort === cohort);

describe('buildServerStats', () => {
  it('adds an "all" cohort that sums every skill cohort', () => {
    expect(find(1, 'all')?.battles).toBe(200);
    expect(find(1, 'all')?.winRate).toBeCloseTo(((60 + 44) / 200) * 100);
  });

  it('takes distinct players from the grouping-set counts, not from the summed cohorts', () => {
    const all = find(1, 'all');
    const cohorts = players.filter((entry) => entry.tankId === 1 && entry.cohort !== 'all');

    expect(all?.players).toBe(players.find((entry) => entry.tankId === 1 && entry.cohort === 'all')?.players);
    expect(all?.players).toBeLessThan(cohorts.reduce((sum, entry) => sum + entry.players, 0));
    expect(all?.samples).toBe(rows.filter((entry) => entry.tankId === 1).length);
  });

  it('reports zero players for a tank the counts never saw', () => {
    expect(find(2, 'good')?.players).toBe(0);
  });

  it('computes WR diff as tank win rate minus the drivers own win rate', () => {
    const good = find(1, 'good');

    expect(good?.winRateDiff).toBeCloseTo((good?.winRate ?? 0) - 55);
  });

  it('ranks popularity by battles within a cohort', () => {
    expect(find(1, 'good')?.popularityRank).toBe(1);
    expect(find(2, 'good')?.popularityRank).toBe(2);
  });

  it('derives accuracy and survival as percentages', () => {
    expect(find(2, 'good')?.accuracy).toBeCloseTo(75);
    expect(find(2, 'good')?.survivalRate).toBeCloseTo(50);
  });
});

describe('periodPlayersAt', () => {
  const counts = [
    { tankId: 1, cohort: 'all', players: [3, 9] },
    { tankId: 2, cohort: 'all', players: [0, 4] }
  ];

  it('reads the player count of the requested period', () => {
    expect(periodPlayersAt({ rows: counts, index: 1 })).toEqual([
      { tankId: 1, cohort: 'all', players: 9 },
      { tankId: 2, cohort: 'all', players: 4 }
    ]);
  });

  it('leaves out a tank nobody played within the period', () => {
    expect(periodPlayersAt({ rows: counts, index: 0 }).map((row) => row.tankId)).toEqual([1]);
  });
});
