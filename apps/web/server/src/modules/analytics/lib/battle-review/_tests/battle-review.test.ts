import type { TankReference } from '@otmetki/schemas';

import { moeAlpha, nextMoeEma } from '@otmetki/ratings';
import { describe, expect, it } from 'vitest';

import type { ReviewedBattle } from '../battle-review.types';

import { BATTLE_REVIEW } from '../../../config/battle-review.constants';
import { combinedOf, movingAverageBefore, reviewBattle } from '../battle-review';

const DURATION = 400;

const BATTLE: ReviewedBattle = {
  damageDealt: 3000,
  damageAssistedRadio: 800,
  damageAssistedTrack: 200,
  damageAssistedStun: 0,
  damageBlocked: 1200,
  frags: 2,
  spotted: 2,
  survived: true,
  lifetimeSec: 400,
  durationSec: DURATION,
  shotsFired: 10,
  shotsHit: 9,
  shotsPierced: 8,
  moePercent: 80,
  moePercentDelta: 0.3,
  moeMovingAvg: null
};

const REFERENCE: TankReference = { battles: 50, winRate: 52, avgDamage: 3000, avgAssisted: 800, avgSpotted: 2, avgFrags: 1, avgBlocked: 1000 };

describe('movingAverageBefore', () => {
  it('inverts the EMA step the game applied after the battle', () => {
    const before = 3500;
    const after = nextMoeEma({ ema: before, combinedDamage: combinedOf(BATTLE) });

    expect(movingAverageBefore({ ...BATTLE, moeMovingAvg: after })).toBeCloseTo(before);
  });

  it('is null when the mod sent no moving average', () => {
    expect(movingAverageBefore(BATTLE)).toBeNull();
    expect(moeAlpha()).toBeGreaterThan(0);
  });
});

describe('reviewBattle', () => {
  it('finds no mistakes in a battle on the tank average', () => {
    expect(reviewBattle({ battle: BATTLE, reference: REFERENCE, vehicleType: 'mediumTank' }).mistakes).toEqual([]);
  });

  it('flags a battle without damage as noDamage rather than lowDamage', () => {
    const codes = reviewBattle({ battle: { ...BATTLE, damageDealt: 0 }, reference: REFERENCE, vehicleType: 'mediumTank' }).mistakes.map(
      (mistake) => mistake.code
    );

    expect(codes).toContain('noDamage');
    expect(codes).not.toContain('lowDamage');
  });

  it('flags an early death by the share of the battle survived', () => {
    const lifetimeSec = Math.floor(DURATION * BATTLE_REVIEW.earlyDeathShare) - 1;
    const review = reviewBattle({ battle: { ...BATTLE, survived: false, lifetimeSec }, reference: REFERENCE, vehicleType: 'mediumTank' });

    expect(review.mistakes.map((mistake) => mistake.code)).toContain('diedEarly');
  });

  it('flags a lost MoE percent and reports the shortfall against the moving average', () => {
    const after = nextMoeEma({ ema: 5000, combinedDamage: combinedOf(BATTLE) });
    const review = reviewBattle({
      battle: { ...BATTLE, moePercentDelta: -0.4, moeMovingAvg: after },
      reference: REFERENCE,
      vehicleType: 'mediumTank'
    });

    expect(review.mistakes.map((mistake) => mistake.code)).toContain('moeLoss');
    expect(review.moe.shortfall).toBeCloseTo(5000 - combinedOf(BATTLE));
  });

  it('leaves efficiency ratios null without a reference', () => {
    const review = reviewBattle({ battle: BATTLE, reference: null, vehicleType: null });

    expect(Object.values(review.efficiency).every((value) => value === null)).toBe(true);
  });
});
