export const LIVE = {
  staleAfterMs: 5 * 60_000,
  tokenMsPerSecond: 900,
  tankWindowMs: 30 * 60_000,
  alertDedupePrefix: 'streamer-live',
  twitch: {
    batch: 100
  },
  vk: {
    apiUrl: 'https://apidev.live.vkvideo.ru',
    tokenUrl: 'https://api.live.vkvideo.ru/oauth/server/token',
    channelUrl: 'https://live.vkvideo.ru',
    batch: 100
  },
  youtube: {
    rssUrl: 'https://www.youtube.com/feeds/videos.xml',
    apiUrl: 'https://www.googleapis.com/youtube/v3',
    pollEveryMs: 15 * 60_000,
    videosLimit: 6
  }
} as const;
