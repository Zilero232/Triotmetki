import { sortBy, sum } from 'remeda';
import { match } from 'ts-pattern';

import type { ChallengeVerdict, CompareInput, EligibleInput, EvaluateChallengeInput, MetricOfInput } from './challenge-evaluator.types';

export const metricOf = ({ metric, battle }: MetricOfInput): number =>
  match(metric)
    .with('damage', () => battle.damageDealt)
    .with('assist', () => battle.damageAssistedRadio + battle.damageAssistedTrack)
    .with('blocked', () => battle.damageBlocked)
    .with('frags', () => battle.frags)
    .with('spotted', () => battle.spotted)
    .with('xp', () => battle.xp)
    .with('win', () => (battle.result === 'win' ? 1 : 0))
    .with('survive', () => (battle.survived ? 1 : 0))
    .with('moePercent', () => battle.moePercent ?? 0)
    .exhaustive();

const compare = ({ operator, actual, target }: CompareInput): boolean =>
  match(operator)
    .with('gte', () => actual >= target)
    .with('lte', () => actual <= target)
    .with('eq', () => actual === target)
    .exhaustive();

export const isEligible = ({ condition, battle }: EligibleInput): boolean =>
  (condition.tankId === undefined || battle.tankId === condition.tankId) &&
  (condition.tankType === undefined || battle.tankType === condition.tankType) &&
  (condition.minTier === undefined || (battle.tier ?? 0) >= condition.minTier);

export const evaluateChallenge = ({ condition, battles }: EvaluateChallengeInput): ChallengeVerdict => {
  const eligible = sortBy(
    battles.filter((battle) => isEligible({ condition, battle })),
    (battle) => battle.startedAt.getTime()
  ).slice(0, condition.battles);

  const values = eligible.map((battle) => metricOf({ metric: condition.metric, battle }));
  const battleIds = eligible.map((battle) => battle.id);
  const isComplete = eligible.length >= condition.battles;
  const target = condition.value;
  const { operator } = condition;

  if (condition.aggregate === 'single') {
    const hit = eligible.findIndex((_battle, index) => compare({ operator, actual: values[index] ?? 0, target }));
    const best = values.length > 0 ? (operator === 'lte' ? Math.min(...values) : Math.max(...values)) : 0;
    const progress = { battles: eligible.length, value: best, battleIds };

    if (hit !== -1) {
      return { status: 'succeeded', progress, decidingBattleId: battleIds[hit] ?? null };
    }

    return { status: isComplete ? 'failed' : 'active', progress, decidingBattleId: isComplete ? (battleIds.at(-1) ?? null) : null };
  }

  const total = sum(values);
  const value = condition.aggregate === 'sum' ? total : eligible.length > 0 ? total / eligible.length : 0;
  const progress = { battles: eligible.length, value, battleIds };
  const reachedEarly = condition.aggregate === 'sum' && operator === 'gte' && total >= target;

  if (reachedEarly) {
    return { status: 'succeeded', progress, decidingBattleId: battleIds.at(-1) ?? null };
  }

  if (!isComplete) {
    return { status: 'active', progress, decidingBattleId: null };
  }

  return { status: compare({ operator, actual: value, target }) ? 'succeeded' : 'failed', progress, decidingBattleId: battleIds.at(-1) ?? null };
};
