import type { UserConfig } from 'vite';

import { mergeConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

import { classicScriptPlugin } from '../classic-script';
import { flatPagesPlugin } from '../flat-pages';
import { sharedConfig } from '../shared';
import { UI_BUILD } from '../vite.constants';

// The battle HUD page (core/client/hud/gameface opens it as a transparent window): one self-contained
// hud.html like the settings window, built after it into the same folder.
export const hudConfig = (): UserConfig =>
  mergeConfig(sharedConfig(), {
    base: './',
    plugins: [viteSingleFile({ useRecommendedBuildConfig: false }), classicScriptPlugin(), flatPagesPlugin()],
    build: {
      emptyOutDir: false,
      copyPublicDir: false,
      assetsDir: '',
      assetsInlineLimit: () => true,
      cssCodeSplit: false,
      rollupOptions: { input: UI_BUILD.pages.hud, output: { format: 'iife', codeSplitting: false } }
    }
  });
