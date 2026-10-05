import type { ChallengeCondition } from '@otmetki/schemas';

import type { Battle } from '../../../../../../generated';

export type EvaluatedBattle = Pick<
  Battle,
  | 'damageAssistedRadio'
  | 'damageAssistedTrack'
  | 'damageBlocked'
  | 'damageDealt'
  | 'frags'
  | 'id'
  | 'moePercent'
  | 'result'
  | 'spotted'
  | 'startedAt'
  | 'survived'
  | 'tankId'
  | 'xp'
> & {
  tankType: string | null;
  tier: number | null;
};

type ChallengeProgress = {
  battles: number;
  value: number;
  battleIds: string[];
};

export type EvaluateChallengeInput = {
  condition: ChallengeCondition;
  battles: readonly EvaluatedBattle[];
};

export type ChallengeVerdict = {
  status: 'active' | 'failed' | 'succeeded';
  progress: ChallengeProgress;
  decidingBattleId: string | null;
};

export type CompareInput = {
  operator: ChallengeCondition['operator'];
  actual: number;
  target: number;
};

export type MetricOfInput = {
  metric: ChallengeCondition['metric'];
  battle: EvaluatedBattle;
};

export type EligibleInput = {
  condition: ChallengeCondition;
  battle: EvaluatedBattle;
};
