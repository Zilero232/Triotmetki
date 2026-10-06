export const REPLAYS = {
  componentId: 'replay_manager',
  pageKind: 'replays',
  statuses: ['ready', 'indexing', 'no_account'],
  results: ['win', 'loss', 'draw'],
  battleTypes: ['random', 'ranked', 'comp7', 'frontline', 'royale', 'training', 'tournament', 'clan', 'team', 'event', 'other'],
  siteStates: ['queued', 'uploaded', 'analysed'],
  uploadStates: ['ready', 'off', 'unbound', 'missing'],
  nations: ['ussr', 'germany', 'usa', 'china', 'france', 'uk', 'japan', 'czech', 'sweden', 'poland', 'italy', 'intunion'],
  classes: ['lightTank', 'mediumTank', 'heavyTank', 'AT-SPG', 'SPG'],
  actions: {
    refresh: 'refresh',
    folder: 'open_folder',
    rename: 'rename',
    remove: 'delete',
    favourite: 'favourite',
    play: 'play',
    upload: 'upload',
    hits: 'hits'
  },
  favouriteOn: '1',
  favouriteOff: '0',
  siteListPath: '/replays',
  maxTier: 11
} as const;

export const REPLAY_FILTER = {
  all: 'all',
  periods: ['all', 'today', 'week', 'month'],
  periodSeconds: { today: 24 * 3600, week: 7 * 24 * 3600, month: 30 * 24 * 3600 },
  sorts: ['time', 'damage', 'assist', 'xp', 'kills', 'duration', 'size'],
  defaultSort: 'time'
} as const;

export const REPLAY_FORMAT = {
  bytesPerMegabyte: 1024 * 1024,
  millisecondsPerSecond: 1000,
  dateTime: 'dd.MM.yyyy HH:mm',
  day: 'dd.MM.yyyy'
} as const;
