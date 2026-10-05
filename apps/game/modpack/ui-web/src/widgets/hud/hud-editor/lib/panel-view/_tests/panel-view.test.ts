import { describe, expect, it } from 'vitest';

import { panelFit, panelLayer, panelTone, stackOrder, stageFrame, stageWidthFor } from '../panel-view';

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
  const screen = { width: 1920, height: 1080 };

  it('fills the width of the page', () => {
    expect(stageWidthFor({ room: { width: 943, height: 900 }, screen })).toBe(943);
  });

  it('narrows the stage so its height fits the page', () => {
    expect(stageWidthFor({ room: { width: 943, height: 432 }, screen })).toBe(768);
  });

  it('keeps an ultrawide screen as wide as the page allows', () => {
    expect(stageWidthFor({ room: { width: 943, height: 432 }, screen: { width: 3440, height: 1440 } })).toBe(943);
  });

  it('never grows taller than the largest stage', () => {
    expect(stageWidthFor({ room: { width: 3000, height: 3000 }, screen })).toBe(1280);
  });

  it('lets an ultrawide stage grow wider at the same height', () => {
    expect(stageWidthFor({ room: { width: 3000, height: 3000 }, screen: { width: 2560, height: 1080 } })).toBe(1706);
  });

  it('never grows wider than the widest stage', () => {
    expect(stageWidthFor({ room: { width: 4000, height: 3000 }, screen: { width: 5120, height: 1440 } })).toBe(1760);
  });

  it('never shrinks below the smallest stage', () => {
    expect(stageWidthFor({ room: { width: 200, height: 100 }, screen })).toBe(320);
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
