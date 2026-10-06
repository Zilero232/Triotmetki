import plan from '@contract/cache-plan.json';
import { describe, expect, it } from 'vitest';

import { cachePlanSchema } from '@/features/settings/clear-cache';

import { cacheRows, chosenTargets, totalBytes } from '../cache-rows';

const { targets } = cachePlanSchema.parse(plan);
const [first, second] = targets;
const sizeOf = (bytes: number) => `${bytes} B`;

describe('cacheRows', () => {
  it('unticks the targets the player unchecked', () => {
    const rows = cacheRows({ targets, unchecked: new Set([first?.id ?? '']), sizeOf });

    expect(rows.map((row) => row.checked)).toEqual([false, true]);
  });

  it('formats the size of each target', () => {
    expect(cacheRows({ targets, unchecked: new Set(), sizeOf })[0]?.size).toBe(`${first?.sizeBytes} B`);
  });
});

describe('chosenTargets', () => {
  it('leaves the unchecked targets out', () => {
    expect(chosenTargets({ targets, unchecked: new Set([first?.id ?? '']) })).toEqual([second]);
  });
});

describe('totalBytes', () => {
  it('sums the sizes of the targets', () => {
    expect(totalBytes(targets)).toBe((first?.sizeBytes ?? 0) + (second?.sizeBytes ?? 0));
  });

  it('is zero for no targets', () => {
    expect(totalBytes([])).toBe(0);
  });
});
