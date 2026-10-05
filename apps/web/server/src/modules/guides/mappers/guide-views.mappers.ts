import type { CommentView, GuideView } from '../guides.types';
import type { CommentWithAuthor, ToGuideViewInput } from './guide-views.types';

import { toIso } from '../../../common/lib';
import { toAuthorView } from '../../community-core';
import { COMMENT_TARGET_FROM_DB } from '../config/comment-target.constants';

export const toGuideView = ({ guide, author, likedByMe }: ToGuideViewInput): GuideView => ({
  id: guide.id,
  slug: guide.slug,
  kind: guide.kind,
  tankId: guide.tankId,
  arenaId: guide.arenaId,
  locale: guide.locale,
  title: guide.title,
  body: guide.body,
  status: guide.status,
  likesCount: guide.likesCount,
  likedByMe,
  author: toAuthorView(author),
  publishedAt: toIso(guide.publishedAt),
  createdAt: guide.createdAt.toISOString(),
  updatedAt: guide.updatedAt.toISOString()
});

export const toCommentView = (comment: CommentWithAuthor): CommentView => ({
  id: comment.id,
  target: COMMENT_TARGET_FROM_DB[comment.target],
  targetId: comment.targetId,
  parentId: comment.parentId,
  body: comment.status === 'published' ? comment.body : '',
  author: toAuthorView(comment.author),
  createdAt: comment.createdAt.toISOString()
});
