import { describe, expect, it } from 'vitest';

import { WINDOW_FRAME } from '../../../config';
import { boundsOf, centredFrame, clampFrame, fitFrame, layoutOf, moveFrame, resizeFrame, zoomStep } from '../frame';

const FULL_HD = { left: 0, top: 0, right: 1920, bottom: 1080 };
const SMALL = { left: 0, top: 0, right: 1280, bottom: 720 };
const FULL_HD_SCREEN = { width: 1920, height: 1080 };
const ODD_SCREEN = { width: 1663, height: 962 };
const SAVED = { placed: true, x: 100, y: 60, width: 1000, height: 700, zoom: 100 };
const FRAME = { x: 100, y: 100, width: 1000, height: 700 };

const view = (x: number, y: number, size = ODD_SCREEN) => ({ x, y, ...size });

const frameOf = (width: number, height: number) => ({ x: 0, y: 0, width, height });

describe(boundsOf, () => {
  it('is the whole screen for a view at the screen origin', () => {
    expect(boundsOf({ screen: FULL_HD_SCREEN, view: view(0, 0, FULL_HD_SCREEN) })).toEqual(FULL_HD);
  });

  it('is the part of the screen the view covers, in the view, for a view pushed right and down', () => {
    const bounds = boundsOf({ screen: ODD_SCREEN, view: view(211.5, 81) });

    expect(bounds).toEqual({ left: 0, top: 0, right: 1451.5, bottom: 881 });
  });

  it('is the part of the screen the view covers, in the view, for a view pushed left and up', () => {
    const bounds = boundsOf({ screen: ODD_SCREEN, view: view(-100, -50) });

    expect(bounds).toEqual({ left: 100, top: 50, right: 1663, bottom: 962 });
  });

  it('falls back to the screen while the view has no size yet', () => {
    const bounds = boundsOf({ screen: FULL_HD_SCREEN, view: view(700, 300, { width: 0, height: 0 }) });

    expect(bounds).toEqual({ left: 0, top: 0, right: 1220, bottom: 780 });
  });

  it('falls back to the whole screen for an unsized view placed off it', () => {
    const bounds = boundsOf({ screen: FULL_HD_SCREEN, view: view(5000, 0, { width: 0, height: 0 }) });

    expect(bounds).toEqual(FULL_HD);
  });
});

describe(fitFrame, () => {
  it('opens centred at the default size the first time', () => {
    const frame = fitFrame({ saved: { ...SAVED, placed: false, width: 0, height: 0 }, bounds: FULL_HD });

    expect(frame).toEqual({ x: 340, y: 140, width: 1240, height: 800 });
  });

  it('opens centred at the saved size', () => {
    expect(fitFrame({ saved: SAVED, bounds: FULL_HD })).toEqual({ x: 460, y: 190, width: 1000, height: 700 });
  });

  it('ignores a saved position off the screen and shrinks to fit', () => {
    const frame = fitFrame({ saved: { ...SAVED, x: 5000, y: -3000 }, bounds: SMALL });

    expect(frame).toEqual({ x: 140, y: 24, width: 1000, height: 672 });
  });

  it('centres in the visible part of a view placed off the screen origin', () => {
    const bounds = boundsOf({ screen: ODD_SCREEN, view: view(211.5, 81) });

    const frame = fitFrame({ saved: { ...SAVED, width: 1240, height: 800 }, bounds });

    expect(frame).toEqual({ x: 106, y: 41, width: 1240, height: 800 });
  });
});

describe(centredFrame, () => {
  it('keeps the margin on a screen smaller than the default size', () => {
    expect(centredFrame({ bounds: SMALL })).toEqual({ x: 24, y: 24, width: 1232, height: 672 });
  });
});

describe(clampFrame, () => {
  it('keeps the minimum size', () => {
    expect(clampFrame({ frame: frameOf(100, 100), bounds: FULL_HD })).toEqual({ x: 0, y: 0, width: 760, height: 480 });
  });

  it('goes under the minimum size on a screen smaller than it', () => {
    const frame = clampFrame({ frame: frameOf(100, 100), bounds: { left: 0, top: 0, right: 640, bottom: 400 } });

    expect(frame).toEqual({ x: 0, y: 0, width: 640, height: 400 });
  });

  it('never leaves the visible part of the view', () => {
    const frame = clampFrame({ frame: frameOf(1000, 700), bounds: { left: 100, top: 50, right: 1663, bottom: 962 } });

    expect(frame).toEqual({ x: 100, y: 50, width: 1000, height: 700 });
  });
});

describe(moveFrame, () => {
  it('drags the window by the pointer offset', () => {
    expect(moveFrame({ frame: FRAME, dx: 50, dy: -30, bounds: FULL_HD })).toEqual({ x: 150, y: 70, width: 1000, height: 700 });
  });

  it('stops the window at the screen edges', () => {
    expect(moveFrame({ frame: FRAME, dx: 5000, dy: -5000, bounds: FULL_HD })).toEqual({ x: 920, y: 0, width: 1000, height: 700 });
  });
});

describe(resizeFrame, () => {
  it.each([
    ['corner', { x: 100, y: 100, width: 1040, height: 730 }],
    ['right', { x: 100, y: 100, width: 1040, height: 700 }],
    ['bottom', { x: 100, y: 100, width: 1000, height: 730 }]
  ] as const)('grows by the dragged %s edge only', (edge, expected) => {
    expect(resizeFrame({ frame: FRAME, dx: 40, dy: 30, edge, bounds: FULL_HD })).toEqual(expected);
  });

  it('never grows past the screen', () => {
    const frame = resizeFrame({ frame: FRAME, dx: 5000, dy: 5000, edge: 'corner', bounds: FULL_HD });

    expect(frame).toEqual({ x: 100, y: 100, width: 1820, height: 980 });
  });

  it('never shrinks under the minimum size', () => {
    const frame = resizeFrame({ frame: FRAME, dx: -900, dy: -900, edge: 'corner', bounds: FULL_HD });

    expect(frame).toEqual({ x: 100, y: 100, width: 760, height: 480 });
  });
});

describe(zoomStep, () => {
  it.each([
    ['steps up to the next zoom', 100, 1, 110],
    ['steps down to the previous zoom', 100, -1, 90],
    ['stays at the largest zoom', 150, 1, 150],
    ['stays at the smallest zoom', 80, -1, 80],
    ['snaps an odd zoom up onto a step', 105, 1, 110],
    ['snaps an odd zoom down onto a step', 105, -1, 100]
  ] as const)('%s (%i, %i → %i)', (_name, zoom, direction, expected) => {
    expect(zoomStep({ zoom, direction })).toBe(expected);
  });
});

describe(layoutOf, () => {
  it('shows two columns and the full nav on a wide window at 100%', () => {
    expect(layoutOf({ frame: frameOf(1400, 800), zoom: 100 })).toMatchObject({ compactNav: false, columns: 2, scale: 1 });
  });

  it('drops to one column when a larger zoom narrows the content', () => {
    expect(layoutOf({ frame: frameOf(1400, 800), zoom: 125 })).toMatchObject({ compactNav: false, columns: 1 });
  });

  it('compacts the nav on a narrow window', () => {
    expect(layoutOf({ frame: frameOf(900, 600), zoom: 100 })).toMatchObject({ compactNav: true, columns: 1 });
  });

  it('gives the content more room at a smaller zoom', () => {
    expect(layoutOf({ frame: frameOf(1000, 600), zoom: 80 }).inner).toEqual({ width: 1250, height: 750 });
  });

  it('does not scale the content at the default zoom', () => {
    expect(layoutOf({ frame: frameOf(1400, 800), zoom: WINDOW_FRAME.defaultZoom }).scale).toBe(1);
  });
});
