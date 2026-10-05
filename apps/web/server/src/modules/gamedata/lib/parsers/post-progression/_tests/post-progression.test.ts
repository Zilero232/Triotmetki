import { describe, expect, it } from 'vitest';

import { loadCatalog } from '../../../_tests/fixtures';
import { fieldModificationIdOf } from '../../../ids/ids';
import { resolveVehicleProgression } from '../post-progression';

const { postProgression } = loadCatalog();

describe('parsePostProgression', () => {
  it('reads the tree steps with their actions and unlocks', () => {
    const tree = postProgression.trees.find((item) => item.name === 'role_HT_break');
    const root = tree?.steps.find((step) => step.id === tree.rootStep);

    expect(root?.action.type).toBe('feature');
    expect(root?.unlocks.length).toBeGreaterThan(0);
    expect(tree?.steps.some((step) => step.minVehicleLevel !== undefined)).toBe(true);
  });

  it('reads modifications with structured modifiers and their own id space', () => {
    for (const modification of postProgression.modifications) {
      expect(modification.provisionId).toBe(fieldModificationIdOf(modification.id));
      expect(modification.modifiers.length).toBeGreaterThan(0);
    }
  });

  it('keys the name by locName and falls back to the tag for pair modifications', () => {
    const withLocName = postProgression.modifications.find((item) => item.locName !== undefined);
    const withoutLocName = postProgression.modifications.find((item) => item.locName === undefined);

    expect(withLocName?.nameKey).toBe(`artefacts:${withLocName?.locName}/name`);
    expect(withoutLocName?.nameKey).toBe(`artefacts:${withoutLocName?.name}/name`);
  });

  it('reads per-level prices with currencies', () => {
    const base = postProgression.prices.unlockBaseModificationCost;

    expect(base[10]?.currency).toBe('xp');
    expect(base[10]?.amount).toBeGreaterThan(base[6]?.amount ?? Infinity);
  });
});

describe('resolveVehicleProgression', () => {
  const steps = (vehicleTier: number) => resolveVehicleProgression({ progression: postProgression, treeName: 'role_HT_break', vehicleTier });

  it('drops the steps a lower tier vehicle cannot reach', () => {
    expect(steps(7).length).toBeLessThan(steps(10).length);
    expect(steps(7).every((step) => step.minVehicleLevel === undefined || step.minVehicleLevel <= 7)).toBe(true);
  });

  it('attaches modifications and both halves of a pair', () => {
    const resolved = steps(10);

    expect(resolved.filter((step) => step.action.type === 'modification').every((step) => step.modification)).toBe(true);
    expect(resolved.filter((step) => step.action.type === 'pair_modification').every((step) => step.pair?.length === 2)).toBe(true);
  });

  it('returns nothing for a vehicle without a tree', () => {
    expect(resolveVehicleProgression({ progression: postProgression, treeName: undefined, vehicleTier: 10 })).toEqual([]);
  });
});
