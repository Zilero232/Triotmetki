import { describe, expect, it } from 'vitest';

import { hitPanel, pointerPoint } from '../hit-panel';

type TargetInput = { id: string; left: number; movable?: boolean; pointer?: boolean };

const target = ({ id, left, movable = true, pointer = false }: TargetInput) => ({
  id,
  rect: { left, top: 10, width: 100, height: 40 },
  button: false,
  movable,
  pointer
});

const OVERLAPPING = [target({ id: 'under', left: 0 }), target({ id: 'over', left: 50 })];

const FIXED_WITH_TOOLTIPS = [target({ id: 'tips', left: 0, movable: false, pointer: true })];

describe(hitPanel, () => {
  it('finds the topmost panel where two panels overlap', () => {
    expect(hitPanel({ targets: OVERLAPPING, point: { x: 60, y: 20 } })?.id).toBe('over');
  });

  it('finds the lower panel where only it lies under the pointer', () => {
    expect(hitPanel({ targets: OVERLAPPING, point: { x: 20, y: 20 } })?.id).toBe('under');
  });

  it('misses outside every panel', () => {
    expect(hitPanel({ targets: [target({ id: 'a', left: 0 })], point: { x: 300, y: 20 } })).toBeNull();
  });

  it('skips a panel that may not move', () => {
    expect(hitPanel({ targets: [target({ id: 'fixed', left: 0, movable: false })], point: { x: 20, y: 20 } })).toBeNull();
  });

  it('skips a fixed panel with tooltips when the pointer is not asked for', () => {
    expect(hitPanel({ targets: FIXED_WITH_TOOLTIPS, point: { x: 20, y: 20 } })).toBeNull();
  });

  it('counts a fixed panel with tooltips when the pointer is asked for', () => {
    expect(hitPanel({ targets: FIXED_WITH_TOOLTIPS, point: { x: 20, y: 20 }, pointer: true })?.id).toBe('tips');
  });
});

describe(pointerPoint, () => {
  it('turns client pixels into design pixels at the interface scale', () => {
    expect(pointerPoint({ clientX: 300, clientY: 150, scale: 1.5 })).toEqual({ x: 200, y: 100 });
  });

  it('keeps client pixels as they are when the scale is not known yet', () => {
    expect(pointerPoint({ clientX: 300, clientY: 150, scale: 0 })).toEqual({ x: 300, y: 150 });
  });
});
