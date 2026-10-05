export const SESSION_SHARE = {
  preferenceThrottle: { limit: 10, ttl: 60_000 },
  sendThrottle: { limit: 6, ttl: 60_000 },
  autoJobPrefix: 'auto',
  discordSentPrefix: 'otmetki:session-share:discord:',
  discordSentMarker: '1',
  discordSentTtlSeconds: 7 * 86_400
} as const;
