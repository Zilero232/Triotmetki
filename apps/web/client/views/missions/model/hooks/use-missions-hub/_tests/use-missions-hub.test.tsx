import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { getMissionCampaigns } from '@/entities/mission/mission';
import { QUERY_KEYS } from '@/shared/constants';

import { useMissionsHub } from '../use-missions-hub';

vi.mock('@/entities/mission/mission', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getMissionCampaigns: vi.fn()
}));

const renderHub = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

  client.setQueryData(QUERY_KEYS.auth.session, null);

  return renderHook(() => useMissionsHub(), { wrapper });
};

describe('useMissionsHub', () => {
  it('keeps the hero figure while the campaigns load', () => {
    vi.mocked(getMissionCampaigns).mockReturnValue(new Promise(() => undefined));

    const { result } = renderHub();

    expect(result.current.hasFigure).toBe(true);
  });

  it('keeps the hero figure when the campaigns fail, so the hero does not shrink', async () => {
    vi.mocked(getMissionCampaigns).mockRejectedValue(new Error('down'));

    const { result } = renderHub();

    await waitFor(() => expect(result.current.campaigns.isError).toBe(true));
    expect(result.current.hasFigure).toBe(true);
  });
});
