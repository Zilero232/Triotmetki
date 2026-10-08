import type { VehicleSummary } from '@otmetki/schemas';
import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { getMoeHistory } from '@/entities/player/marks/api/marks/marks';

import { useMoeProjection } from '../use-moe-projection';

vi.mock('@/entities/player/marks/api/marks/marks', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getMoeHistory: vi.fn()
}));

const VEHICLE: VehicleSummary = {
  tankId: 7169,
  name: 'IS-7',
  shortName: 'IS-7',
  slug: 'is-7',
  nation: 'ussr',
  type: 'heavyTank',
  tier: 10,
  isPremium: false,
  isCollectible: false,
  status: 'researchable',
  images: { small: null, contour: null, big: null, large: null }
};

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>
);

describe('useMoeProjection', () => {
  it('reports a failed threshold lookup instead of a missing tank', async () => {
    vi.mocked(getMoeHistory).mockRejectedValue(new Error('down'));

    const { result } = renderHook(() => useMoeProjection({ vehicle: VEHICLE, percent: 50, damage: 3000, target: '3' }), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
