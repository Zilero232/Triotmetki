// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useOrbitCamera } from '..';

const surface = () => {
  const onMove = vi.fn();
  const onHover = vi.fn();
  const onLeave = vi.fn();
  const node = document.createElement('div');
  const { result } = renderHook(() => useOrbitCamera({ onMove, onHover, onLeave }));

  document.body.append(node);
  result.current(node);

  return { node, onMove, onHover, onLeave };
};

const mouse = (target: EventTarget, type: string, point: { x: number; y: number }) => {
  target.dispatchEvent(new MouseEvent(type, { clientX: point.x, clientY: point.y, bubbles: true }));
};

describe(useOrbitCamera, () => {
  it('reports the cursor over the surface while no button is held', () => {
    const { node, onHover } = surface();

    mouse(node, 'mousemove', { x: 40, y: 30 });

    expect(onHover).toHaveBeenCalledWith({ x: 40, y: 30 });
  });

  it('turns the camera by a drag', () => {
    const { node, onMove } = surface();

    mouse(node, 'mousedown', { x: 10, y: 10 });
    mouse(node, 'mousemove', { x: 22, y: 6 });

    expect(onMove).toHaveBeenCalledWith({ dx: 12, dy: -4, dz: 0 });
  });

  it('casts no hover ray while dragging', () => {
    const { node, onHover } = surface();

    mouse(node, 'mousedown', { x: 10, y: 10 });
    mouse(node, 'mousemove', { x: 22, y: 6 });

    expect(onHover).not.toHaveBeenCalled();
  });

  it('drops the card when a drag starts', () => {
    const { node, onLeave } = surface();

    mouse(node, 'mousedown', { x: 10, y: 10 });

    expect(onLeave).toHaveBeenCalledOnce();
  });

  it('hovers again after the button is released', () => {
    const { node, onHover } = surface();

    mouse(node, 'mousedown', { x: 10, y: 10 });
    mouse(window, 'mouseup', { x: 10, y: 10 });
    mouse(node, 'mousemove', { x: 15, y: 15 });

    expect(onHover).toHaveBeenCalledWith({ x: 15, y: 15 });
  });
});
