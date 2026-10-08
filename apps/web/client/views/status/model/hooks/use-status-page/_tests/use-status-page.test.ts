import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useStatusPage } from '../use-status-page';

type HealthState = {
  isError: boolean;
  data: { collector: { jobs: [] }; build: null } | undefined;
};

const health: HealthState = vi.hoisted(() => ({ isError: false, data: undefined }));

vi.mock('@/entities/reference/service-health', () => ({
  useServiceHealth: () => ({
    summary: { status: 'down', verdict: 'down', components: [] },
    query: { data: health.data, isError: health.isError, isPending: false, isFetching: false, dataUpdatedAt: 0, refetch: vi.fn() }
  })
}));

describe('useStatusPage', () => {
  it('reports the collector section as failed when health could not be loaded', () => {
    health.isError = true;
    health.data = undefined;

    const { result } = renderHook(() => useStatusPage());

    expect(result.current.isCollectorError).toBe(true);
  });

  it('keeps showing the last collector data after a failed refresh', () => {
    health.isError = true;
    health.data = { collector: { jobs: [] }, build: null };

    const { result } = renderHook(() => useStatusPage());

    expect(result.current.isCollectorError).toBe(false);
  });
});
