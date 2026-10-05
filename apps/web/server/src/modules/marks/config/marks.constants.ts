export const MOE_TABLE = {
  minTier: 5,
  trendDays: { week: 7, month: 30 }
} as const;

export const MOE_CURVE_SQL = {
  randomBattleType: '1'
} as const;

export const MOE_CURVE_QUERIES = Symbol('MOE_CURVE_QUERIES');
