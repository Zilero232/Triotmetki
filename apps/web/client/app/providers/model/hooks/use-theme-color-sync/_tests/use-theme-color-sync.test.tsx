import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SITE } from '@/shared/config';

import { useThemeColorSync } from '../use-theme-color-sync';

const theme = vi.hoisted(() => ({ resolved: 'dark' }));

vi.mock('next-themes', () => ({ useTheme: () => ({ resolvedTheme: theme.resolved }) }));

const themeColorMeta = () => document.querySelector('meta[name="theme-color"]');

describe('useThemeColorSync', () => {
  beforeEach(() => {
    document.head.innerHTML = `<meta name="theme-color" content="${SITE.themeColor.dark}">`;
  });

  afterEach(() => {
    document.head.innerHTML = '';
  });

  it('paints the browser chrome in the light theme colour once the visitor picks light', () => {
    theme.resolved = 'light';

    renderHook(() => useThemeColorSync());

    expect(themeColorMeta()?.getAttribute('content')).toBe(SITE.themeColor.light);
  });

  it('keeps the dark colour for the dark theme', () => {
    theme.resolved = 'dark';

    renderHook(() => useThemeColorSync());

    expect(themeColorMeta()?.getAttribute('content')).toBe(SITE.themeColor.dark);
  });
});
