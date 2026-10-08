'use client';

import { useTheme } from 'next-themes';
import { useEffect } from 'react';

import { SITE } from '@/shared/config';

import { THEME_COLOR } from '../../../config';

export const useThemeColorSync = () => {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const color = resolvedTheme === 'light' ? SITE.themeColor.light : SITE.themeColor.dark;

    document.querySelector(THEME_COLOR.selector)?.setAttribute('content', color);
  }, [resolvedTheme]);
};
