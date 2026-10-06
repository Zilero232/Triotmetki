import type { ReactNode } from 'react';

import hangarLooksStatus from '@contract/hangar-looks-status.json';
import installation from '@contract/installation.json';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { mockIPC } from '@tauri-apps/api/mocks';
import { act, renderHook, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { IntlProvider } from 'use-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useComponentToggle } from '@/features/component/component-toggle';
import { COMMANDS, QUERY_KEYS } from '@/shared/config';
import { MESSAGES } from '@/shared/i18n';

const CLIENT = 'D:\\Игры\\Мир танков';
const TITLE = 'Лог попаданий';
const LIBRARIES = ['OpenWG Gameface', 'ModsList'];

const setup = () => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <IntlProvider locale='ru' messages={MESSAGES.ru}>
        {children}
      </IntlProvider>
    </QueryClientProvider>
  );

  return { queryClient, wrapper };
};

describe('useComponentToggle', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends the switch to the Rust core and stores the installation it returns', async () => {
    const calls: unknown[] = [];

    mockIPC((command, args) => {
      calls.push({ command, args });

      return installation;
    });

    const { queryClient, wrapper } = setup();
    const { result } = renderHook(() => useComponentToggle({ clientPath: CLIENT, componentId: 'hit_log', title: TITLE, libraries: LIBRARIES }), {
      wrapper
    });

    act(() => result.current.onCheckedChange(false));

    await waitFor(() => expect(queryClient.getQueryData(QUERY_KEYS.installation(CLIENT))).toEqual(installation));
    await waitFor(() => expect(calls).toHaveLength(2));

    expect(calls).toEqual([
      { command: COMMANDS.setComponentEnabled, args: { clientPath: CLIENT, componentId: 'hit_log', enabled: false } },
      { command: COMMANDS.getHangarLooksStatus, args: { clientPath: CLIENT } }
    ]);
  });

  it('warns without blocking when the hangar looks could not be built', async () => {
    const warning = vi.spyOn(toast, 'warning');

    mockIPC((command) => (command === COMMANDS.getHangarLooksStatus ? { ...hangarLooksStatus, state: 'failed' } : installation));

    const { queryClient, wrapper } = setup();
    const { result } = renderHook(() => useComponentToggle({ clientPath: CLIENT, componentId: 'hangar_looks', title: TITLE, libraries: [] }), {
      wrapper
    });

    act(() => result.current.onCheckedChange(true));

    await waitFor(() => expect(warning).toHaveBeenCalledWith(MESSAGES.ru.components.hangarLooks.failedToast));
    expect(queryClient.getQueryData(QUERY_KEYS.installation(CLIENT))).toEqual(installation);
  });

  it('says the libraries are in place after switching a component on', async () => {
    const success = vi.spyOn(toast, 'success');

    mockIPC(() => installation);

    const { wrapper } = setup();
    const { result } = renderHook(() => useComponentToggle({ clientPath: CLIENT, componentId: 'hit_log', title: TITLE, libraries: LIBRARIES }), {
      wrapper
    });

    act(() => result.current.onCheckedChange(true));

    await waitFor(() => expect(success).toHaveBeenCalledWith('Лог попаданий: включён, библиотеки на месте (OpenWG Gameface, ModsList)'));
  });

  it('keeps the plain message for a component without libraries', async () => {
    const success = vi.spyOn(toast, 'success');

    mockIPC(() => installation);

    const { wrapper } = setup();
    const { result } = renderHook(() => useComponentToggle({ clientPath: CLIENT, componentId: 'session_stats', title: TITLE, libraries: [] }), {
      wrapper
    });

    act(() => result.current.onCheckedChange(true));

    await waitFor(() => expect(success).toHaveBeenCalledWith('Лог попаданий: включён'));
  });

  it('leaves the cached installation alone when the game is running', async () => {
    mockIPC(() => {
      throw Object.assign(new Error('the game is running'), { code: 'client_running' });
    });

    const { queryClient, wrapper } = setup();
    const { result } = renderHook(() => useComponentToggle({ clientPath: CLIENT, componentId: 'hit_log', title: TITLE, libraries: LIBRARIES }), {
      wrapper
    });

    act(() => result.current.onCheckedChange(true));

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(queryClient.getQueryData(QUERY_KEYS.installation(CLIENT))).toBeUndefined();
  });
});
