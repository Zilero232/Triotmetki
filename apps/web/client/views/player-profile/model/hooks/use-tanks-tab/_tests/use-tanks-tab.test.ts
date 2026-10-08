import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useTanksTab } from '../use-tanks-tab';

type TanksState = {
  data: { items: { vehicle: { name: string } }[] } | undefined;
};

const tanks: TanksState = vi.hoisted(() => ({ data: undefined }));

vi.mock('@/views/player-profile/model/context/tanks-filter/tanks-filter-context', () => ({
  useTanksFilterContext: () => ({ request: {}, matches: (name: string) => name.startsWith('IS') })
}));

vi.mock('@/views/player-profile/model/hooks/use-profile-queries/use-profile-queries', () => ({
  usePlayerTanks: () => ({ data: tanks.data })
}));

const tank = (name: string) => ({ vehicle: { name } });

describe('useTanksTab', () => {
  it('hides the count while the tanks are loading', () => {
    tanks.data = undefined;

    const { result } = renderHook(() => useTanksTab());

    expect(result.current.total).toBeNull();
  });

  it('counts the tanks that match the filter once loaded', () => {
    tanks.data = { items: [tank('IS-7'), tank('T-62A'), tank('IS-4')] };

    const { result } = renderHook(() => useTanksTab());

    expect(result.current.total).toBe(2);
  });
});
