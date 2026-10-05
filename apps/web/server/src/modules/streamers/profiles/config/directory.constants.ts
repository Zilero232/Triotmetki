export const STREAMERS = {
  editorialEnabled: false,
  favouriteTanks: 3,
  videosCacheSeconds: 900,
  liveCacheSeconds: 60,
  cachePrefix: 'otmetki:streamers:',
  removalThrottle: { limit: 3, ttl: 3_600_000 },
  claimThrottle: { limit: 10, ttl: 3_600_000 },
  modThrottle: { limit: 30, ttl: 60_000 }
} as const;

export const REMOVAL_REPORT = {
  targetType: 'streamer_profile',
  reason: 'other'
} as const;

export const STREAMER_INVITATIONS = [
  { slug: 'nidin', displayName: 'NIDIN', sourceUrl: 'https://nidin.ru/game-settings', channels: [] },
  { slug: 'korben', displayName: 'Korben Dallas', sourceUrl: null, channels: [] },
  { slug: 'jove', displayName: 'Jove', sourceUrl: 'https://joves-modpack.ru/', channels: [] },
  { slug: 'protanki', displayName: 'ПРОТанки', sourceUrl: null, channels: [] },
  { slug: 'near-you', displayName: 'Near_You', sourceUrl: null, channels: [] },
  { slug: 'amway921', displayName: 'Amway921', sourceUrl: null, channels: [] },
  { slug: 'lebwa', displayName: 'Левша', sourceUrl: 'https://lebwa.tv/', channels: [] }
] as const;
