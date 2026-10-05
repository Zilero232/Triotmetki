import { challengeConditionSchema } from '@otmetki/schemas';

import type { Challenge } from '../../../../../generated';
import type { StreamerChallengeView } from '../challenges.types';

import { readRecord, toIso } from '../../../../common/lib';

export const toChallengeView = (challenge: Challenge): StreamerChallengeView => {
  const progress = readRecord(challenge.progress);

  return {
    id: challenge.id,
    code: challenge.code,
    title: challenge.title,
    condition: challengeConditionSchema.parse(challenge.condition),
    amount: challenge.amount.toNumber(),
    currency: challenge.currency,
    status: challenge.status,
    donorName: challenge.donorName,
    progress:
      typeof progress.battles === 'number' && typeof progress.value === 'number' ? { battles: progress.battles, value: progress.value } : null,
    createdAt: challenge.createdAt.toISOString(),
    expiresAt: toIso(challenge.expiresAt),
    resolvedAt: toIso(challenge.resolvedAt)
  };
};
