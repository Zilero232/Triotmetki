import { hoursToMilliseconds } from 'date-fns';

export const HOME = {
  period: { server: '7d', rating: '7d' },
  garage: { sort: 'battles', order: 'desc', limit: 10, skeletons: 6, skeletonHeight: 128 },
  hero: { tanks: 5 },
  strongTanks: { tiers: [10, 9, 8], sort: 'winRate', order: 'desc', limit: 10, cards: 6, skeletonHeight: 236 },
  topPlayers: { metrics: ['wn8', 'broneIndex', 'avgDamage'], limit: 10, podium: 3, skeletonHeight: 178 },
  marks: { sort: 'p95Delta30d', order: 'desc', limit: 10, highlights: 3, skeletonHeight: 128 },
  news: { limit: 6, skeletonHeight: 220 },
  clans: { sort: 'activeMembers', order: 'desc', limit: 8 },
  recent: { limit: 6 },
  forYou: { marksQuery: { tab: 'marks' } },
  dashboard: {
    anchor: 'my',
    marks: 2,
    tanksQuery: { tab: 'tanks' },
    sessionsQuery: { tab: 'sessions' },
    winRateFormat: { maximumFractionDigits: 2, minimumFractionDigits: 2 },
    integerFormat: { maximumFractionDigits: 0 },
    weekDigits: 1,
    weekPeriod: '7d',
    markRing: 40,
    markLevels: [
      { key: 'moe3', marks: 3 },
      { key: 'moe2', marks: 2 },
      { key: 'moe1', marks: 1 }
    ],
    skeleton: { marks: [20, 48, 48], session: [20, 64, 20] }
  },
  league: { scope: 'division', metric: null, week: null },
  staleMs: 60_000,
  activityStaleMs: hoursToMilliseconds(2)
} as const;
