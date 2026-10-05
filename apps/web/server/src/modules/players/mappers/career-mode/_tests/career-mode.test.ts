import { describe, expect, it } from 'vitest';

import { CAREER_MODE_FROM_DB } from '../../../../collector';
import { careerTotalsFromStored, toCareerModeLine } from '../career-mode';

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
