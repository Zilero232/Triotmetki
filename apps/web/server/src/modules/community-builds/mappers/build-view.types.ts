import type { Build } from '../../../../generated';
import type { AuthorUser } from '../../community-core';

export type ToBuildViewInput = {
  build: Build;
  author: AuthorUser;
  likedByMe: boolean;
  gameVersion: string | null;
};
