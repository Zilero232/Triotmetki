import { describe, expect, it } from 'vitest';

import { tankTrendPointSchema } from '../tank.schemas';

const point = { date: '2026-09-01', battles: 200, players: 50, winRate: 55, avgDamage: 2_000 } as const;

describe('tankTrendPointSchema', () => {
  it('accepts a day with a known player count', () => {
    expect(tankTrendPointSchema.safeParse(point).success).toBe(true);
  });

  it('accepts an unknown player count on a compressed day', () => {
    expect(tankTrendPointSchema.safeParse({ ...point, players: null }).success).toBe(true);
  });
});
