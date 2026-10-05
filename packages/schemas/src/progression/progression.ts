import type { SeasonLevel, SeasonWindow, TankLevel } from './progression.types';

import { SEASON, SEASON_TRACK, TANK_LEVELS } from './progression.constants';

export const xpForLevel = (level: number): number => {
  const steps = Math.max(0, Math.min(level, TANK_LEVELS.max) - 1);

  return steps * TANK_LEVELS.firstStepXp + (TANK_LEVELS.stepGrowthXp * steps * (steps - 1)) / 2;
};

export const tankLevelOf = (xp: number): TankLevel => {
  let level = 1;

  while (level < TANK_LEVELS.max && xp >= xpForLevel(level + 1)) {
    level += 1;
  }

  return { level, levelXp: xpForLevel(level), nextLevelXp: level < TANK_LEVELS.max ? xpForLevel(level + 1) : null };
};

export const seasonLevelOf = (points: number): SeasonLevel => {
  const level = Math.min(SEASON_TRACK.maxLevel, Math.floor(Math.max(0, points) / SEASON_TRACK.pointsPerLevel));

  return {
    level,
    levelPoints: level * SEASON_TRACK.pointsPerLevel,
    nextLevelPoints: level < SEASON_TRACK.maxLevel ? (level + 1) * SEASON_TRACK.pointsPerLevel : null
  };
};

export const seasonOf = (date: Date): SeasonWindow => {
  const year = date.getUTCFullYear();
  const quarter = Math.floor(date.getUTCMonth() / SEASON.monthsPerSeason);

  return {
    code: `${year}-q${quarter + 1}`,
    startsAt: new Date(Date.UTC(year, quarter * SEASON.monthsPerSeason, 1)),
    endsAt: new Date(Date.UTC(year, (quarter + 1) * SEASON.monthsPerSeason, 1))
  };
};
