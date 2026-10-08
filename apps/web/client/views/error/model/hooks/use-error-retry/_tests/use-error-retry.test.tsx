import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useErrorRetry } from '../use-error-retry';

const router = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock('@/shared/i18n/navigation', () => ({ useRouter: () => router }));

describe('useErrorRetry', () => {
  it('refreshes the server components before resetting the boundary', () => {
    const calls: string[] = [];

    router.refresh.mockImplementation(() => calls.push('refresh'));
    const reset = vi.fn(() => calls.push('reset'));
    const { result } = renderHook(() => useErrorRetry({ reset }));

    act(() => {
      result.current.retry();
    });

    expect(calls).toEqual(['refresh', 'reset']);
  });
});
