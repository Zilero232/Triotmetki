import { modGoalSchema, modGoalsSchema } from '@otmetki/schemas';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import type { Goal } from '../../../../../generated';

import { toModGoal } from '../goals.mappers';

const contractExample = (name: string): unknown =>
  JSON.parse(readFileSync(new URL(`../../../../../../../game/modpack/contract/examples/${name}`, import.meta.url), 'utf8'));

const row: Goal = {
  id: '7d1f0f5e-3a52-4c1b-9b6f-1d3c2a4b5e6f',
  userId: 'user',
  accountId: 12_345_678n,
  metric: 'avgDamage',
  tankId: null,
  target: 3000,
  baseline: 2410,
  current: 2740.4,
  status: 'active',
  startsAt: new Date('2026-09-27T17:00:00.000Z'),
  endsAt: new Date('2026-09-28T23:59:00.000Z'),
  achievedAt: null,
  createdAt: new Date('2026-09-27T17:00:00.000Z')
};

describe('toModGoal', () => {
  it('answers exactly the contract shape, with the counted battles and without the owner', () => {
    const goal = toModGoal({ row, battles: 12 });

    expect(modGoalSchema.parse(goal)).toEqual(goal);
    expect(goal).toMatchObject({ tank_id: null, battles: 12, achieved_at: null, starts_at: row.startsAt.toISOString() });
  });
});

describe('the goals contract example', () => {
  it('parses against the answer the server serialises through', () => {
    expect(modGoalsSchema.safeParse(contractExample('goals.example.json')).success).toBe(true);
  });
});
