import { describe, expect, it } from 'vitest';

import { toTankReference } from '../tank-reference.mappers';

describe('toTankReference', () => {
  it('returns null averages for an empty reference', () => {
    const reference = toTankReference({ battles: 0, wins: 0, damage: 0, assisted: 0, spotted: 0, frags: 0, blocked: 0 });

    expect(reference.avgDamage).toBeNull();
    expect(reference.winRate).toBeNull();
  });

  it('averages per battle', () => {
    expect(toTankReference({ battles: 4, wins: 2, damage: 8000, assisted: 0, spotted: 4, frags: 2, blocked: 0 })).toMatchObject({
      winRate: 50,
      avgDamage: 2000,
      avgSpotted: 1
    });
  });
});
