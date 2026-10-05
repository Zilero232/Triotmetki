import type { PlatoonPost } from '../../../../generated';
import type { NamesById, StatsByAccount } from '../../community-core';

export type PlatoonViewInput = {
  post: PlatoonPost;
  stats: StatsByAccount;
  nicknames: NamesById;
};
