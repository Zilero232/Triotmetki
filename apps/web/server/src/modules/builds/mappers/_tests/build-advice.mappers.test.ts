import type { BuildUsage, ProvisionPick } from '@otmetki/schemas';

import { describe, expect, it } from 'vitest';

import { toBuildAdvice } from '../build-advice.mappers';

const pick = (id: number, share: number): ProvisionPick => ({
  option: {
    id,
    tag: `item_${id}`,
    name: `item_${id}`,
    kind: 'optionalDevice',
    variant: null,
    group: null,
    image: null,
    price: null,
    categories: [],
    effects: []
  },
  battles: 10,
  share,
  winRate: null,
  avgDamage: null
});

const usage = (isEnough: boolean): BuildUsage => ({
  mode: 'random',
  cohort: 'top10',
  battles: isEnough ? 120 : 4,
  players: 20,
  minSample: 30,
  isEnough,
  windowDays: 30,
  gameVersion: null,
  computedAt: null,
  winRate: null,
  avgDamage: null,
  equipment: [
    { slot: 0, picks: [pick(1, 0.8), pick(2, 0.2)] },
    { slot: 1, picks: [pick(1, 0.6), pick(3, 0.4)] }
  ],
  consumables: [pick(10, 1), pick(11, 0.9), pick(12, 0.7), pick(13, 0.1)],
  directives: [pick(20, 0.5), pick(21, 0.3)],
  shells: [],
  fieldModifications: [],
  crew: []
});

describe('toBuildAdvice', () => {
  it('lists the recommended equipment, directives and consumables without empty slots', () => {
    expect(toBuildAdvice({ tankId: 7, usage: usage(true) })).toEqual({
      tankId: 7,
      isEnough: true,
      battles: 120,
      equipment: [1, 3],
      directives: [20],
      consumables: [10, 11, 12]
    });
  });

  it('gives empty lists while the sample is too small', () => {
    expect(toBuildAdvice({ tankId: 7, usage: usage(false) })).toEqual({
      tankId: 7,
      isEnough: false,
      battles: 4,
      equipment: [],
      directives: [],
      consumables: []
    });
  });
});
