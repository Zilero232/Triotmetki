import type { ChallengeCondition } from '@otmetki/schemas';

import { challengeConditionSchema } from '@otmetki/schemas';
import { describe, expect, it } from 'vitest';

import type { EvaluatedBattle } from '../challenge-evaluator.types';

import { evaluateChallenge, isEligible, metricOf } from '../challenge-evaluator';

const condition = (input: Partial<ChallengeCondition> & Pick<ChallengeCondition, 'metric' | 'value'>): ChallengeCondition =>
  challengeConditionSchema.parse(input);

const battle = (overrides: Partial<EvaluatedBattle> & { id: string; minute: number }): EvaluatedBattle => {
  const { minute, ...rest } = overrides;

  return {
    tankId: 1,
    tankType: 'lightTank',
    tier: 10,
    startedAt: new Date(Date.UTC(2026, 8, 25, 12, minute)),
    result: 'loss',
    damageDealt: 0,
    damageAssistedRadio: 0,
    damageAssistedTrack: 0,
    damageBlocked: 0,
    frags: 0,
    spotted: 0,
    xp: 0,
    survived: false,
    moePercent: null,
    ...rest
  };
};

describe('metricOf', () => {
  it('counts assist as radio plus tracking and turns win and survival into 0/1', () => {
    const sample = battle({ id: 'a', minute: 0, damageAssistedRadio: 1000, damageAssistedTrack: 500, result: 'win', survived: true });

    expect(metricOf({ metric: 'assist', battle: sample })).toBe(1500);
    expect(metricOf({ metric: 'win', battle: sample })).toBe(1);
    expect(metricOf({ metric: 'survive', battle: sample })).toBe(1);
    expect(metricOf({ metric: 'moePercent', battle: sample })).toBe(0);
  });
});

describe('isEligible', () => {
  it('applies tank, class and tier filters', () => {
    const light = battle({ id: 'a', minute: 0, tankType: 'lightTank', tier: 8 });

    expect(isEligible({ condition: condition({ metric: 'damage', value: 1, tankType: 'lightTank' }), battle: light })).toBe(true);
    expect(isEligible({ condition: condition({ metric: 'damage', value: 1, tankType: 'heavyTank' }), battle: light })).toBe(false);
    expect(isEligible({ condition: condition({ metric: 'damage', value: 1, minTier: 9 }), battle: light })).toBe(false);
    expect(isEligible({ condition: condition({ metric: 'damage', value: 1, tankId: 2 }), battle: light })).toBe(false);
  });
});

describe('evaluateChallenge', () => {
  it('succeeds on the first battle that meets a single-battle target and names it', () => {
    const verdict = evaluateChallenge({
      condition: condition({ metric: 'damage', value: 3000, battles: 3 }),
      battles: [battle({ id: 'a', minute: 0, damageDealt: 2000 }), battle({ id: 'b', minute: 1, damageDealt: 3000 })]
    });

    expect(verdict.status).toBe('succeeded');
    expect(verdict.decidingBattleId).toBe('b');
  });

  it('stays active while single-battle attempts remain', () => {
    const verdict = evaluateChallenge({
      condition: condition({ metric: 'damage', value: 3000, battles: 3 }),
      battles: [battle({ id: 'a', minute: 0, damageDealt: 2999 })]
    });

    expect(verdict.status).toBe('active');
    expect(verdict.progress).toEqual({ battles: 1, value: 2999, battleIds: ['a'] });
  });

  it('fails once every attempt is used', () => {
    const verdict = evaluateChallenge({
      condition: condition({ metric: 'frags', value: 5, battles: 2 }),
      battles: [battle({ id: 'a', minute: 0, frags: 4 }), battle({ id: 'b', minute: 1, frags: 3 }), battle({ id: 'c', minute: 2, frags: 9 })]
    });

    expect(verdict.status).toBe('failed');
    expect(verdict.progress.battleIds).toEqual(['a', 'b']);
  });

  it('only counts battles that pass the filters', () => {
    const verdict = evaluateChallenge({
      condition: condition({ metric: 'damage', value: 3000, tankType: 'lightTank' }),
      battles: [battle({ id: 'heavy', minute: 0, tankType: 'heavyTank', damageDealt: 9000 }), battle({ id: 'light', minute: 1, damageDealt: 100 })]
    });

    expect(verdict.status).toBe('failed');
    expect(verdict.progress.battleIds).toEqual(['light']);
  });

  it('succeeds a sum target as soon as it is reached', () => {
    const verdict = evaluateChallenge({
      condition: condition({ metric: 'spotted', value: 10, battles: 5, aggregate: 'sum' }),
      battles: [battle({ id: 'a', minute: 0, spotted: 6 }), battle({ id: 'b', minute: 1, spotted: 4 })]
    });

    expect(verdict.status).toBe('succeeded');
    expect(verdict.progress.value).toBe(10);
  });

  it('decides an average only after all battles are played', () => {
    const target = condition({ metric: 'damage', value: 2000, battles: 2, aggregate: 'avg' });
    const first = battle({ id: 'a', minute: 0, damageDealt: 5000 });

    expect(evaluateChallenge({ condition: target, battles: [first] }).status).toBe('active');
    expect(evaluateChallenge({ condition: target, battles: [first, battle({ id: 'b', minute: 1, damageDealt: 0 })] }).status).toBe('succeeded');
  });

  it('supports an upper bound', () => {
    const verdict = evaluateChallenge({
      condition: condition({ metric: 'damage', value: 500, operator: 'lte', battles: 1 }),
      battles: [battle({ id: 'a', minute: 0, damageDealt: 400 })]
    });

    expect(verdict.status).toBe('succeeded');
  });

  it('orders battles by start time before taking the first ones', () => {
    const verdict = evaluateChallenge({
      condition: condition({ metric: 'win', value: 1, battles: 1 }),
      battles: [battle({ id: 'later', minute: 5, result: 'win' }), battle({ id: 'first', minute: 0, result: 'loss' })]
    });

    expect(verdict.status).toBe('failed');
    expect(verdict.decidingBattleId).toBe('first');
  });
});
