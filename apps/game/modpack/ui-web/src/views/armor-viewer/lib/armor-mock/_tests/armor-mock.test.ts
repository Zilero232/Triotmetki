import { describe, expect, it } from 'vitest';

import { isArmorPage, mockArmorState, nextArmorState } from '..';

describe(isArmorPage, () => {
  it('knows the armour page by its file', () => {
    expect(isArmorPage('/pages/armor.html')).toBe(true);
  });

  it('leaves the other pages to their own mocks', () => {
    expect(isArmorPage('/pages/viewer.html')).toBe(false);
  });
});

describe(nextArmorState, () => {
  it('switches the tab the page asked for', () => {
    expect(nextArmorState({ state: mockArmorState(), raw: JSON.stringify({ command: 'mode', mode: 'nominal' }) })?.mode).toBe('nominal');
  });

  it('leaves a camera move to the hangar', () => {
    expect(nextArmorState({ state: mockArmorState(), raw: JSON.stringify({ command: 'move', dx: 1, dy: 0, dz: 0 }) })).toBeNull();
  });
});
