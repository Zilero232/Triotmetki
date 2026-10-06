import { describe, expect, it } from 'vitest';

import { inputAreaKey, inputAreaOf } from '../input-area';

const SCREEN = { width: 1920, height: 1080 };

describe(inputAreaOf, () => {
  it('takes the whole screen while a hangar edit or a drag needs it', () => {
    expect(inputAreaOf({ whole: true, screen: SCREEN, rects: [] })).toEqual({ left: 0, top: 0, width: 1920, height: 1080 });
  });

  it('keeps a single corner pixel when no panel takes the mouse, never an empty area', () => {
    expect(inputAreaOf({ whole: false, screen: SCREEN, rects: [] })).toEqual({ left: 0, top: 0, width: 1, height: 1 });
  });

  it('covers only the clickable panels, widened to whole pixels', () => {
    const button = { left: 1870.4, top: 90, width: 36, height: 36 };

    const area = inputAreaOf({ whole: false, screen: SCREEN, rects: [button] });

    expect(area).toEqual({ left: 1870, top: 90, width: 37, height: 36 });
  });

  it('stays inside the view at a fractional design size, where a panel flush with the bottom edge would reach past it', () => {
    const screen = { width: 3840 / 1.75, height: 2160 / 1.75 };
    const marks = { left: 1300.4, top: screen.height - 63, width: 249, height: 63 };

    const area = inputAreaOf({ whole: false, screen, rects: [marks] });

    expect(area).toEqual({ left: 1300, top: 1171, width: 250, height: 63 });
    expect(area.top + area.height).toBeLessThanOrEqual(screen.height);
  });

  it('cuts a panel that reaches past the left or top edge', () => {
    expect(inputAreaOf({ whole: false, screen: SCREEN, rects: [{ left: -4.5, top: -2, width: 20, height: 10 }] })).toEqual({
      left: 0,
      top: 0,
      width: 16,
      height: 8
    });
  });

  it('takes the whole view in whole design pixels', () => {
    expect(inputAreaOf({ whole: true, screen: { width: 2194.29, height: 1234.6 }, rects: [] })).toEqual({
      left: 0,
      top: 0,
      width: 2194,
      height: 1234
    });
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
