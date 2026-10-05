import type { PlatoonView } from '../platoons.types';
import type { PlatoonViewInput } from './platoon-view.types';

import { toIso } from '../../../common/lib';

export const toPlatoonView = ({ post, stats, nicknames }: PlatoonViewInput): PlatoonView => ({
  id: post.id,
  accountId: Number(post.accountId),
  nickname: nicknames.get(post.accountId) ?? null,
  tiers: post.tiers,
  modes: post.modes,
  tankIds: post.tankIds,
  hasVoice: post.hasVoice,
  minWn8: post.minWn8,
  message: post.message,
  status: post.status,
  stats: stats.get(post.accountId) ?? null,
  availableFrom: toIso(post.availableFrom),
  availableUntil: toIso(post.availableUntil),
  expiresAt: post.expiresAt.toISOString(),
  createdAt: post.createdAt.toISOString()
});
