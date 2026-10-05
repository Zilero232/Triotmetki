import { LEARNING_CURVE, TANK_ECONOMY } from '@otmetki/schemas';

export const TANK_ECONOMY_AGGREGATE = {
  windowDays: TANK_ECONOMY.windowDays,
  randomBattleType: '1',
  replayCreditsPath: '$.players[*] ? (@.isRecorder == true).result.credits',
  minBattles: 20,
  median: 0.5
} as const;

export const LEARNING_CURVE_AGGREGATE = {
  windowDays: LEARNING_CURVE.windowDays,
  bucketStarts: LEARNING_CURVE.bucketStarts,
  maxBattleDelta: 500,
  minBattles: 50,
  seriesColumns: ['account_id', 'tank_id', 'captured_at', 'battles', 'wins', 'damage_dealt']
} as const;

export const TANK_PERCENTILES_AGGREGATE = {
  percentScale: 'numeric(4, 1)'
} as const;
