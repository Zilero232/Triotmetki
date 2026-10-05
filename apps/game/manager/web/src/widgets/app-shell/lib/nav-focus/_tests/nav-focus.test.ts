import { describe, expect, it } from 'vitest';

import { navFocusIndex } from '../nav-focus';

describe('navFocusIndex', () => {
  it('moves down to the next item', () => {
    expect(navFocusIndex({ key: 'ArrowDown', current: 1, count: 6 })).toBe(2);
  });

  it('wraps from the last item to the first', () => {
    expect(navFocusIndex({ key: 'ArrowDown', current: 5, count: 6 })).toBe(0);
  });

  it('wraps from the first item up to the last', () => {
    expect(navFocusIndex({ key: 'ArrowUp', current: 0, count: 6 })).toBe(5);
  });

  it('jumps to the ends with Home and End', () => {
    expect(navFocusIndex({ key: 'End', current: 2, count: 6 })).toBe(5);
  });

  it('ignores keys that do not move the focus', () => {
    expect(navFocusIndex({ key: 'Enter', current: 2, count: 6 })).toBeNull();
  });
});
