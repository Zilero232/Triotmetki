import { describe, expect, it } from 'vitest';

import type { HudPanel } from '@/shared/api/hud-protocol';

import { HUD_OVERLAY } from '../../../config';
import { labelStyle, layoutLabels } from '../label-layout';

const SCREEN = { width: 1920, height: 1080 };

const panel = (overrides: Partial<HudPanel>): HudPanel => ({
  id: 'otmetki.hud.panel',
  text: 'text',
  x: 0,
  y: 400,
  align_x: 'center',
  align_y: 'top',
  alpha: 1,
  drag: false,
  border: false,
  visible: true,
  scale: 1,
  widget: null,
  ...overrides
});

const layoutOf = (shown: HudPanel, edit = false) =>
  layoutLabels({
    panels: [shown],
    sizes: { [shown.id]: { lines: 1, width: 200, height: 40 } },
    scales: {},
    overrides: {},
    screen: SCREEN,
    live: null,
    edit,
    widgets: new Map()
  })[0];

const opacityOf = (shown: HudPanel): number | undefined => layoutOf(shown)?.style.opacity;

describe(labelStyle, () => {
  it('places a label at full size without a transform', () => {
    const style = labelStyle({ rect: { left: 10.4, top: 20.6, width: 100, height: 30 }, scale: 1, opacity: 0.8 });

    expect(style).toEqual({ left: '10rem', top: '21rem', opacity: 0.8 });
  });

  it('scales a resized label from its top-left corner', () => {
    const style = labelStyle({ rect: { left: 10, top: 20, width: 100, height: 30 }, scale: 1.5, opacity: 1 });

    expect(style).toEqual({ left: '10rem', top: '20rem', opacity: 1, transform: 'scale(1.5)', transformOrigin: '0 0' });
  });
});

describe(layoutLabels, () => {
  it('fades every panel under the full stats backdrop while Tab is held', () => {
    expect(opacityOf(panel({ cover: 'stats', align_x: 'left', y: 1000 }))).toBe(HUD_OVERLAY.coverAlpha.stats);
  });

  it('fades every panel under a modal stock view', () => {
    expect(opacityOf(panel({ cover: 'modal', align_x: 'left', y: 1000 }))).toBe(HUD_OVERLAY.coverAlpha.modal);
  });

  it('draws a panel at full opacity once Tab is released', () => {
    expect(opacityOf(panel({ cover: '' }))).toBe(1);
  });

  it('takes no drag and no pointer on a covered panel', () => {
    expect(layoutOf(panel({ cover: 'stats', drag: true }), true)).toMatchObject({ movable: false, pointer: false });
  });

  it('keeps a hidden panel laid out in its place, drawn transparent', () => {
    const shown = layoutOf(panel({}));
    const hidden = layoutOf(panel({ visible: false }));

    expect(hidden?.rect).toEqual(shown?.rect);
    expect(hidden?.style.opacity).toBe(HUD_OVERLAY.hidden);
  });

  it('takes no drag on a hidden panel', () => {
    expect(layoutOf(panel({ visible: false, drag: true }), true)?.movable).toBe(false);
  });

  it('counts a measured panel as drawn, hidden with the stock GUI or not', () => {
    expect(layoutOf(panel({}))?.drawn).toBe(true);
    expect(layoutOf(panel({ visible: false }))?.drawn).toBe(true);
  });

  it('counts a panel that never measured as not drawn', () => {
    const [layout] = layoutLabels({
      panels: [panel({})],
      sizes: {},
      scales: {},
      overrides: {},
      screen: SCREEN,
      live: null,
      edit: false,
      widgets: new Map()
    });

    expect(layout?.drawn).toBe(false);
  });

  describe('a docked column beside the panels that follow stock elements', () => {
    const SMALL = { width: 1366, height: 768 };
    const log = panel({
      id: 'otmetki.hud.damage_log',
      x: 232,
      y: -6,
      align_x: 'left',
      align_y: 'bottom',
      dock: { group: 'battle_left_bottom', order: 0, reserve: 560 }
    });

    const equipment = (overrides: Partial<HudPanel> = {}) =>
      panel({ id: 'otmetki.hud.battle_loadout', align_y: 'bottom', attach: { kind: 'bar_above', bar: 399, minimap: 310 }, ...overrides });

    const logTop = (shown: HudPanel[], moved: Partial<Record<string, { x: number; y: number; align_x: 'left'; align_y: 'top' }>> = {}) =>
      layoutLabels({
        panels: shown,
        sizes: {
          'otmetki.hud.damage_log': { lines: 6, width: 363, height: 145 },
          'otmetki.hud.battle_loadout': { lines: 1, width: 298, height: 55 }
        },
        scales: {},
        overrides: moved,
        screen: SMALL,
        live: null,
        edit: false,
        widgets: new Map()
      }).find((layout) => layout.id === 'otmetki.hud.damage_log')?.rect.top;

    it('lifts the damage log over the equipment row on a small screen', () => {
      const equipmentTop = 768 - HUD_OVERLAY.attach.bar.height - HUD_OVERLAY.attach.bar.keys - HUD_OVERLAY.attach.bar.above - 55;

      expect(logTop([log, equipment()])).toBe(equipmentTop - HUD_OVERLAY.dock.gap - 145);
    });

    it('lifts the damage log over the consumables panel while the equipment row is hidden', () => {
      expect(logTop([log, equipment({ visible: false })])).toBe(768 - HUD_OVERLAY.attach.bar.height - HUD_OVERLAY.dock.gap - 145);
    });

    it('leaves the damage log at its anchor on a full HD screen', () => {
      const [layout] = layoutLabels({
        panels: [log, equipment()],
        sizes: {
          'otmetki.hud.damage_log': { lines: 6, width: 363, height: 145 },
          'otmetki.hud.battle_loadout': { lines: 1, width: 298, height: 55 }
        },
        scales: {},
        overrides: {},
        screen: SCREEN,
        live: null,
        edit: false,
        widgets: new Map()
      });

      expect(layout?.rect.top).toBe(1080 - 6 - 145);
    });
  });
});
