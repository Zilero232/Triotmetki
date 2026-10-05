import { describe, expect, it } from 'vitest';

import { inputAreaKey, inputAreaOf } from '../input-area';

const SCREEN = { width: 1920, height: 1080 };

describe(inputAreaOf, () => {
  it('takes the whole screen while a hangar edit or a drag needs it', () => {
    expect(inputAreaOf({ whole: true, screen: SCREEN, rects: [] })).toEqual({ left: 0, top: 0, width: 1920, height: 1080 });
  });

  it('lets every click through when no panel takes the mouse', () => {
    expect(inputAreaOf({ whole: false, screen: SCREEN, rects: [] })).toEqual({ left: 0, top: 0, width: 0, height: 0 });
  });

  it('covers only the clickable panels, widened to whole pixels', () => {
    const button = { left: 1870.4, top: 90, width: 36, height: 36 };

    const area = inputAreaOf({ whole: false, screen: SCREEN, rects: [button] });

    expect(area).toEqual({ left: 1870, top: 90, width: 37, height: 36 });
  });

  it('spans every clickable panel at once', () => {
    const rects = [
      { left: 10, top: 20, width: 30, height: 40 },
      { left: 100, top: 5, width: 50, height: 10 }
    ];

    expect(inputAreaOf({ whole: false, screen: SCREEN, rects })).toEqual({ left: 10, top: 5, width: 140, height: 55 });
  });
});

describe(inputAreaKey, () => {
  it('joins an area into one comparable key', () => {
    expect(inputAreaKey({ left: 1870, top: 90, width: 37, height: 36 })).toBe('1870,90,37,36');
  });
});
