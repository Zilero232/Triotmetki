export const TACTICS = {
  path: '/tactics/ws',
  documentPrefix: 'board:',
  redisPrefix: 'otmetki:tactics',
  debounceMs: 2000,
  maxDebounceMs: 10_000,
  maxBoardsPerUser: 200,
  maxPayloadBytes: 1_048_576,
  maxDocumentBytes: 4_194_304,
  shutdownTimeoutMs: 10_000
} as const;

export const BOARD_DOCUMENT = {
  layersKey: 'layers'
} as const;

export const REDIS_CONNECTION = {
  defaultPort: 6379,
  tlsProtocol: 'rediss:'
} as const;
