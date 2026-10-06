import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const REPLAY_UPLOAD = {
  field: 'file',
  maxBytes: 50 * 1024 * 1024,
  tempDir: join(tmpdir(), 'otmetki-replay-uploads'),
  concurrency: { perOwner: 2, keyPrefix: 'otmetki:replays:uploading:', ttlSeconds: 600 },
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
