import type { RecruitingPost } from '../../../../generated';
import type { NamesById, StatsByAccount } from '../../community-core';

export type RecruitingViewInput = {
  post: RecruitingPost;
  stats: StatsByAccount;
  nicknames: NamesById;
  clanTags: NamesById;
};
