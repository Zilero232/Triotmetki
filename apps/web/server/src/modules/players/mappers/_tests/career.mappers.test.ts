import { describe, expect, it } from 'vitest';

import type { CareerSource } from '../../../collector';

import { CAREER_MODE_FROM_DB } from '../../../collector';
import { careerRecordRefs, careerTotalsFromStored, toCareerModeLine, toPlayerAssist } from '../career.mappers';

const totals = careerTotalsFromStored({
  battles: 40,
  wins: 22,
  damageDealt: 80_000n,
  xp: 36_000n,
  frags: 30,
  survived: 12,
  maxDamage: 6100,
  updatedAt: new Date('2026-09-28T10:00:00Z')
});

describe('toCareerModeLine', () => {
  it('turns lifetime totals into per-battle figures under the public mode name', () => {
    const line = toCareerModeLine({ mode: 'epic', totals, tanks: [] });

    expect(line.mode).toBe(CAREER_MODE_FROM_DB.epic);
    expect(line.winRate).toBeCloseTo(55);
    expect(line.avgDamage).toBe(2000);
    expect(line.survivalRate).toBeCloseTo(30);
    expect(line.updatedAt).toBe('2026-09-28T10:00:00.000Z');
  });

  it('reports no record rather than a zero one', () => {
    expect(toCareerModeLine({ mode: 'ranked', totals: { ...totals, maxDamage: 0 }, tanks: [] }).maxDamage).toBeNull();
  });
});

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
