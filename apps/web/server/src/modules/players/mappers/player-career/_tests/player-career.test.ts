import { describe, expect, it } from 'vitest';

import type { CareerSource } from '../../../../collector';

import { careerRecordRefs, toPlayerAssist } from '../player-career';

const empty: CareerSource = {
  avgDamageAssisted: null,
  avgDamageAssistedRadio: null,
  avgDamageAssistedTrack: null,
  avgDamageAssistedStun: null,
  maxDamage: null,
  maxDamageTankId: null,
  maxXp: null,
  maxXpTankId: null,
  maxFrags: null,
  maxFragsTankId: null
};

describe('toPlayerAssist', () => {
  it('returns null when Lesta reported no assist at all', () => {
    expect(toPlayerAssist(empty)).toBeNull();
  });

  it('keeps a zero assist, which is a real value for a heavy tank player', () => {
    expect(toPlayerAssist({ ...empty, avgDamageAssisted: 0 })).toEqual({ avgAssisted: 0, avgRadio: null, avgTrack: null, avgStun: null });
  });
});

describe('careerRecordRefs', () => {
  it('lists only records the player has, with the tank they were set on', () => {
    expect(careerRecordRefs({ ...empty, maxDamage: 8200, maxDamageTankId: 7, maxFrags: 0 })).toEqual([{ key: 'maxDamage', value: 8200, tankId: 7 }]);
  });
});
