import outcome from '@contract/install-outcome.json';
import plan from '@contract/install-plan.json';
import { describe, expect, it } from 'vitest';

import { installOutcomeSchema, installPlanSchema } from '@/features/setup/install-modpack';

describe('installPlanSchema', () => {
  it('parses the install plan with the other mods to review', () => {
    const parsed = installPlanSchema.parse(plan);

    expect(parsed.otherMods.map((entry) => entry.location)).toEqual(['mods', 'res_mods']);
  });

  it('carries the current and the parked components of a reinstall', () => {
    const parsed = installPlanSchema.parse(plan);

    expect(parsed.parkedComponents.every((id) => parsed.currentComponents.includes(id))).toBe(true);
  });

  it('carries who owns each runtime dependency in the client', () => {
    const parsed = installPlanSchema.parse(plan);

    expect(parsed.dependencies.map((status) => status.state)).toEqual(['ours', 'user']);
  });
});

describe('installOutcomeSchema', () => {
  it('parses an install that succeeded with a step left undone', () => {
    const parsed = installOutcomeSchema.parse(outcome);

    expect(parsed.warnings).toEqual([{ step: 'dependencies', code: 'http' }]);
    expect(parsed.installation.installed).toBe(true);
  });
});
