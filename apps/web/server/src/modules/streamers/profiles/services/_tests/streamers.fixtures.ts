import type { StreamerProfile } from '../../../../../../generated';

const CREATED_AT = new Date('2026-09-01T00:00:00Z');

export const streamerProfileRow = (overrides: Partial<StreamerProfile> = {}): StreamerProfile => ({
  id: 'p1',
  userId: 'u1',
  kind: 'claimed',
  slug: 'jove',
  displayName: 'Jove',
  accountId: 1001n,
  accountSourceUrl: null,
  bio: null,
  links: null,
  settings: null,
  settingsUpdatedAt: null,
  isLive: false,
  liveTankId: null,
  liveViewers: null,
  livePlatform: null,
  liveStartedAt: null,
  liveCheckedAt: null,
  hiddenAt: null,
  mergedIntoId: null,
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
  ...overrides
});
