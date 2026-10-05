import type { FeedBadgeView } from '../social.types';

import { challengeOfBadge } from '../lib/challenges/challenges';
import { toChallengeRule } from './challenge-rule.mappers';

export const toFeedBadge = (code: string): FeedBadgeView => {
  const challenge = challengeOfBadge(code);

  return { code, challenge: challenge ? toChallengeRule(challenge) : null };
};
