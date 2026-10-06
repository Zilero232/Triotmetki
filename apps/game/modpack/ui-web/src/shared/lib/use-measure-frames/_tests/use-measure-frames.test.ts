// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useMeasureFrames } from '../use-measure-frames';

const FRAME_MS = 16;

describe(useMeasureFrames, () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('measures at once and then on the given number of frames', () => {
    const measure = vi.fn();

    renderHook(() => useMeasureFrames({ measure, frames: 3, restartKey: 'a' }));
    act(() => vi.advanceTimersByTime(FRAME_MS * 10));

    expect(measure).toHaveBeenCalledTimes(4);
  });

  it('waits for the first frame when told to skip the first measure', () => {
    const measure = vi.fn();

    renderHook(() => useMeasureFrames({ measure, frames: 2, restartKey: 'a', skipsFirst: true }));

    expect(measure).not.toHaveBeenCalled();
  });

  it('does not restart on a render with the same key', () => {
    const measure = vi.fn();
    const hook = renderHook(() => useMeasureFrames({ measure, frames: 1, restartKey: 'a' }));

    act(() => vi.advanceTimersByTime(FRAME_MS * 4));
    hook.rerender();
    act(() => vi.advanceTimersByTime(FRAME_MS * 4));

    expect(measure).toHaveBeenCalledTimes(2);
  });

  it('restarts when the key changes', () => {
    const measure = vi.fn();
    const hook = renderHook(({ restartKey }) => useMeasureFrames({ measure, frames: 1, restartKey }), { initialProps: { restartKey: 'a' } });

    act(() => vi.advanceTimersByTime(FRAME_MS * 4));
    hook.rerender({ restartKey: 'b' });
    act(() => vi.advanceTimersByTime(FRAME_MS * 4));

    expect(measure).toHaveBeenCalledTimes(4);
  });

  it('does nothing while disabled', () => {
    const measure = vi.fn();

    renderHook(() => useMeasureFrames({ measure, frames: 2, restartKey: 'a', isEnabled: false }));
    act(() => vi.advanceTimersByTime(FRAME_MS * 4));

    expect(measure).not.toHaveBeenCalled();
  });
});
