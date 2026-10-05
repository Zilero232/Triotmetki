import { match } from 'ts-pattern';

import type { AchievedAtInput } from './record-times.types';

import { toIso } from '../../../../common/lib';

export const achievedAt = ({ key, value, times }: AchievedAtInput): string | null => {
  const stored = match(key)
    .with('maxDamage', () => ({ value: times.maxDamage, at: times.maxDamageAt }))
    .with('maxXp', () => ({ value: times.maxXp, at: times.maxXpAt }))
    .with('maxFrags', () => ({ value: times.maxFrags, at: times.maxFragsAt }))
    .exhaustive();

  return stored.value === value ? toIso(stored.at) : null;
};
