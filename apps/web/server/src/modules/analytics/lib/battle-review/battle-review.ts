import type { BattleMistake } from '@otmetki/schemas';

import { moeAlpha, moeCombinedDamage } from '@otmetki/ratings';

import type { BattleReview, RatioToInput, ReviewedBattle, ReviewInput } from './battle-review.types';

import { percentOf } from '../../../../common/lib';
import { BATTLE_REVIEW } from '../../config/battle-review.constants';

const ratioTo = ({ value, reference }: RatioToInput): number | null => (reference !== null && reference > 0 ? value / reference : null);

export const assistedOf = (battle: Pick<ReviewedBattle, 'damageAssistedRadio' | 'damageAssistedStun' | 'damageAssistedTrack'>): number =>
  Math.max(battle.damageAssistedRadio, battle.damageAssistedTrack, battle.damageAssistedStun);

export const combinedOf = (battle: ReviewedBattle): number =>
  moeCombinedDamage({
    damage: battle.damageDealt,
    spottingAssist: battle.damageAssistedRadio,
    trackingAssist: battle.damageAssistedTrack,
    stunAssist: battle.damageAssistedStun
  });

export const movingAverageBefore = (battle: ReviewedBattle): number | null => {
  if (battle.moeMovingAvg === null) {
    return null;
  }

  const alpha = moeAlpha();

  return (battle.moeMovingAvg - alpha * combinedOf(battle)) / (1 - alpha);
};

const isLow = ({ value, reference }: RatioToInput): boolean => reference !== null && value < reference * BATTLE_REVIEW.lowShare;

const mistakesOf = ({ battle, reference, vehicleType }: ReviewInput): BattleMistake[] => {
  const mistakes: BattleMistake[] = [];
  const assisted = assistedOf(battle);
  const hitRate = battle.shotsFired ? percentOf({ value: battle.shotsHit ?? 0, by: battle.shotsFired }) : null;
  const penRate = battle.shotsHit ? percentOf({ value: battle.shotsPierced ?? 0, by: battle.shotsHit }) : null;

  if (battle.damageDealt === 0) {
    mistakes.push({ code: 'noDamage', value: 0, reference: reference?.avgDamage ?? null });
  } else if (isLow({ value: battle.damageDealt, reference: reference?.avgDamage ?? null })) {
    mistakes.push({ code: 'lowDamage', value: battle.damageDealt, reference: reference?.avgDamage ?? null });
  }

  const spottedReference = reference?.avgSpotted ?? null;

  if (
    spottedReference !== null &&
    spottedReference >= BATTLE_REVIEW.minSpottedReference &&
    isLow({ value: battle.spotted, reference: spottedReference })
  ) {
    mistakes.push({ code: 'lowSpotting', value: battle.spotted, reference: spottedReference });
  }

  const assistReference = reference?.avgAssisted ?? null;

  if (
    (vehicleType === 'lightTank' || (assistReference !== null && assistReference >= BATTLE_REVIEW.minAssistReference)) &&
    isLow({ value: assisted, reference: assistReference })
  ) {
    mistakes.push({ code: 'lowAssist', value: assisted, reference: assistReference });
  }

  if (!battle.survived && battle.lifetimeSec !== null && battle.durationSec) {
    const share = battle.lifetimeSec / battle.durationSec;

    if (share < BATTLE_REVIEW.earlyDeathShare) {
      mistakes.push({ code: 'diedEarly', value: battle.lifetimeSec, reference: battle.durationSec });
    }
  }

  if ((battle.shotsFired ?? 0) >= BATTLE_REVIEW.minShotsForAccuracy && hitRate !== null && hitRate < BATTLE_REVIEW.lowHitRate) {
    mistakes.push({ code: 'lowAccuracy', value: hitRate, reference: BATTLE_REVIEW.lowHitRate });
  }

  if ((battle.shotsHit ?? 0) >= BATTLE_REVIEW.minHitsForPenetration && penRate !== null && penRate < BATTLE_REVIEW.lowPenRate) {
    mistakes.push({ code: 'lowPenetration', value: penRate, reference: BATTLE_REVIEW.lowPenRate });
  }

  if (battle.moePercentDelta !== null && battle.moePercentDelta < 0) {
    mistakes.push({ code: 'moeLoss', value: battle.moePercentDelta, reference: null });
  }

  return mistakes;
};

export const reviewBattle = (input: ReviewInput): BattleReview => {
  const { battle, reference } = input;
  const assisted = assistedOf(battle);
  const combined = combinedOf(battle);
  const movingAverage = movingAverageBefore(battle);

  return {
    breakdown: {
      dealt: battle.damageDealt,
      assistedRadio: battle.damageAssistedRadio,
      assistedTrack: battle.damageAssistedTrack,
      assistedStun: battle.damageAssistedStun,
      blocked: battle.damageBlocked
    },
    efficiency: {
      damage: ratioTo({ value: battle.damageDealt, reference: reference?.avgDamage ?? null }),
      assisted: ratioTo({ value: assisted, reference: reference?.avgAssisted ?? null }),
      spotted: ratioTo({ value: battle.spotted, reference: reference?.avgSpotted ?? null }),
      frags: ratioTo({ value: battle.frags, reference: reference?.avgFrags ?? null })
    },
    accuracy: {
      shotsFired: battle.shotsFired,
      hitRate: battle.shotsFired ? percentOf({ value: battle.shotsHit ?? 0, by: battle.shotsFired }) : null,
      penRate: battle.shotsHit ? percentOf({ value: battle.shotsPierced ?? 0, by: battle.shotsHit }) : null
    },
    moe: {
      percent: battle.moePercent,
      delta: battle.moePercentDelta,
      combined: Math.round(combined),
      movingAverage,
      shortfall: movingAverage === null ? null : movingAverage - combined
    },
    mistakes: mistakesOf(input)
  };
};
