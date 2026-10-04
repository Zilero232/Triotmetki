import type { UserConfig } from 'vite';

import { defineConfig } from 'vite';

import { advisorConfig } from './config/vite/advisor';
import { hudConfig } from './config/vite/hud';
import { settingsConfig } from './config/vite/settings';
import { viewerConfig } from './config/vite/viewer';
import { UI_BUILD } from './config/vite/vite.constants';

const MODES: Partial<Record<string, () => UserConfig>> = {
  [UI_BUILD.hudMode]: hudConfig,
  [UI_BUILD.advisorMode]: advisorConfig,
  [UI_BUILD.viewerMode]: viewerConfig
};

export default defineConfig(({ mode }) => (MODES[mode] ?? settingsConfig)());
