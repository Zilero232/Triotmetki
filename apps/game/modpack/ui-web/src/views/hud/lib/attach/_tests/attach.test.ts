import { describe, expect, it } from 'vitest';

import type { HudAttach } from '@/shared/api/hud-protocol';

import { attachRect } from '../attach';

const FULL_HD = { width: 1920, height: 1080 };

const SIZE = { width: 230, height: 44 };

const attach = (kind: HudAttach['kind'], bar = 399, minimap = 310): HudAttach => ({ kind, bar, minimap });

describe(attachRect, () => {
  it('puts the marks panel 12 px right of the consumables panel, 8 px over the bottom', () => {
    const rect = attachRect({ attach: attach('bar_right'), size: SIZE, screen: FULL_HD });

    expect(rect.left).toBe(960 + 399 / 2 + 12);
    expect(rect.top + rect.height).toBe(1080 - 8);
  });

  it('follows the live width of the consumables panel', () => {
    const narrow = attachRect({ attach: attach('bar_right', 285), size: SIZE, screen: FULL_HD });
    const wide = attachRect({ attach: attach('bar_right', 570), size: SIZE, screen: FULL_HD });

    expect(wide.left - narrow.left).toBe((570 - 285) / 2);
  });

  it('moves the marks panel above the right half of the bar when it would reach the minimap', () => {
    const rect = attachRect({ attach: attach('bar_right', 570, 610), size: SIZE, screen: FULL_HD });

    expect(rect.left).toBe(960 + 6);
    expect(rect.top + rect.height).toBe(1080 - 58 - 6);
  });

  it('puts the equipment row 12 px left of the consumables panel', () => {
    const rect = attachRect({ attach: attach('bar_left'), size: SIZE, screen: FULL_HD });

    expect(rect.left + rect.width).toBe(960 - 399 / 2 - 12);
    expect(rect.top + rect.height).toBe(1080 - 8);
  });

  it('lifts the equipment row above the left half of the bar when it would meet the battle log', () => {
    const rect = attachRect({ attach: attach('bar_left', 684), size: { width: 300, height: 44 }, screen: FULL_HD });

    expect(rect.left + rect.width).toBe(960 - 6);
    expect(rect.top + rect.height).toBe(1080 - 64);
  });

  it('keeps both lifted panels apart above the bar', () => {
    const row = attachRect({ attach: attach('bar_left', 684, 610), size: { width: 300, height: 44 }, screen: FULL_HD });
    const marks = attachRect({ attach: attach('bar_right', 684, 610), size: SIZE, screen: FULL_HD });

    expect(row.left + row.width).toBeLessThan(marks.left);
  });

  it('keeps the previous battle card 8 px from the right edge and 12 px above the minimap', () => {
    const small = attachRect({ attach: attach('minimap_above', 399, 210), size: SIZE, screen: FULL_HD });
    const large = attachRect({ attach: attach('minimap_above', 399, 490), size: SIZE, screen: FULL_HD });

    expect(small.left + small.width).toBe(1920 - 8);
    expect(small.top + small.height).toBe(1080 - 210 - 12);
    expect(large.top + large.height).toBe(1080 - 490 - 12);
  });

  it('puts battle progress right of the score strip, under it on a narrow screen', () => {
    const wide = attachRect({ attach: attach('score_right'), size: SIZE, screen: FULL_HD });
    const narrow = attachRect({ attach: attach('score_right'), size: SIZE, screen: { width: 1600, height: 900 } });

    expect([wide.left, wide.top]).toStrictEqual([960 + 308, 4]);
    expect([narrow.left, narrow.top]).toStrictEqual([(1600 - 230) / 2, 52]);
  });
});
