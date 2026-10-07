import { describe, expect, it } from 'vitest';

import type { UiPanel } from '@/shared/api/protocol';

import { HUD_EDITOR } from '../../../config';
import { panelFit, panelLayer, panelLook, panelTone, placedPanels, stackOrder, stageFrame, stageWidthFor } from '../panel-view';

const rect = (width: number, height: number) => ({ left: 0, top: 0, width, height });

describe(panelFit, () => {
  it('labels a panel wide and tall enough for its name on the stage', () => {
    expect(panelFit({ rect: rect(330, 190), scale: 0.4 })).toBe('label');
  });

  it('shows only the icon of a panel too narrow for its name', () => {
    expect(panelFit({ rect: rect(128, 128), scale: 0.4 })).toBe('icon');
  });

  it('shows only the icon of a panel too short for its name', () => {
    expect(panelFit({ rect: rect(260, 30), scale: 0.4 })).toBe('icon');
  });

  it('draws a panel smaller than its icon as a bare block', () => {
    expect(panelFit({ rect: rect(30, 20), scale: 0.4 })).toBe('bare');
  });
});

describe(stackOrder, () => {
  it('stacks a smaller panel above a larger one', () => {
    const order = stackOrder([
      { id: 'small', rect: rect(100, 20) },
      { id: 'large', rect: rect(300, 200) }
    ]);

    expect(order.get('small')).toBe(2);
  });

  it('keeps the largest panel at the bottom', () => {
    const order = stackOrder([
      { id: 'small', rect: rect(100, 20) },
      { id: 'large', rect: rect(300, 200) }
    ]);

    expect(order.get('large')).toBe(1);
  });
});

describe(panelLayer, () => {
  it('brings a hovered panel above the selected one', () => {
    expect(panelLayer({ base: 1, selected: false, hovered: true })).toBe(201);
  });

  it('lifts the selected panel above the rest', () => {
    expect(panelLayer({ base: 3, selected: true, hovered: false })).toBe(103);
  });

  it('leaves any other panel at its size order', () => {
    expect(panelLayer({ base: 3, selected: false, hovered: false })).toBe(3);
  });
});

describe(stageFrame, () => {
  it('keeps the screen aspect ratio on the stage', () => {
    expect(stageFrame({ screen: { width: 2560, height: 1080 }, width: 768 }).style.height).toBe('324rem');
  });

  it('scales the screen down to the stage width', () => {
    expect(stageFrame({ screen: { width: 1920, height: 1080 }, width: 768 }).scale).toBe(0.4);
  });

  it('sizes the stage to the width it is given', () => {
    expect(stageFrame({ screen: { width: 1920, height: 1080 }, width: 960 }).style).toEqual({ width: '960rem', height: '540rem' });
  });
});

describe(stageWidthFor, () => {
  it('fills the width of the page', () => {
    expect(stageWidthFor(943)).toBe(943);
  });

  it('fills a page wider than any screen preset', () => {
    expect(stageWidthFor(2194)).toBe(2194);
  });

  it('never shrinks below the smallest stage', () => {
    expect(stageWidthFor(200)).toBe(HUD_EDITOR.stage.minWidth);
  });
});

describe(panelTone, () => {
  it('marks the selected or hovered panel in accent', () => {
    expect(panelTone({ active: true, enabled: false })).toBe('accent');
  });

  it('dims a disabled panel', () => {
    expect(panelTone({ active: false, enabled: false })).toBe('muted');
  });

  it('draws an enabled panel in the text colour', () => {
    expect(panelTone({ active: false, enabled: true })).toBe('text');
  });
});

const PANEL: UiPanel = {
  id: 'clock',
  title: 'Clock',
  enabled: true,
  x: 100,
  y: 50,
  align_x: 'left',
  align_y: 'top',
  preview: null,
  width: 120,
  height: 40
};

const SCREEN = { width: 1920, height: 1080 };

describe(placedPanels, () => {
  it('leaves the disabled panels out unless they are shown', () => {
    const placed = placedPanels({ panels: [PANEL, { ...PANEL, id: 'off', enabled: false }], showDisabled: false, live: null, screen: SCREEN });

    expect(placed.map(({ panel }) => panel.id)).toEqual(['clock']);
  });

  it('puts the dragged panel where the drag holds it', () => {
    const live = { id: 'clock', rect: rect(10, 10) };

    const [placed] = placedPanels({ panels: [PANEL], showDisabled: false, live, screen: SCREEN });

    expect(placed?.rect).toBe(live.rect);
  });
});

describe(panelLook, () => {
  it('marks the hovered panel active', () => {
    const look = panelLook({
      placed: { panel: PANEL, rect: rect(330, 190) },
      scale: 0.4,
      screen: SCREEN,
      order: new Map(),
      selected: null,
      hovered: 'clock'
    });

    expect(look.active).toBe(true);
  });

  it('keeps a panel nobody points at quiet', () => {
    const look = panelLook({
      placed: { panel: PANEL, rect: rect(330, 190) },
      scale: 0.4,
      screen: SCREEN,
      order: new Map(),
      selected: null,
      hovered: null
    });

    expect(look.tone).toBe('text');
  });
});
