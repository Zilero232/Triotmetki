export const PULSE = {
  levels: 5,
  days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
  hourTickEvery: 3,
  staleMs: 5 * 60_000,
  moscowZone: 'Europe/Moscow'
} as const;
