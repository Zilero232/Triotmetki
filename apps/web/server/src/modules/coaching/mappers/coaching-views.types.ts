import type { CoachingOffer, CoachProfile } from '../../../../generated';
import type { AuthorUser, StatsByAccount } from '../../community-core';

type CoachWithDetails = CoachProfile & {
  user: AuthorUser;
  offers: CoachingOffer[];
};

export type CoachViewInput = {
  coach: CoachWithDetails;
  stats: StatsByAccount;
};
