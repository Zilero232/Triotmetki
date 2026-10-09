import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import { QUERY_KEYS } from '@/shared/constants';
import { messages } from '@/shared/i18n';

import { useCosmeticsPage } from '../use-cosmetics-page';

vi.mock('@/views/cosmetics/api/cosmetics/cosmetics', () => ({
  equipCosmetics: vi.fn(async () => ({ items: [], equipped: {}, isPlus: true, balance: 0 })),
  purchaseCosmetic: vi.fn()
}));

vi.mock('@/entities/player/cosmetics', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getCosmetics: vi.fn(async () => ({ items: [], equipped: {}, isPlus: true, balance: 0 }))
}));

const OWN_ACCOUNT = 7;

const renderPage = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale='en' messages={messages.en} timeZone='UTC'>
        {children}
      </NextIntlClientProvider>
    </QueryClientProvider>
  );

  client.setQueryData(QUERY_KEYS.cosmetics.profile(OWN_ACCOUNT), { frame: null });

  const { result } = renderHook(() => useCosmeticsPage(), { wrapper });

  return { client, result };
};

describe('useCosmeticsPage', () => {
  it('marks the profile cosmetics stale once an item is equipped, so the profile shows the new one', async () => {
    const { client, result } = renderPage();

    act(() => result.current.onEquip({ slot: 'frame', code: 'gold-frame' }));

    await waitFor(() => expect(client.getQueryState(QUERY_KEYS.cosmetics.profile(OWN_ACCOUNT))?.isInvalidated).toBe(true));
  });
});
