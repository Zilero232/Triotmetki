// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useLastPresent } from '../use-last-present';

describe(useLastPresent, () => {
  it('passes a present value through', () => {
    const { result } = renderHook(() => useLastPresent('dot'));

    expect(result.current).toBe('dot');
  });

  it('keeps the last present value once the value is gone', () => {
    const initialProps: { value: string | null } = { value: 'dot' };
    const { result, rerender } = renderHook(({ value }) => useLastPresent(value), { initialProps });

    rerender({ value: null });

    expect(result.current).toBe('dot');
  });

  it('gives nothing before a value was ever present', () => {
    const { result } = renderHook(() => useLastPresent<string>(null));

    expect(result.current).toBeNull();
  });
});
