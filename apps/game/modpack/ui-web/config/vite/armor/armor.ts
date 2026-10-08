import type { UserConfig } from 'vite';

import { mergeConfig } from 'vite';

import { hudConfig } from '../hud';
import { UI_BUILD } from '../vite.constants';

export const armorConfig = (): UserConfig => mergeConfig(hudConfig(), { build: { rollupOptions: { input: UI_BUILD.pages.armor } } });
