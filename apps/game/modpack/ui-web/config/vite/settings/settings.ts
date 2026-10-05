import type { UserConfig } from 'vite';

import { mergeConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

import { classicScriptPlugin } from '../classic-script';
import { devMockPlugin } from '../dev-mock';
import { flatPagesPlugin } from '../flat-pages';
import { iconPngPlugin } from '../icon-png';
import { iconSpritePlugin } from '../icon-sprite';
import { sharedConfig } from '../shared';
import { UI_BUILD } from '../vite.constants';

// The settings window ships as one self-contained index.html: styles inlined in the head and the
// script inlined as a classic IIFE at the end of the body, the way the client's own Gameface pages
// load theirs (no ES module loader).
export const settingsConfig = (): UserConfig =>
  mergeConfig(sharedConfig(), {
    base: './',
    plugins: [
      devMockPlugin(),
      viteSingleFile({ useRecommendedBuildConfig: false }),
      classicScriptPlugin(),
      flatPagesPlugin(),
      iconPngPlugin(),
      iconSpritePlugin()
    ],
    build: {
      emptyOutDir: true,
      assetsDir: '',
      assetsInlineLimit: () => true,
      cssCodeSplit: false,
      rollupOptions: { input: UI_BUILD.pages.settings, output: { format: 'iife', codeSplitting: false } }
    }
  });
