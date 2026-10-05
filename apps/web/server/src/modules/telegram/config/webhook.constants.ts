export const WEBHOOK = {
  path: 'telegram/webhook',
  secretHeader: 'x-telegram-bot-api-secret-token',
  seenPrefix: 'otmetki:telegram:update:',
  seenMarker: '1',
  seenTtlSeconds: 24 * 60 * 60
} as const;
