export const REPLAY_UPLOAD = {
  field: 'file',
  maxBytes: 50 * 1024 * 1024,
  maxFileNameLength: 255,
  multipartOverheadBytes: 64 * 1024,
  maxFields: 4,
  maxFieldBytes: 1024,
  extensions: ['.mtreplay', '.wotreplay'],
  contentType: 'application/octet-stream',
  keyPrefix: 'replays',
  tracksSuffix: '.tracks.json',
  userThrottle: { limit: 20, ttl: 60_000 },
  modThrottle: { limit: 30, ttl: 60_000 },
  visibilityHeader: 'x-otmetki-visibility',
  modVisibilities: ['private', 'public'],
  modDefaultVisibility: 'private'
} as const;
