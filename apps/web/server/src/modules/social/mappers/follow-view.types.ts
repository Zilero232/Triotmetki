import type { Follow } from '../../../../generated';

export type ToFollowViewInput = {
  follow: Follow;
  nickname: string | null;
};
