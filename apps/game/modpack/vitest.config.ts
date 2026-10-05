import path from 'node:path';
import { defineProject, mergeConfig } from 'vitest/config';

import { sharedConfig } from './ui-web/config/vite/shared';

// The modpack-ui project runs on the same Vite config as the Gameface build (React, SCSS
// modules, design tokens), rooted at ui-web.
export default mergeConfig(
  sharedConfig(),
  defineProject({
    test: {
      name: 'modpack-ui',
      isolate: true,
      environment: 'node',
      include: ['**/_tests/**/*.test.{ts,tsx}'],
      setupFiles: [path.resolve(import.meta.dirname, 'ui-web/src/shared/lib/testing/setup/setup.ts')]
    }
  })
);
