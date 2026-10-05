import type { RecruitingView } from '../recruiting.types';
import type { RecruitingViewInput } from './recruiting-view.types';

import { toIso } from '../../../common/lib';
import { readRequirements } from '../../community-core';
import { RECRUITING_KIND_FROM_DB } from '../config/recruiting-kind.constants';

export const toRecruitingView = ({ post, stats, nicknames, clanTags }: RecruitingViewInput): RecruitingView => ({
  id: post.id,
  kind: RECRUITING_KIND_FROM_DB[post.kind],
  clanId: post.clanId === null ? null : Number(post.clanId),
  clanTag: post.clanId === null ? null : (clanTags.get(post.clanId) ?? null),
  accountId: post.accountId === null ? null : Number(post.accountId),
  nickname: post.accountId === null ? null : (nicknames.get(post.accountId) ?? null),
  title: post.title,
  body: post.body,
  requirements: readRequirements(post.requirements),
  stats: post.accountId === null ? null : (stats.get(post.accountId) ?? null),
  status: post.status,
  expiresAt: toIso(post.expiresAt),
  createdAt: post.createdAt.toISOString()
});
