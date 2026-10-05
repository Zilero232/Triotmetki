import type { Comment, Guide } from '../../../../generated';
import type { AuthorUser } from '../../community-core';

export type ToGuideViewInput = {
  guide: Guide;
  author: AuthorUser;
  likedByMe: boolean;
};

export type CommentWithAuthor = Comment & {
  author: AuthorUser;
};
