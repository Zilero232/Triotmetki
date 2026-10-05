import { describe, expect, it } from 'vitest';

import type { HudAttach } from '@/shared/api/hud-protocol';

import { HUD_OVERLAY } from '../../../config';
import { attachRect, stockBarRect } from '../attach';

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

  it('puts the equipment row above the left half of the consumables panel', () => {
    const rect = attachRect({ attach: attach('bar_left'), size: SIZE, screen: FULL_HD });

    expect(rect.left + rect.width).toBe(960 - 6);
    expect(rect.top + rect.height).toBe(1080 - 64);
  });

  it('keeps the equipment row above the bar however wide the bar is', () => {
    const narrow = attachRect({ attach: attach('bar_left', 285), size: SIZE, screen: FULL_HD });
    const wide = attachRect({ attach: attach('bar_left', 684), size: SIZE, screen: FULL_HD });

    expect(wide).toStrictEqual(narrow);
  });

  it('keeps both lifted panels apart above the bar', () => {
    const row = attachRect({ attach: attach('bar_left', 684, 610), size: { width: 300, height: 44 }, screen: FULL_HD });
    const marks = attachRect({ attach: attach('bar_right', 684, 610), size: SIZE, screen: FULL_HD });

    expect(row.left + row.width).toBeLessThan(marks.left);
  });

  it('moves the marks panel right of the post-mortem tips when the bar is gone', () => {
    const { width } = HUD_OVERLAY.postmortemTips;
    const rect = attachRect({ attach: attach('bar_right', 0), size: SIZE, screen: FULL_HD });

    expect(rect.left).toBe(960 + width / 2 + 12);
    expect(rect.top + rect.height).toBe(1080 - 8);
  });

  it('lifts the marks panel above the post-mortem tips when there is no room beside them', () => {
    const { height } = HUD_OVERLAY.postmortemTips;
    const rect = attachRect({ attach: attach('bar_right', 0, 610), size: SIZE, screen: { width: 1707, height: 960 } });

    expect(rect.left).toBe(1707 / 2 + 6);
    expect(rect.top + rect.height).toBe(960 - height - 6);
  });

  it('keeps the equipment row above the post-mortem tips when the bar is gone', () => {
    const { height } = HUD_OVERLAY.postmortemTips;
    const rect = attachRect({ attach: attach('bar_left', 0), size: { width: 160, height: 44 }, screen: FULL_HD });

    expect(rect.top + rect.height).toBe(1080 - height - 6);
  });

  it('drops the previous battle card to the corner when the minimap is gone', () => {
    const rect = attachRect({ attach: attach('minimap_above', 399, 0), size: SIZE, screen: FULL_HD });

    expect(rect.left + rect.width).toBe(1920 - 8);
    expect(rect.top + rect.height).toBe(1080 - 8);
  });

  it('keeps the previous battle card 8 px from the right edge and 12 px above the minimap', () => {
    const small = attachRect({ attach: attach('minimap_above', 399, 210), size: SIZE, screen: FULL_HD });
    const large = attachRect({ attach: attach('minimap_above', 399, 490), size: SIZE, screen: FULL_HD });

    expect(small.left + small.width).toBe(1920 - 8);
    expect(small.top + small.height).toBe(1080 - 210 - 12);
    expect(large.top + large.height).toBe(1080 - 490 - 12);
  });

  it('puts battle progress right of the score strip, under its right half on a narrow screen', () => {
    const wide = attachRect({ attach: attach('score_right'), size: SIZE, screen: FULL_HD });
    const narrow = attachRect({ attach: attach('score_right'), size: SIZE, screen: { width: 1600, height: 900 } });

    expect([wide.left, wide.top]).toStrictEqual([960 + 308, 4]);
    expect([narrow.left, narrow.top]).toStrictEqual([800 + 308 - 12 - 230, 52]);
  });
});

describe(stockBarRect, () => {
  it('is the consumables panel centred at the bottom of the screen', () => {
    expect(stockBarRect({ attach: attach('bar_left'), screen: FULL_HD })).toEqual({
      left: (1920 - 399) / 2,
      top: 1080 - HUD_OVERLAY.attach.bar.height,
      width: 399,
      height: HUD_OVERLAY.attach.bar.height
    });
  });

  it('is nothing while the consumables panel is off the screen', () => {
    expect(stockBarRect({ attach: attach('bar_left', 0), screen: FULL_HD })).toBeNull();
  });
});
