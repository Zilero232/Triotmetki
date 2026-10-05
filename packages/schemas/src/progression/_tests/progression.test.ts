import { describe, expect, it } from 'vitest';

import { seasonLevelOf, seasonOf, tankLevelOf, xpForLevel } from '../progression';
import { SEASON, SEASON_TRACK, TANK_LEVELS } from '../progression.constants';

describe('xpForLevel', () => {
  it('needs no experience for the first level', () => {
    expect(xpForLevel(1)).toBe(0);
  });

  it('needs more experience for every next level than for the one before', () => {
    for (let level = 2; level < TANK_LEVELS.max; level += 1) {
      expect(xpForLevel(level + 1) - xpForLevel(level)).toBeGreaterThan(xpForLevel(level) - xpForLevel(level - 1));
    }
  });
});

describe('tankLevelOf', () => {
  it('reaches a level exactly on its threshold', () => {
    const threshold = xpForLevel(5);

    expect(tankLevelOf(threshold).level).toBe(5);
    expect(tankLevelOf(threshold - 1).level).toBe(4);
  });

  it('stops at the maximum level with no next threshold', () => {
    const top = tankLevelOf(xpForLevel(TANK_LEVELS.max) * 10);

    expect(top.level).toBe(TANK_LEVELS.max);
    expect(top.nextLevelXp).toBeNull();
  });

  it('keeps the experience between the level start and the next threshold', () => {
    const xp = xpForLevel(7) + 1;
    const { levelXp, nextLevelXp } = tankLevelOf(xp);

    expect(levelXp).toBeLessThanOrEqual(xp);
    expect(nextLevelXp).toBeGreaterThan(xp);
  });
});

describe('seasonLevelOf', () => {
  it('starts a season at level zero', () => {
    expect(seasonLevelOf(0).level).toBe(0);
  });

  it('never goes past the last track level', () => {
    const top = seasonLevelOf(SEASON_TRACK.pointsPerLevel * (SEASON_TRACK.maxLevel + 5));

    expect(top.level).toBe(SEASON_TRACK.maxLevel);
    expect(top.nextLevelPoints).toBeNull();
  });

  it('places every reward on a reachable level', () => {
    for (const reward of SEASON_TRACK.rewards) {
      expect(reward.level).toBeLessThanOrEqual(SEASON_TRACK.maxLevel);
    }
  });
});

describe('seasonOf', () => {
  it('spans one quarter and contains the date', () => {
    const date = new Date('2026-08-15T12:00:00Z');
    const { code, startsAt, endsAt } = seasonOf(date);

    expect(SEASON.codePattern.test(code)).toBe(true);
    expect(startsAt.getTime()).toBeLessThanOrEqual(date.getTime());
    expect(endsAt.getTime()).toBeGreaterThan(date.getTime());
    expect(endsAt.getUTCMonth() - startsAt.getUTCMonth()).toBe(SEASON.monthsPerSeason);
  });

  it('starts the next season exactly where the previous one ends', () => {
    const current = seasonOf(new Date('2026-12-31T23:59:59Z'));
    const next = seasonOf(current.endsAt);

    expect(next.startsAt.getTime()).toBe(current.endsAt.getTime());
    expect(next.code).not.toBe(current.code);
  });
});
