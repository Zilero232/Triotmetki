import type { StreamerFollow } from '@otmetki/schemas';

import type { StreamerFollowRow } from './streamer-follow.types';

export const toStreamerFollowView = (follow: StreamerFollowRow): StreamerFollow => ({
  slug: follow.profile.slug,
  displayName: follow.profile.displayName,
  tankId: follow.tankId,
  isLive: follow.profile.isLive,
  createdAt: follow.createdAt.toISOString()
});
