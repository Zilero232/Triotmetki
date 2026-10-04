import type { UserConfig } from 'vite';

import { mergeConfig } from 'vite';

import { hudConfig } from '../hud';
import { UI_BUILD } from '../vite.constants';

// The hit viewer page (features/hit_viewer opens it as a window over the hangar): one self-contained viewer.html
// built like the HUD page, after it, into the same folder.
export const viewerConfig = (): UserConfig => mergeConfig(hudConfig(), { build: { rollupOptions: { input: UI_BUILD.pages.viewer } } });
