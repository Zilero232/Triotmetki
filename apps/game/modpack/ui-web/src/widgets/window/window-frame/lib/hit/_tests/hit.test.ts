import { describe, expect, it } from 'vitest';

import { gestureAt } from '..';

const rect = (left: number, top: number, width: number, height: number) => ({ left, top, width, height });

const TARGETS = [
  { kind: 'corner' as const, rect: rect(980, 680, 20, 20) },
  { kind: 'right' as const, rect: rect(994, 0, 6, 700) },
  { kind: 'move' as const, rect: rect(0, 0, 240, 60) },
  { kind: 'bottom' as const, rect: null }
];

describe(gestureAt, () => {
  it('finds the title grip under the pointer', () => {
    expect(gestureAt({ targets: TARGETS, x: 20, y: 30 })).toBe('move');
  });

  it('prefers the corner grip to the edge it overlaps', () => {
    expect(gestureAt({ targets: TARGETS, x: 996, y: 690 })).toBe('corner');
  });

  it('finds the edge away from the corner', () => {
    expect(gestureAt({ targets: TARGETS, x: 996, y: 300 })).toBe('right');
  });

  it('starts nothing over the content', () => {
    expect(gestureAt({ targets: TARGETS, x: 500, y: 300 })).toBeNull();
  });

  it('starts nothing over a handle that is not drawn', () => {
    expect(gestureAt({ targets: [{ kind: 'move', rect: rect(0, 0, 0, 0) }], x: 0, y: 0 })).toBeNull();
  });
});
