import { describe, expect, it } from 'vitest';

import { MAP_TEAMS } from '../../../config/maps.constants';
import { statsFromBattles, statsFromReplays } from '../team-stats';

const [first = 0, second = 0] = MAP_TEAMS.teams;

const winRateOf = ({ stats, team }: { stats: ReturnType<typeof statsFromBattles>; team: number }) =>
  stats?.teams.find((item) => item.team === team)?.winRate;

describe('statsFromBattles', () => {
  it('returns null without battles', () => {
    expect(statsFromBattles([])).toBeNull();
  });

  it('credits a loss to the other team', () => {
    const stats = statsFromBattles([{ team: first, result: 'loss', battles: 1 }]);

    expect(winRateOf({ stats, team: second })).toBe(100);
    expect(winRateOf({ stats, team: first })).toBe(0);
  });

  it('counts a draw as a battle with no winner', () => {
    const stats = statsFromBattles([
      { team: first, result: 'win', battles: 1 },
      { team: second, result: 'draw', battles: 1 }
    ]);

    expect(stats?.battles).toBe(2);
    expect(winRateOf({ stats, team: first })).toBe(50);
    expect(winRateOf({ stats, team: second })).toBe(0);
  });

  it('skips battles without a known team', () => {
    expect(
      statsFromBattles([
        { team: null, result: 'win', battles: 1 },
        { team: Math.max(...MAP_TEAMS.teams) + 1, result: 'win', battles: 1 }
      ])
    ).toBeNull();
  });

  it('weights each aggregated side row by its battle count', () => {
    const stats = statsFromBattles([
      { team: first, result: 'win', battles: 3 },
      { team: first, result: 'loss', battles: 1 }
    ]);

    expect(stats?.battles).toBe(4);
    expect(winRateOf({ stats, team: first })).toBe((3 * 100) / 4);
    expect(winRateOf({ stats, team: second })).toBe((1 * 100) / 4);
  });

  it('reports every team with the battle count and the battles source', () => {
    const stats = statsFromBattles([{ team: first, result: 'win', battles: 1 }]);

    expect(stats?.source).toBe('battles');
    expect(stats?.teams.map((team) => team.team)).toEqual([...MAP_TEAMS.teams]);
    expect(stats?.teams.every((team) => team.battles === stats.battles)).toBe(true);
  });
});

describe('statsFromReplays', () => {
  it('returns null without replays', () => {
    expect(statsFromReplays([])).toBeNull();
    expect(statsFromReplays([{ winner: first, battles: 0 }])).toBeNull();
  });

  it('weights each winner row by its battle count', () => {
    const stats = statsFromReplays([
      { winner: first, battles: 3 },
      { winner: second, battles: 1 }
    ]);

    expect(stats?.source).toBe('replays');
    expect(stats?.battles).toBe(4);
    expect(winRateOf({ stats, team: first })).toBe((3 * 100) / 4);
  });

  it('counts replays without a winner as draws', () => {
    const stats = statsFromReplays([
      { winner: null, battles: 1 },
      { winner: first, battles: 1 }
    ]);

    expect(stats?.battles).toBe(2);
    expect(winRateOf({ stats, team: first })).toBe(50);
    expect(winRateOf({ stats, team: second })).toBe(0);
  });

  it('ignores negative battle counts', () => {
    expect(statsFromReplays([{ winner: first, battles: -2 }])).toBeNull();
  });
});
