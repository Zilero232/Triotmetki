import type { UserConfig } from 'vite';

import { mergeConfig } from 'vite';

import { sharedConfig } from '../shared';
import { UI_BUILD } from '../vite.constants';

export const advisorConfig = (): UserConfig =>
  mergeConfig(sharedConfig(), {
    build: {
      emptyOutDir: false,
      copyPublicDir: false,
      rollupOptions: {
        input: UI_BUILD.scripts.advisor.entry,
        output: { format: 'iife', entryFileNames: UI_BUILD.scripts.advisor.file, codeSplitting: false }
      }
    }
  });
