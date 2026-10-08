import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import { messages } from '@/shared/i18n';
import { linkBotAccount } from '@/views/me/api/bots/bots';

import { useBotsCard } from '../use-bots-card';

vi.mock('@/views/me/api/bots/bots', () => ({
  getBotLinks: vi.fn(() => new Promise(() => undefined)),
  linkBotAccount: vi.fn(async () => null),
  unlinkBotAccount: vi.fn()
}));

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>
    <NextIntlClientProvider locale='en' messages={messages.en} timeZone='UTC'>
      {children}
    </NextIntlClientProvider>
  </QueryClientProvider>
);

describe('useBotsCard', () => {
  it('returns to the cabinet in the current locale after linking a bot', async () => {
    const { result } = renderHook(() => useBotsCard(), { wrapper });

    act(() => {
      result.current.onLink('discord');
    });

    await waitFor(() => expect(linkBotAccount).toHaveBeenCalled());
    expect(vi.mocked(linkBotAccount).mock.calls[0]?.[0]).toEqual({ provider: 'discord', callbackURL: `${window.location.origin}/en/me` });
  });
});
