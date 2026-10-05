import { describe, expect, it } from 'vitest';

import { CHALLENGE_BADGES, WEEKLY_CHALLENGES } from '../../../config/challenges.constants';
import { badgeCodeOf, challengeOfBadge, challengeProgress } from '../challenges';

const empty = { battles: 0, wins: 0, spotted: 0, marks: 0, bigDamage: [] };
const heavy = WEEKLY_CHALLENGES.find((definition) => definition.code === 'heavy-4000');
const damage = WEEKLY_CHALLENGES.find((definition) => definition.code === 'damage-3000');

describe('challengeProgress', () => {
  it('counts only big battles on the required vehicle class', () => {
    if (!heavy) {
      throw new Error('heavy challenge missing');
    }

    const stats = {
      ...empty,
      bigDamage: [
        { damage: heavy.threshold, vehicleType: 'heavyTank' },
        { damage: heavy.threshold - 1, vehicleType: 'heavyTank' },
        { damage: heavy.threshold * 2, vehicleType: 'mediumTank' }
      ]
    };

    expect(challengeProgress({ definition: heavy, stats })).toBe(1);
  });

  it('counts every class when none is required', () => {
    if (!damage) {
      throw new Error('damage challenge missing');
    }

    expect(challengeProgress({ definition: damage, stats: { ...empty, bigDamage: [{ damage: damage.threshold, vehicleType: null }] } })).toBe(1);
  });
});

describe('badgeCodeOf', () => {
  it('gives every challenge its own badge', () => {
    const codes = WEEKLY_CHALLENGES.map(badgeCodeOf);

    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe('challengeOfBadge', () => {
  it('finds the challenge of every configured badge and nothing else', () => {
    expect(WEEKLY_CHALLENGES.every((definition) => challengeOfBadge(badgeCodeOf(definition)) === definition)).toBe(true);
    expect(WEEKLY_CHALLENGES.some((definition) => challengeOfBadge(definition.code) !== null)).toBe(false);
    expect(challengeOfBadge(`${CHALLENGE_BADGES.prefix}retired`)).toBeNull();
  });
});
