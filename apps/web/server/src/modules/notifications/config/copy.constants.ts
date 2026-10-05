export const NOTIFICATION_COPY = {
  locales: ['ru', 'en'],
  fallbackLocale: 'ru',
  files: {
    ru: new URL('./locales/ru.ftl', import.meta.url),
    en: new URL('./locales/en.ftl', import.meta.url)
  },
  missing: 'none'
} as const;

export const NOTIFICATION_LINKS = {
  player: '/p',
  tank: '/t',
  sessionParam: 'session',
  bonusCodes: '/shop',
  challenges: '/me',
  digest: '/me',
  clans: '/clans',
  clanWorkspace: 'workspace',
  badges: '/me',
  replays: '/replays',
  analytics: '/me/analytics',
  watchlist: '/me/watchlist',
  competitions: '/competitions',
  streamer: '/s',
  progress: '/me/progress',
  plus: '/plus',
  linkedAccounts: '/me',
  goals: '/me'
} as const;

export const NOTIFICATION_GROUPS = {
  tank: ['moeGained', 'moeThresholdDropped', 'premiumOffer', 'tankReturned', 'tankLevelUp', 'tankChallengeDone'],
  player: ['sessionFinished', 'firstWinAvailable', 'watchlistDigest', 'goalReached', 'badgeAwarded'],
  community: ['challengeResolved', 'clanEventReminder', 'clanWeeklyReport', 'streamerLive', 'competitionFinished'],
  account: ['bonusCode', 'replayOverflow', 'plusCheckoutOpen', 'lestaRelinkRequired']
} as const;
