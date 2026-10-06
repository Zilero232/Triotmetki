import { describe, expect, it } from 'vitest';

import { toggledSet } from '@/shared/lib';

const SET: ReadonlySet<string> = new Set(['a']);

describe('toggledSet', () => {
  it('adds the item that is switched on', () => {
    expect([...toggledSet({ set: SET, item: 'b', isOn: true })]).toEqual(['a', 'b']);
  });

  it('removes the item that is switched off', () => {
    expect([...toggledSet({ set: SET, item: 'a', isOn: false })]).toEqual([]);
  });

  it('keeps the set it was given unchanged', () => {
    toggledSet({ set: SET, item: 'b', isOn: true });

    expect([...SET]).toEqual(['a']);
  });
});
