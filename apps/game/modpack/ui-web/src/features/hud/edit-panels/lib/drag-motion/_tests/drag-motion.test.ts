// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import type { OverlayDrag } from '../drag-motion.types';

import { beyondSlop, dragOutcome, pressedTarget } from '../drag-motion';

const SCREEN = { width: 1920, height: 1080 };

const drag = (overrides: Partial<OverlayDrag> = {}): OverlayDrag => ({
  id: 'clock',
  mouseX: 100,
  mouseY: 100,
  scale: 1,
  rect: { left: 40, top: 60, width: 200, height: 40 },
  moved: false,
  button: false,
  ...overrides
});

describe(beyondSlop, () => {
  it('keeps a press within the click slop a click', () => {
    const isBeyond = beyondSlop({ drag: drag(), press: { clientX: 103, clientY: 96 } });

    expect(isBeyond).toBe(false);
  });

  it('turns a press past the click slop into a drag', () => {
    const isBeyond = beyondSlop({ drag: drag(), press: { clientX: 106, clientY: 100 } });

    expect(isBeyond).toBe(true);
  });
});

describe(dragOutcome, () => {
  it('presses a button released where it was pressed', () => {
    const outcome = dragOutcome({ drag: drag({ button: true }), press: { clientX: 101, clientY: 101 }, screen: SCREEN });

    expect(outcome).toEqual({ kind: 'pressed' });
  });

  it('leaves a panel released where it was pressed in place', () => {
    const outcome = dragOutcome({ drag: drag(), press: { clientX: 101, clientY: 101 }, screen: SCREEN });

    expect(outcome).toEqual({ kind: 'still' });
  });

  it('places a dragged panel at its new top-left anchor', () => {
    const outcome = dragOutcome({ drag: drag(), press: { clientX: 150, clientY: 130 }, screen: SCREEN });

    expect(outcome).toEqual({ kind: 'moved', placement: { x: 90, y: 90, align_x: 'left', align_y: 'top' } });
  });

  it('leaves a panel pressed and nudged by less than the slop in place', () => {
    const outcome = dragOutcome({ drag: drag(), press: { clientX: 104, clientY: 102 }, screen: SCREEN });

    expect(outcome).toEqual({ kind: 'still' });
  });

  it('moves a button that was dragged instead of pressing it', () => {
    const outcome = dragOutcome({ drag: drag({ button: true, moved: true }), press: { clientX: 101, clientY: 101 }, screen: SCREEN });

    expect(outcome.kind).toBe('moved');
  });
});

const TARGET = { id: 'clock', rect: { left: 40, top: 60, width: 200, height: 40 }, button: false, movable: true, pointer: false, scale: 1 };

describe(pressedTarget, () => {
  it('takes the movable panel under a left press during an edit', () => {
    expect(pressedTarget({ edit: true, targets: [TARGET], press: { button: 0, clientX: 100, clientY: 80 } })).toBe(TARGET);
  });

  it('takes nothing outside an edit', () => {
    expect(pressedTarget({ edit: false, targets: [TARGET], press: { button: 0, clientX: 100, clientY: 80 } })).toBeNull();
  });

  it('takes nothing on a right press', () => {
    expect(pressedTarget({ edit: true, targets: [TARGET], press: { button: 2, clientX: 100, clientY: 80 } })).toBeNull();
  });
});
