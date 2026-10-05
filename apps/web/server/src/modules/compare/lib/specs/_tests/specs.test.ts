import { describe, expect, it } from 'vitest';

import { SPECS } from '../../../config/compare.constants';
import { bestBySpec, isLowerBetter, numericSpecs } from '../specs';

describe('numericSpecs', () => {
  it('flattens nested numbers into dotted keys and drops everything else', () => {
    expect(numericSpecs({ hp: 2_000, gun: { caliber: 130, name: 'M-65' }, tags: [1, 2] })).toEqual({ hp: 2_000, 'gun.caliber': 130 });
  });

  it('keeps the shells, keyed by their position', () => {
    const specs = numericSpecs({
      shells: [
        { shell: 'AP', damage: 390 },
        { shell: 'HE', damage: 530 }
      ]
    });

    expect(specs['shells.0.damage']).toBe(390);
    expect(specs['shells.1.damage']).toBe(530);
  });

  it('leaves out the module bookkeeping of a stored profile', () => {
    const [skipped] = SPECS.skip;

    expect(Object.keys(numericSpecs({ [skipped]: { gun: 1 }, maxHealth: 1_000 }))).toEqual(['maxHealth']);
  });

  it('returns nothing for a value that is not an object', () => {
    expect(numericSpecs(null)).toEqual({});
  });
});

describe('isLowerBetter', () => {
  it('reads the last segment of a nested key', () => {
    const key = SPECS.lowerIsBetter[0] ?? 'reloadTime';

    expect(isLowerBetter(key)).toBe(true);
    expect(isLowerBetter(`clip.${key}`)).toBe(true);
    expect(isLowerBetter('maxHealth')).toBe(false);
  });

  it('knows the calculator stat names the profiles are stored with', () => {
    expect(['reloadTime', 'aimingTime', 'dispersion'].every(isLowerBetter)).toBe(true);
  });
});

describe('bestBySpec', () => {
  it('picks the higher value for an ordinary spec', () => {
    const best = bestBySpec([
      { tankId: 1, specs: { hp: 1_000 } },
      { tankId: 2, specs: { hp: 2_000 } }
    ]);

    expect(best.hp).toBe(2);
  });

  it('picks the lower value for a spec where less is better', () => {
    const key = SPECS.lowerIsBetter[0] ?? 'reloadTime';

    const best = bestBySpec([
      { tankId: 1, specs: { [key]: 10 } },
      { tankId: 2, specs: { [key]: 20 } }
    ]);

    expect(best[key]).toBe(1);
  });

  it('names no winner when every tank has the same value', () => {
    const best = bestBySpec([
      { tankId: 1, specs: { hp: 1_000 } },
      { tankId: 2, specs: { hp: 1_000 } }
    ]);

    expect(best.hp).toBeNull();
  });
});
