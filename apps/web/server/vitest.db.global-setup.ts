import type { TestProject } from 'vitest/node';

import { config } from 'dotenv';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';

declare module 'vitest' {
  // eslint-disable-next-line ts/consistent-type-definitions -- module augmentation needs an interface
  export interface ProvidedContext {
    testDatabaseUrl: string | null;
  }
}

const TEST_DATABASE = {
  namePrefix: 'otmetki_test_',
  connectTimeoutMs: 3_000,
  serverDir: fileURLToPath(new URL('.', import.meta.url))
} as const;

const rootEnv = config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)), quiet: true, processEnv: {} }).parsed ?? {};

const withDatabase = ({ url, database }: { url: string; database: string }) => {
  const parsed = new URL(url);

  parsed.pathname = `/${database}`;

  return parsed.toString();
};

const run = ({ command, args, url }: { command: string; args: string[]; url: string }) => {
  const result = spawnSync(command, args, {
    cwd: TEST_DATABASE.serverDir,
    env: { ...process.env, DIRECT_URL: url, DATABASE_URL: url },
    encoding: 'utf8'
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed:\n${result.stdout}\n${result.stderr}`);
  }
};

const connectAdmin = async (url: string): Promise<Client | null> => {
  const client = new Client({ connectionString: url, connectionTimeoutMillis: TEST_DATABASE.connectTimeoutMs });

  try {
    await client.connect();

    return client;
  } catch {
    await client.end().catch(() => undefined);

    return null;
  }
};

export default async function setup(project: TestProject) {
  const adminUrl = process.env.TEST_DATABASE_URL ?? rootEnv.DIRECT_URL ?? rootEnv.DATABASE_URL;
  const required = process.env.SERVER_DB_REQUIRED === 'true';
  const admin = adminUrl ? await connectAdmin(adminUrl) : null;

  if (!adminUrl || !admin) {
    const reason = `server-db: no PostgreSQL at ${adminUrl ? new URL(adminUrl).host : '(TEST_DATABASE_URL / DIRECT_URL unset)'}; start it with \`bun run dev:infra\`.`;

    if (required) {
      throw new Error(reason);
    }

    console.warn(`${reason} Skipping the database suites.`);
    project.provide('testDatabaseUrl', null);

    return;
  }

  const database = `${TEST_DATABASE.namePrefix}${Date.now()}_${process.pid}`;
  const url = withDatabase({ url: adminUrl, database });

  await admin.query(`CREATE DATABASE "${database}"`);

  try {
    run({ command: 'bun', args: ['scripts/timescale.ts', '--extensions'], url });
    run({ command: 'bun', args: ['x', 'prisma', 'db', 'push', '--url', url], url });
    run({ command: 'bun', args: ['scripts/timescale.ts'], url });
  } catch (error) {
    await admin.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);
    await admin.end();

    throw error;
  }

  project.provide('testDatabaseUrl', url);

  return async () => {
    await admin.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);
    await admin.end();
  };
}
