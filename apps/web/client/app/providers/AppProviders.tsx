'use client';

import { SerwistProvider } from '@serwist/turbopack/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { LazyMotion, MotionConfig } from 'motion/react';
import { ThemeProvider } from 'next-themes';
import { NuqsAdapter } from 'nuqs/adapters/next/app';

import { RatingPaletteSync } from '@/features/app/rating-palette';
import { RatingPatternsSync } from '@/features/app/rating-patterns';
import { CommandPaletteHost, CommandPaletteProvider } from '@/features/search/command-palette';
import { getQueryClient } from '@/shared/api';
import { env } from '@/shared/config';
import { ROUTES, STORAGE_KEYS } from '@/shared/constants';
import { loadMotionFeatures } from '@/shared/lib';
import { AppToaster, TooltipProvider } from '@/ui-kit';

import type { AppProvidersProps } from './AppProviders.types';

import { MutationFeedbackSync, ThemeColorSync } from './components';
import { THEME_SCRIPT_PROPS } from './config';

export const AppProviders = ({ children }: AppProvidersProps) => (
  <NuqsAdapter>
    <QueryClientProvider client={getQueryClient()}>
      <ThemeProvider
        disableTransitionOnChange
        attribute='data-theme'
        defaultTheme='dark'
        enableSystem={false}
        scriptProps={THEME_SCRIPT_PROPS}
        storageKey={STORAGE_KEYS.theme}
        themes={['dark', 'light']}
      >
        <MotionConfig reducedMotion='user'>
          <LazyMotion strict features={loadMotionFeatures}>
            <TooltipProvider>
              <CommandPaletteProvider>
                <SerwistProvider disable={env.NODE_ENV === 'development'} reloadOnOnline={false} swUrl={ROUTES.sw}>
                  {children}
                </SerwistProvider>
                <CommandPaletteHost />
              </CommandPaletteProvider>
            </TooltipProvider>
            <RatingPatternsSync />
            <RatingPaletteSync />
            <MutationFeedbackSync scope='root' />
            <ThemeColorSync />
            <AppToaster />
          </LazyMotion>
        </MotionConfig>
      </ThemeProvider>
    </QueryClientProvider>
  </NuqsAdapter>
);
