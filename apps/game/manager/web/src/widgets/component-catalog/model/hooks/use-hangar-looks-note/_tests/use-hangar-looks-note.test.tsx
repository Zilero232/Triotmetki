import type { ReactNode } from 'react';

import hangarLooksStatus from '@contract/hangar-looks-status.json';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { mockIPC } from '@tauri-apps/api/mocks';
import { renderHook, waitFor } from '@testing-library/react';
import { IntlProvider } from 'use-intl';
import { describe, expect, it } from 'vitest';

import { MESSAGES } from '@/shared/i18n';

import { useHangarLooksNote } from '../use-hangar-looks-note';

const CLIENT = 'D:\Игры\Мир танков';

const render = (status: unknown) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <IntlProvider locale='ru' messages={MESSAGES.ru}>
        {children}
      </IntlProvider>
    </QueryClientProvider>
  );

  mockIPC(() => status);

  return renderHook(() => useHangarLooksNote(CLIENT), { wrapper });
};

describe('useHangarLooksNote', () => {
  it('names the client the looks were built for and the looks it skipped', async () => {
    const { result } = render(hangarLooksStatus);

    await waitFor(() => expect(result.current).not.toBeNull());

    expect(result.current).toEqual({
      isFailed: false,
      built: 'Собрано для клиента 1.45.0.0',
      skipped: 'Не собраны: Sunset — нет для этой версии игры, Steel — в игре нет нужной текстуры'
    });
  });

  it('shows nothing when no look was generated or skipped', async () => {
    const { result } = render({ state: 'none', clientVersion: null, looks: [], skipped: [] });

    await waitFor(() => expect(result.current).toBeNull());
  });
});
