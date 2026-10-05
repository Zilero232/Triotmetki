import { describe, expect, it } from 'vitest';

import { clampRect, dragRect, dragTo, moveMessage, panelRect, pastSlop, placementOf, stageScale } from '../panel-geometry';

const SCREEN = { width: 1920, height: 1080 };
const STAGE = { width: 640, height: 360 };
const PANEL_SIZE = { width: 200, height: 40 };
const TOP_RIGHT_RECT = { left: 1700, top: 30, ...PANEL_SIZE };
const DRAG = { id: 'damage_log', mouseX: 100, mouseY: 100, scale: 0.5, rect: { left: 400, top: 400, ...PANEL_SIZE } };
const RECT = { left: 100, top: 100, ...PANEL_SIZE };

describe(panelRect, () => {
  it('takes the offsets from the top left corner of a top-left panel', () => {
    const rect = panelRect({ panel: { x: 10, y: 20, align_x: 'left', align_y: 'top', ...PANEL_SIZE }, screen: SCREEN });

    expect(rect).toEqual({ left: 10, top: 20, width: 200, height: 40 });
  });

  it('centres a centred panel on the screen', () => {
    const rect = panelRect({ panel: { x: 0, y: 0, align_x: 'center', align_y: 'center', ...PANEL_SIZE }, screen: SCREEN });

    expect(rect).toMatchObject({ left: 860, top: 520 });
  });

  it('takes the offsets from the bottom right corner of a bottom-right panel', () => {
    const rect = panelRect({ panel: { x: -20, y: -10, align_x: 'right', align_y: 'bottom', ...PANEL_SIZE }, screen: SCREEN });

    expect(rect).toMatchObject({ left: 1700, top: 1030 });
  });
});

describe(placementOf, () => {
  it('anchors a panel in the top right third to the top right corner', () => {
    const placement = placementOf({ rect: TOP_RIGHT_RECT, screen: SCREEN });

    expect(placement).toEqual({ x: -20, y: 30, align_x: 'right', align_y: 'top' });
  });

  it('anchors a panel in the bottom middle third to the bottom centre', () => {
    const placement = placementOf({ rect: { left: 860, top: 900, ...PANEL_SIZE }, screen: SCREEN });

    expect(placement).toEqual({ x: 0, y: -140, align_x: 'center', align_y: 'bottom' });
  });

  it('round-trips with panelRect', () => {
    const rect = { left: 333, top: 444, width: 120, height: 60 };

    const placement = placementOf({ rect, screen: SCREEN });

    expect(panelRect({ panel: { ...placement, width: 120, height: 60 }, screen: SCREEN })).toEqual(rect);
  });
});

describe(dragRect, () => {
  it('snaps the dragged panel to the grid', () => {
    const dragged = dragRect({ rect: RECT, dx: 13, dy: -7, screen: SCREEN, grid: 4 });

    expect(dragged).toMatchObject({ left: 112, top: 92 });
  });

  it('keeps a panel dragged too far on screen', () => {
    const dragged = dragRect({ rect: RECT, dx: 5000, dy: -5000, screen: SCREEN, grid: 4 });

    expect(dragged).toMatchObject({ left: 1720, top: 0 });
  });
});

describe(clampRect, () => {
  it('pulls a panel off screen back inside it', () => {
    const clamped = clampRect({ rect: { left: -5, top: 2000, width: 3000, height: 40 }, screen: SCREEN });

    expect(clamped).toMatchObject({ left: 0, top: 1040 });
  });
});

describe(stageScale, () => {
  it('fits the screen into the stage', () => {
    expect(stageScale({ screen: SCREEN, stage: STAGE })).toBeCloseTo(1 / 3);
  });

  it('treats a screen without a size as one pixel', () => {
    expect(stageScale({ screen: { width: 0, height: 0 }, stage: STAGE })).toBe(360);
  });
});

describe(dragTo, () => {
  it('moves the panel by the pointer distance in screen pixels', () => {
    const moved = dragTo({ drag: DRAG, pointer: { x: 110, y: 90 }, screen: SCREEN, grid: 4 });

    expect(moved).toEqual({ id: 'damage_log', rect: { left: 420, top: 380, width: 200, height: 40 } });
  });

  it('refuses a stage that has no size yet', () => {
    const moved = dragTo({ drag: { ...DRAG, scale: 0 }, pointer: { x: 110, y: 90 }, screen: SCREEN, grid: 4 });

    expect(moved).toBeNull();
  });
});

describe(moveMessage, () => {
  it('sends the placement of the moved rectangle', () => {
    const message = moveMessage({ id: 'damage_log', rect: TOP_RIGHT_RECT, screen: SCREEN });

    expect(message).toEqual({ type: 'hud_move', panel: 'damage_log', x: -20, y: 30, align_x: 'right', align_y: 'top' });
  });
});

describe(pastSlop, () => {
  it('keeps a pointer within the slop a press', () => {
    const isPast = pastSlop({ from: { x: 100, y: 100 }, to: { x: 103, y: 104 }, slop: 5 });

    expect(isPast).toBe(false);
  });

  it('counts the slop along the diagonal', () => {
    const isPast = pastSlop({ from: { x: 100, y: 100 }, to: { x: 104, y: 104 }, slop: 5 });

    expect(isPast).toBe(true);
  });
});
