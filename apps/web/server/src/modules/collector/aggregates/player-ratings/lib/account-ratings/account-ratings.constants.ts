import { PERIOD_WINDOWS } from '@otmetki/ratings';

export const RATING_PERIOD_WINDOWS = [
  { period: 'h24', window: PERIOD_WINDOWS['24h'] },
  { period: 'd7', window: PERIOD_WINDOWS['7d'] },
  { period: 'd30', window: PERIOD_WINDOWS['30d'] },
  { period: 'd60', window: PERIOD_WINDOWS['60d'] },
  { period: 'b1000', window: PERIOD_WINDOWS['1000'] }
] as const;

export const ZERO_TANK_BASELINE = {
  battles: 0,
  wins: 0,
  damageDealt: 0,
  frags: 0,
  spotted: 0,
  capturePoints: 0,
  droppedCapturePoints: 0,
  xp: 0
} as const;
