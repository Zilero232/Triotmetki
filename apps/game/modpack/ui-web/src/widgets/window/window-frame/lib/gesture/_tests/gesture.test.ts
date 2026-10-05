import { describe, expect, it } from 'vitest';

import type { Gesture } from '../gesture.types';

import { gestureStep, pointText } from '../gesture';

const FRAME = { x: 100, y: 100, width: 800, height: 500 };

const VIEWPORT = { screen: { width: 1920, height: 1080 }, view: { x: 0, y: 0, width: 1920, height: 1080 }, scale: 2 };

const gesture = (kind: Gesture['kind']): Gesture => ({ kind, startX: 500, startY: 400, frame: FRAME, last: FRAME });

describe(gestureStep, () => {
  it('moves the frame by the pointer travel in rem', () => {
    const step = gestureStep({ gesture: gesture('move'), pointer: { clientX: 540, clientY: 420 }, viewport: VIEWPORT });

    expect(step).toEqual({ frame: { x: 120, y: 110, width: 800, height: 500 }, dx: 20, dy: 10 });
  });

  it('widens the frame from its right edge', () => {
    const step = gestureStep({ gesture: gesture('right'), pointer: { clientX: 540, clientY: 420 }, viewport: VIEWPORT });

    expect(step.frame).toEqual({ x: 100, y: 100, width: 820, height: 500 });
  });
});

describe(pointText, () => {
  it('writes the pointer in whole pixels', () => {
    const text = pointText({ clientX: 10.6, clientY: 20.2 });

    expect(text).toBe('11,20 px');
  });
});
