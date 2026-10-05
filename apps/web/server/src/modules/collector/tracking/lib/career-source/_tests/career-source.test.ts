import { describe, expect, it } from 'vitest';

import { careerSourceFromBlock } from '../career-source';

describe('careerSourceFromBlock', () => {
  it('reads the assist split and the record tanks from a Lesta block', () => {
    const source = careerSourceFromBlock({
      battles: 10,
      wins: 5,
      losses: 5,
      draws: 0,
      xp: 1,
      damage_dealt: 1,
      damage_received: 1,
      frags: 1,
      spotted: 1,
      capture_points: 0,
      dropped_capture_points: 0,
      hits: 1,
      shots: 1,
      survived_battles: 1,
      avg_damage_assisted_radio: 410.5,
      max_xp: 2100,
      max_xp_tank_id: 3
    });

    expect(source).toMatchObject({ avgDamageAssistedRadio: 410.5, avgDamageAssisted: null, maxXp: 2100, maxXpTankId: 3 });
  });
});
