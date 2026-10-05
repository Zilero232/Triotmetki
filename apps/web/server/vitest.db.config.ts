import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

import { SERVER_TEST_DECORATORS, SERVER_TEST_ENV } from './vitest.config';

// Query tests against a real TimescaleDB: `bun run test:db` from the repo root.
// vitest.db.global-setup.ts creates a throwaway database from the Prisma schema and
// the Timescale layer and drops it afterwards. Files run one at a time because
// they share that database and truncate tables between tests.
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
