export const MINIMAP = {
  directory: 'maps/'
} as const;

export const MAP_TEAMS: Readonly<{ teams: readonly number[] }> = {
  teams: [1, 2]
};

export const TANK_MAP_STATS = {
  randomBattleType: '1'
} as const;

export const MAP_TEAM_STATS = {
  winnerPattern: '^[0-9]{1,9}$'
} as const;
