// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { tweenAt, useTween } from '../use-tween';

describe(tweenAt, () => {
  it('starts at the old value and ends at the new one', () => {
    expect(tweenAt({ from: 80, to: 81, progress: 0, step: 0.01 })).toBe(80);
    expect(tweenAt({ from: 80, to: 81, progress: 1, step: 0.01 })).toBe(81);
  });

  it('moves fast first, as an ease-out does', () => {
    expect(tweenAt({ from: 0, to: 100, progress: 0.5, step: 1 })).toBe(88);
  });

  it('rounds to the step the value is shown with', () => {
    expect(tweenAt({ from: 0, to: 1000, progress: 0.3, step: 1 }) % 1).toBe(0);
  });
});

describe(useTween, () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the first value at once', () => {
    const hook = renderHook(() => useTween({ value: 82.91, step: 0.01 }));

    expect(hook.result.current).toBe(82.91);
  });

  it('runs to a new value over the duration', () => {
    const hook = renderHook(({ value }) => useTween({ value, step: 1 }), { initialProps: { value: 0 } });

    hook.rerender({ value: 1000 });

    act(() => {
      vi.advanceTimersByTime(80);
    });

    expect(hook.result.current).toBeGreaterThan(0);
    expect(hook.result.current).toBeLessThan(1000);

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(hook.result.current).toBe(1000);
  });

  it('shows nothing for no value', () => {
    const hook = renderHook(() => useTween({ value: null, step: 1 }));

    expect(hook.result.current).toBeNull();
  });
});
