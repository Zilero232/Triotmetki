import type { ReactNode } from 'react';

import clients from '@contract/clients.json';
import error from '@contract/error.json';
import report from '@contract/sync-report.json';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { mockIPC } from '@tauri-apps/api/mocks';
import { act, renderHook, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { IntlProvider } from 'use-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { useSyncNow } from '@/features/site-sync/sync-now';
import { COMMANDS } from '@/shared/config';
import { MESSAGES } from '@/shared/i18n';

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
    <IntlProvider locale='ru' messages={MESSAGES.ru}>
      {children}
    </IntlProvider>
  </QueryClientProvider>
);

const merged = { profiles: { ...report.profiles, outcome: 'merged' } };

describe('useSyncNow', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('asks what to keep when both sides changed, then syncs with the chosen resolution', async () => {
    const success = vi.spyOn(toast, 'success');
    const resolutions: unknown[] = [];

    mockIPC((command, payload) => {
      if (command === COMMANDS.listClients) {
        return clients;
      }

      if (command === COMMANDS.syncNow) {
        const { resolution } = z.object({ resolution: z.string().nullable() }).parse(payload);

        resolutions.push(resolution);

        return resolution === null ? report : merged;
      }

      return null;
    });

    const { result } = renderHook(() => useSyncNow(), { wrapper });

    act(() => result.current.onSync());
    await waitFor(() => expect(result.current.isConflictOpen).toBe(true));
    expect(result.current.conflicts.map((conflict) => conflict.library)).toEqual(['profiles']);
    expect(result.current.conflicts[0]?.text).toContain('Профили');

    act(() => result.current.onResolve('merge'));
    await waitFor(() => expect(result.current.isConflictOpen).toBe(false));
    expect(resolutions).toEqual([null, 'merge']);
    expect(success).toHaveBeenCalledWith(MESSAGES.ru.sync.updated);
  });

  it('says why a sync failed and opens no conflict', async () => {
    const failure = vi.spyOn(toast, 'error');

    mockIPC((command) => {
      if (command === COMMANDS.listClients) {
        return clients;
      }

      throw error;
    });

    const { result } = renderHook(() => useSyncNow(), { wrapper });

    act(() => result.current.onSync());
    await waitFor(() => expect(failure).toHaveBeenCalledWith(MESSAGES.ru.errors.busy, { description: MESSAGES.ru.errorHelp.busy }));
    expect(result.current.isConflictOpen).toBe(false);
  });
});
