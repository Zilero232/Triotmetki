import type { Tilt } from '@otmetki/schemas';

import { differenceInMinutes } from 'date-fns';
import { range } from 'remeda';

import type { TiltBattle } from './tilt.types';

import { percentOf } from '../../../../common/lib';
import { TILT } from '../../config/tilt.constants';

const lossesBefore = (battles: readonly TiltBattle[]): number[] => {
  const streaks: number[] = [];
  let streak = 0;

  battles.forEach((battle, index) => {
    const previous = battles[index - 1];

    if (previous && differenceInMinutes(battle.startedAt, previous.startedAt) > TILT.sessionGapMinutes) {
      streak = 0;
    }

    streaks.push(streak);
    streak = battle.result === 'loss' ? streak + 1 : 0;
  });

  return streaks;
};

export const tilt = (battles: readonly TiltBattle[]): Tilt => {
  const streaks = lossesBefore(battles);
  const wins = battles.filter((battle) => battle.result === 'win').length;
  const overall = percentOf({ value: wins, by: battles.length });

  const steps = range(0, TILT.maxSteps + 1).map((afterLosses) => {
    const matching = battles.filter((_, index) => {
      const streak = streaks[index] ?? 0;

      return afterLosses === TILT.maxSteps ? streak >= afterLosses : streak === afterLosses;
    });

    return {
      afterLosses,
      battles: matching.length,
      winRate: percentOf({ value: matching.filter((battle) => battle.result === 'win').length, by: matching.length })
    };
  });

  const stop =
    overall === null
      ? undefined
      : steps.find(
          (step) => step.afterLosses > 0 && step.battles >= TILT.minStepBattles && step.winRate !== null && step.winRate <= overall - TILT.dropPoints
        );

  let longest = 0;
  let current = 0;

  for (const battle of battles) {
    current = battle.result === 'loss' ? current + 1 : 0;
    longest = Math.max(longest, current);
  }

  return {
    battles: battles.length,
    longestLossStreak: longest,
    currentLossStreak: current,
    steps,
    stopAfter: stop?.afterLosses ?? null
  };
};
