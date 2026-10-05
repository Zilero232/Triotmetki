import type { ChallengesView } from '../social.types';
import type { ToWeeklyChallengeViewInput } from './weekly-challenge-view.types';

import { badgeCodeOf } from '../lib/challenges/challenges';
import { toChallengeRule } from './challenge-rule.mappers';

export const toWeeklyChallengeView = ({ definition, progress }: ToWeeklyChallengeViewInput): ChallengesView['challenges'][number] => ({
  ...toChallengeRule(definition),
  badgeCode: badgeCodeOf(definition),
  progress: progress
    .filter((row) => row.code === definition.code)
    .map((row) => ({ accountId: Number(row.accountId), value: row.progress, completedAt: row.completedAt?.toISOString() ?? null }))
});
