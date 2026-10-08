export const ARMOR_VIEWER = {
  storageDir: '.data/armor',
  cacheControl: 'private, no-store',
  gunsCacheControl: 'public, max-age=3600',
  showcaseCacheControl: 'private, max-age=3600',
  sourceRepo: 'unicum-gg/wot.models',
  meter: 'armor3d',
  memoryCache: { maxEntries: 32, maxBytes: 32 * 1024 * 1024, ttlMs: 3_600_000 }
} as const;
