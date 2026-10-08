import type { ReactNode } from 'react';

import { renderHook } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { messages } from '@/shared/i18n';
import { useUnsavedGuard } from '@/shared/lib';

const wrapper = ({ children }: { children: ReactNode }) => (
  <NextIntlClientProvider locale='en' messages={messages.en} timeZone='UTC'>
    {children}
  </NextIntlClientProvider>
);

const clickAway = () => {
  const anchor = document.createElement('a');

  anchor.href = '/somewhere-else';
  document.body.append(anchor);

  const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });

  anchor.addEventListener('click', (clicked) => clicked.preventDefault());
  anchor.dispatchEvent(event);

  return event;
};

afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

describe('useUnsavedGuard', () => {
  it('asks before following a link away from unsaved changes', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderHook(() => useUnsavedGuard(true), { wrapper });

    clickAway();

    expect(confirm).toHaveBeenCalledWith(messages.en.common.unsavedChanges);
  });

  it('stops the navigation when the author stays', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const onLink = vi.fn();

    document.addEventListener('click', onLink);
    renderHook(() => useUnsavedGuard(true), { wrapper });

    clickAway();

    document.removeEventListener('click', onLink);
    expect(onLink).not.toHaveBeenCalled();
  });

  it('lets a clean form leave without asking', () => {
    const confirm = vi.spyOn(window, 'confirm');

    renderHook(() => useUnsavedGuard(false), { wrapper });

    clickAway();

    expect(confirm).not.toHaveBeenCalled();
  });

  it('warns before the tab closes with unsaved changes', () => {
    renderHook(() => useUnsavedGuard(true), { wrapper });
    const event = new Event('beforeunload', { cancelable: true });

    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });
});
