import { describe, expect, it } from 'vitest';

import { tableBodyHeight, viewerFrame } from '..';

describe('viewerFrame', () => {
  it('keeps the interface scale on a full HD design screen', () => {
    expect(viewerFrame({ screen: { width: 1920, height: 1080 } })).toEqual({ scale: 1, width: 1920, height: 1080 });
  });

  it('never draws smaller than the interface scale on a small screen', () => {
    expect(viewerFrame({ screen: { width: 1366, height: 768 } }).scale).toBe(1);
  });

  it('grows on a large design screen to look like full HD', () => {
    expect(viewerFrame({ screen: { width: 2560, height: 1440 } })).toEqual({ scale: 4 / 3, width: 1920, height: 1080 });
  });

  it('follows the shorter side of a tall screen', () => {
    expect(viewerFrame({ screen: { width: 2194, height: 1234 } }).width).toBeCloseTo(1920, 0);
  });

  it('stops growing at twice the interface scale', () => {
    expect(viewerFrame({ screen: { width: 7680, height: 4320 } }).scale).toBe(2);
  });

  it('keeps the interface scale before the screen is known', () => {
    expect(viewerFrame({ screen: { width: 0, height: 0 } }).scale).toBe(1);
  });
});

describe('tableBodyHeight', () => {
  it('sizes the body to its rows in rem, the unit the client scales', () => {
    expect(tableBodyHeight(3)).toBe('96rem');
  });
});
