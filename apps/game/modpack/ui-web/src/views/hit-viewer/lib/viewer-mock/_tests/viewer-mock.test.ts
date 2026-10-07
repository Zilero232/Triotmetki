import { describe, expect, it } from 'vitest';

import { isViewerPage, mockSides, nextMockState } from '..';

const reply = (message: object) => {
  const sides = mockSides();

  return nextMockState({ sides, state: sides.received, raw: JSON.stringify(message) });
};

describe(isViewerPage, () => {
  it('knows the viewer page by its file', () => {
    expect([isViewerPage('/pages/viewer.html'), isViewerPage('/pages/index.html')]).toStrictEqual([true, false]);
  });
});

describe(nextMockState, () => {
  it('starts on the hits on the own tank with the armour profile', () => {
    const { received } = mockSides();

    expect([received.tab, received.profile?.weak]).toStrictEqual(['received', 'hull_upper']);
  });

  it('answers a tab switch with the hits on the enemies', () => {
    expect(reply({ command: 'tab', tab: 'dealt' })?.summary?.share_label).toBe('Пробито');
  });

  it('moves the selection to the picked hit', () => {
    expect(reply({ command: 'select', index: 3 })?.selected).toBe(3);
  });

  it('leaves a camera move to the hangar', () => {
    expect(reply({ command: 'move', dx: 1, dy: 0, dz: 0 })).toBeNull();
  });
});
