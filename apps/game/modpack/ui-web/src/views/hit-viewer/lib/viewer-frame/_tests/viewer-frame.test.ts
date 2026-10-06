import { describe, expect, it } from 'vitest';

import { pickerListHeight, tableBodyHeight, viewerFrame } from '..';

const SCREEN = { width: 1920, height: 1080 };

describe('viewerFrame', () => {
  it('leaves the lobby bar at the bottom of a full HD screen free', () => {
    expect(viewerFrame({ screen: SCREEN, view: null })).toEqual({ left: 0, top: 0, width: 1920, height: 1035, scale: 1 });
  });

  it('keeps the part of a view that starts below the screen top on screen', () => {
    const frame = viewerFrame({ screen: SCREEN, view: { x: 0, y: 60, width: 1920, height: 1080 } });

    expect(frame.height).toBe(975);
  });

  it('starts on screen when the view begins above it', () => {
    const frame = viewerFrame({ screen: SCREEN, view: { x: -10, y: -20, width: 1940, height: 1100 } });

    expect([frame.left, frame.top, frame.width, frame.height]).toEqual([10, 20, 1920, 1035]);
  });

  it('never draws smaller than the interface scale on a small screen', () => {
    expect(viewerFrame({ screen: { width: 1366, height: 768 }, view: null }).scale).toBe(1);
  });

  it('grows on a large design screen and fills it exactly', () => {
    const frame = viewerFrame({ screen: { width: 2560, height: 1440 }, view: null });

    expect([frame.width * frame.scale, frame.height * frame.scale]).toEqual([2560, 1395]);
  });

  it('follows the narrow side of a tall window', () => {
    expect(viewerFrame({ screen: { width: 1318, height: 2064 }, view: null }).scale).toBe(1);
  });

  it('stops growing at twice the interface scale', () => {
    expect(viewerFrame({ screen: { width: 7680, height: 4320 }, view: null }).scale).toBe(2);
  });

  it('keeps the interface scale before the screen is known', () => {
    expect(viewerFrame({ screen: { width: 0, height: 0 }, view: null }).scale).toBe(1);
  });
});

describe('row heights', () => {
  it('sizes the table body to its rows in rem, the unit the client scales', () => {
    expect(tableBodyHeight(3)).toBe('102rem');
  });

  it('shows at most six battles before the list scrolls', () => {
    expect(pickerListHeight(9)).toBe('408rem');
  });
});
