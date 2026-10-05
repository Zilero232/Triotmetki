export const MARKS_WATCH = {
  cursorKey: 'otmetki:notifications:marks-cursor',
  batchSize: 500
} as const;

export const SESSION_REPORT = {
  idleMinutes: 30,
  maxAgeHours: 12,
  batchSize: 200,
  dedupePrefix: 'session-'
} as const;

export const THRESHOLD_DROP = {
  minDropPercent: 1
} as const;

export const WEEKLY_DIGEST = {
  lookbackDays: 7,
  weekKeyFormat: "RRRR-'W'II",
  batchSize: 500,
  dedupePrefix: 'otmetki:notifications:digest:',
  dedupeTtlSeconds: 14 * 24 * 60 * 60
} as const;

export const FIRST_WIN_REMINDER = {
  batchSize: 500,
  activeWithinDays: 7
} as const;
