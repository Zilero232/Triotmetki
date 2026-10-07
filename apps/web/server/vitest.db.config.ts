import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

import { SERVER_TEST_DECORATORS, SERVER_TEST_ENV } from './vitest.config';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  oxc: SERVER_TEST_DECORATORS,
  test: {
    name: 'server-db',
    environment: 'node',
    pool: 'forks',
    fileParallelism: false,
    clearMocks: true,
    restoreMocks: true,
    testTimeout: 30_000,
    hookTimeout: 120_000,
    include: ['src/**/_tests/**/*.db.test.ts'],
    globalSetup: ['./vitest.db.global-setup.ts'],
    setupFiles: ['./vitest.setup.ts'],
    env: SERVER_TEST_ENV
  }
});
