import { describe, expect, it } from 'vitest';

import { LOADOUT } from '../../community/community.constants';
import { loadoutRequestSchema } from '../builds.schemas';

const loadout = { equipment: [], consumables: [], crewSkills: {} };

describe('loadoutRequestSchema', () => {
  it('caps the module names an anonymous calculator request can carry', () => {
    expect(loadoutRequestSchema.safeParse({ loadout, modules: { gun: 'x'.repeat(LOADOUT.nameLength + 1) } }).success).toBe(false);
    expect(loadoutRequestSchema.safeParse({ loadout, modules: { gun: 'L7A1' } }).success).toBe(true);
  });
});
