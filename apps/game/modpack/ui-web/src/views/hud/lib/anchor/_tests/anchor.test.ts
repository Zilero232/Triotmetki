import { describe, expect, it } from 'vitest';

import type { Rect } from '@/entities/hud/panel-layout';

import { panelRect, placementOf } from '@/entities/hud/panel-layout';
import { designScreen } from '@/shared/lib/design-screen';

import type { Anchor } from '../anchor.types';

import { placeRect, rectStyle } from '../anchor';

const RESOLUTIONS = [
  { width: 1280, height: 720 },
  { width: 1366, height: 768 },
  { width: 1600, height: 900 },
  { width: 1920, height: 1080 },
  { width: 2560, height: 1440 },
  { width: 3440, height: 1440 },
  { width: 3840, height: 2160 }
];

const SCALES = [1, 1.25, 1.5, 1.75, 2];

const FALLBACK = { width: 1920, height: 1080 };

const FULL_HD = { width: 1920, height: 1080 };

const ANCHORS = {
  topRight: { x: -20, y: 120, align_x: 'right', align_y: 'top' },
  topRightInner: { x: -24, y: 72, align_x: 'right', align_y: 'top' },
  bottomLeft: { x: 20, y: -140, align_x: 'left', align_y: 'bottom' },
  topCenter: { x: 0, y: 120, align_x: 'center', align_y: 'top' },
  center: { x: 5, y: -5, align_x: 'center', align_y: 'center' }
} as const satisfies Record<string, Anchor>;

const DEFAULTS: Anchor[] = Object.values(ANCHORS);

const SIZE = { width: 220, height: 80 };

const SCREENS = RESOLUTIONS.flatMap((client) =>
  SCALES.map((scale) => ({
    label: `${client.width}x${client.height} @${scale}`,
    screen: designScreen({ client, scale, fallback: FALLBACK })
  }))
);

const UNSCALED_SCREENS = RESOLUTIONS.map((client) => ({
  label: `${client.width}x${client.height}`,
  screen: designScreen({ client, scale: 1, fallback: FALLBACK })
}));

const EDITOR_RECT = { left: 1500, top: 900, width: 300, height: 60 };

const SMALL_SCREEN = designScreen({ client: { width: 1280, height: 720 }, scale: 2, fallback: FALLBACK });

const inside = ({ rect, screen }: { rect: Rect; screen: { width: number; height: number } }): boolean =>
  rect.left >= 0 && rect.top >= 0 && rect.left + rect.width <= screen.width && rect.top + rect.height <= screen.height;

describe(placeRect, () => {
  it.each([
    { name: 'top right', anchor: ANCHORS.topRight, expected: { left: 1680, top: 120, width: 220, height: 80 } },
    { name: 'bottom left', anchor: ANCHORS.bottomLeft, expected: { left: 20, top: 860, width: 220, height: 80 } },
    { name: 'top centre', anchor: ANCHORS.topCenter, expected: { left: 850, top: 120, width: 220, height: 80 } }
  ])('places a $name panel from its anchor and its measured size', ({ anchor, expected }) => {
    expect(placeRect({ anchor, size: SIZE, screen: FULL_HD })).toEqual(expected);
  });

  it.each(SCREENS)('keeps every default panel whole on $label', ({ screen }) => {
    const cut = DEFAULTS.filter((anchor) => !inside({ rect: placeRect({ anchor, size: SIZE, screen }), screen }));

    expect(cut).toEqual([]);
  });

  it('pulls a panel saved on a bigger screen back into a smaller one', () => {
    const saved = placementOf({ rect: { left: 3300, top: 2000, width: 220, height: 80 }, screen: { width: 3840, height: 2160 } });

    const rect = placeRect({ anchor: saved, size: SIZE, screen: SMALL_SCREEN });

    expect(inside({ rect, screen: SMALL_SCREEN })).toBe(true);
  });

  it('clamps an anchor far off the screen to its nearest corner', () => {
    const lost: Anchor = { x: 3000, y: 2000, align_x: 'left', align_y: 'top' };

    expect(placeRect({ anchor: lost, size: SIZE, screen: SMALL_SCREEN })).toEqual({ left: 420, top: 280, width: 220, height: 80 });
  });

  it.each(SCREENS)('keeps the team HP strip centred on the stock score strip on $label', ({ screen }) => {
    const teamHp: Anchor = { x: 0, y: 4, align_x: 'center', align_y: 'top' };

    const rect = placeRect({ anchor: teamHp, size: { width: 590, height: 44 }, screen });

    expect(rect.left + rect.width / 2).toBeCloseTo(screen.width / 2, 5);
    expect(rect.top).toBe(4);
  });

  it.each(UNSCALED_SCREENS)('keeps a right-anchored panel 20 px from the right edge on $label', ({ screen }) => {
    const rect = placeRect({ anchor: ANCHORS.topRight, size: SIZE, screen });

    expect(screen.width - rect.left - rect.width).toBe(20);
  });

  it('reads a rect in the bottom right corner as a bottom-right placement', () => {
    expect(placementOf({ rect: EDITOR_RECT, screen: FULL_HD })).toMatchObject({ align_x: 'right', align_y: 'bottom' });
  });

  it('puts a placement back on the rect the HUD editor draws', () => {
    const placement = placementOf({ rect: EDITOR_RECT, screen: FULL_HD });

    const placed = placeRect({ anchor: placement, size: EDITOR_RECT, screen: FULL_HD });
    const drawn = panelRect({ panel: { ...placement, width: EDITOR_RECT.width, height: EDITOR_RECT.height }, screen: FULL_HD });

    expect(placed).toEqual(EDITOR_RECT);
    expect(drawn).toEqual(EDITOR_RECT);
  });
});

describe(rectStyle, () => {
  it('rounds a rect to whole rem', () => {
    expect(rectStyle({ rect: { left: 1.4, top: 2.6, width: 3, height: 4 } })).toEqual({ left: '1rem', top: '3rem' });
  });
});
