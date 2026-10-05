import type { FollowView } from '../social.types';
import type { ToFollowViewInput } from './follow-view.types';

import { FOLLOW_KIND_FROM_DB } from '../config/follow-kind.constants';

export const toFollowView = ({ follow, nickname }: ToFollowViewInput): FollowView => ({
  id: follow.id,
  kind: FOLLOW_KIND_FROM_DB[follow.kind],
  targetId: Number(follow.targetId),
  label: follow.kind === 'player' ? nickname : null,
  createdAt: follow.createdAt.toISOString()
});
