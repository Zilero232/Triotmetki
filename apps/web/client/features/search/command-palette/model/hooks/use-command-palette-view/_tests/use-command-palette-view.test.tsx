import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { afterAll, describe, expect, it, vi } from 'vitest';

import { CommandPaletteContext } from '../../../context';
import { useCommandPaletteView } from '../use-command-palette-view';

vi.hoisted(() => vi.resetModules());

afterAll(() => {
  vi.resetModules();
});

const push = vi.hoisted(() => vi.fn<(href: string) => void>());

vi.mock('@/shared/i18n/navigation', () => ({ useRouter: () => ({ push }) }));

vi.mock('@/entities/search/search/api/search/search', () => ({ search: vi.fn() }));

const QUERY = 'jove';
const HREF = '/p/jove';

const renderView = () => {
  const setOpen = vi.fn<(isOpen: boolean) => void>();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <CommandPaletteContext value={{ isOpen: true, hasOpened: true, setOpen }}>{children}</CommandPaletteContext>
    </QueryClientProvider>
  );

  return { setOpen, ...renderHook(() => useCommandPaletteView(), { wrapper }) };
};

describe('useCommandPaletteView', () => {
  it('keeps the typed query while the palette stays open', () => {
    const { result, setOpen } = renderView();

    act(() => result.current.setQuery(QUERY));
    act(() => result.current.onOpenChange(true));

    expect(setOpen).toHaveBeenCalledWith(true);
    expect(result.current.query).toBe(QUERY);
  });

  it('clears the query when the palette closes', () => {
    const { result, setOpen } = renderView();

    act(() => result.current.setQuery(QUERY));
    act(() => result.current.onOpenChange(false));

    expect(setOpen).toHaveBeenCalledWith(false);
    expect(result.current.query).toBe('');
  });

  it('closes the palette and navigates when an entry is chosen', () => {
    const { result, setOpen } = renderView();

    act(() => result.current.setQuery(QUERY));
    act(() => result.current.go(HREF));

    expect(setOpen).toHaveBeenCalledWith(false);
    expect(push).toHaveBeenCalledWith(HREF);
    expect(result.current.query).toBe('');
  });
});
