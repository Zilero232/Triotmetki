// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useOrbitCamera } from '..';

const surface = () => {
  const onMove = vi.fn();
  const node = document.createElement('div');
  const { result } = renderHook(() => useOrbitCamera({ onMove }));

  document.body.append(node);
  result.current(node);

  return { node, onMove };
};

const mouse = (target: EventTarget, type: string, point: { x: number; y: number }) => {
  target.dispatchEvent(new MouseEvent(type, { clientX: point.x, clientY: point.y, bubbles: true }));
};

describe(useOrbitCamera, () => {
  it('turns the camera by a drag', () => {
    const { node, onMove } = surface();

    mouse(node, 'mousedown', { x: 10, y: 10 });
    mouse(node, 'mousemove', { x: 22, y: 6 });

    expect(onMove).toHaveBeenCalledWith({ dx: 12, dy: -4, dz: 0 });
  });

  it('leaves the camera alone after the button is released', () => {
    const { node, onMove } = surface();

    mouse(node, 'mousedown', { x: 10, y: 10 });
    mouse(window, 'mouseup', { x: 10, y: 10 });
    mouse(node, 'mousemove', { x: 15, y: 15 });

    expect(onMove).not.toHaveBeenCalled();
  });
});
