export const CHALLENGE = {
  codeLength: 5,
  codeAlphabet: 'ABCDEFGHJKMNPQRSTUVWXYZ23456789',
  codePrefix: '#',
  codeAttempts: 3,
  listLimit: 100,
  maxOpen: 10,
  feedCursorKey: 'otmetki:streamers:battle-cursor',
  feedBatch: 500,
  defaultCurrency: 'RUB'
} as const;
