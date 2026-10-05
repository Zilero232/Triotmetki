import type { FollowFlagConfig, FollowFlags } from '../lib/follow-flags/follow-flags.types';

export const FOLLOW_FLAGS: Record<keyof FollowFlags, FollowFlagConfig> = {
  isFollowing: {
    on: { isFollowing: true },
    only: { isFollowing: true, isFavorite: false },
    reset: { isFollowing: false, events: [] }
  },
  isFavorite: {
    on: { isFavorite: true },
    only: { isFollowing: false, isFavorite: true },
    reset: { isFavorite: false, label: null, isOwn: false }
  }
};
