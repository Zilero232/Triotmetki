import { TANK_CHALLENGES } from '@otmetki/schemas';
import { describe, expect, it } from 'vitest';

import type { BattleSample } from '../../battle-samples/battle-samples.types';

import { TANK_CHALLENGE_POOL } from '../../../config/tank-challenges.constants';
import { challengeProgress, weeklyTankChallenges } from '../tank-challenges';

const battle = (overrides: Partial<BattleSample>): BattleSample => ({
  tankId: 1,
  battles: 1,
  wins: 0,
  damage: 0,
  spotted: 0,
  frags: 0,
  blocked: 0,
  survived: 0,
  isSingle: true,
  moeRaised: null,
  ...overrides
});

describe('weeklyTankChallenges', () => {
  it('gives the same set for the same seed and distinct metrics within a set', () => {
    const first = weeklyTankChallenges({ seed: '1:2:2026-09-21', tier: 8, hasModData: true });
    const again = weeklyTankChallenges({ seed: '1:2:2026-09-21', tier: 8, hasModData: true });

    expect(again).toEqual(first);
    expect(first).toHaveLength(TANK_CHALLENGES.perTank);
    expect(new Set(first.map((challenge) => challenge.metric)).size).toBe(first.length);
  });

  it('rotates between weeks', () => {
    const weeks = ['2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28', '2026-10-05'];
    const sets = weeks.map((week) =>
      weeklyTankChallenges({ seed: `1:2:${week}`, tier: 8, hasModData: true })
        .map((challenge) => challenge.metric)
        .join()
    );

    expect(new Set(sets).size).toBeGreaterThan(1);
  });

  it('never offers a mod-only challenge to a player without mod data', () => {
    const modOnly = new Set<string>(TANK_CHALLENGE_POOL.filter((definition) => definition.needsMod).map((definition) => definition.metric));

    for (let index = 0; index < 50; index += 1) {
      const set = weeklyTankChallenges({ seed: `seed-${index}`, tier: 10, hasModData: false });

      expect(set.some((challenge) => modOnly.has(challenge.metric))).toBe(false);
    }
  });

  it('asks for more damage on a higher tier', () => {
    const thresholdOf = (tier: number) => {
      for (let index = 0; index < 200; index += 1) {
        const found = weeklyTankChallenges({ seed: `s-${index}`, tier, hasModData: true }).find((challenge) => challenge.metric === 'damageBattles');

        if (found) {
          return found.threshold ?? 0;
        }
      }

      return 0;
    };

    expect(thresholdOf(10)).toBeGreaterThan(thresholdOf(4));
  });
});

describe('challengeProgress', () => {
  it('counts only single battles over the damage threshold', () => {
    const samples = [battle({ damage: 4000 }), battle({ damage: 3999 }), battle({ damage: 9000, battles: 3, isSingle: false })];

    expect(challengeProgress({ challenge: { metric: 'damageBattles', threshold: 4000 }, samples })).toBe(1);
  });

  it('counts only battles that raised the mark', () => {
    const samples = [battle({ moeRaised: true }), battle({ moeRaised: false }), battle({ moeRaised: null })];

    expect(challengeProgress({ challenge: { metric: 'moeBattles', threshold: null }, samples })).toBe(1);
  });

  it('sums totals across aggregated samples', () => {
    const samples = [battle({ spotted: 3 }), battle({ spotted: 4, battles: 2, isSingle: false })];

    expect(challengeProgress({ challenge: { metric: 'spotted', threshold: null }, samples })).toBe(7);
    expect(challengeProgress({ challenge: { metric: 'battles', threshold: null }, samples })).toBe(3);
  });

  it('is zero with no battles', () => {
    expect(challengeProgress({ challenge: { metric: 'wins', threshold: null }, samples: [] })).toBe(0);
  });
});
