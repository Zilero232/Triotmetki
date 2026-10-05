import { config } from 'dotenv';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';

import { TIMESCALE } from '../src/config/timescale.constants';
import { buildTimescaleStatements } from '../src/core/prisma/timescale/timescale';
import { CONTINUOUS_AGGREGATE_SOURCES } from '../src/core/prisma/timescale/timescale.constants';

config({ path: fileURLToPath(new URL('../../../../.env', import.meta.url)), quiet: true });

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!url) {
  console.error('DIRECT_URL is not set (root .env).');
  process.exit(1);
}

const sqlDir = fileURLToPath(new URL('../prisma/sql/timescale/', import.meta.url));
const files = await Promise.all((await readdir(sqlDir)).map(async (name) => ({ name, sql: await readFile(`${sqlDir}${name}`, 'utf8') })));
const client = new Client({ connectionString: url });

console.log('→ config', TIMESCALE);

await client.connect();

try {
  const { rows } = await client.query<{ relation: string; version: string | null }>(
    "SELECT relation, obj_description(to_regclass(relation), 'pg_class') AS version FROM unnest($1::text[]) AS relation",
    [CONTINUOUS_AGGREGATE_SOURCES.map(({ relation }) => relation)]
  );

  const statements = buildTimescaleStatements({
    files,
    config: TIMESCALE,
    versions: Object.fromEntries(rows.map(({ relation, version }) => [relation, version])),
    refresh: process.argv.includes('--refresh'),
    extensionsOnly: process.argv.includes('--extensions')
  });

  for (const { label, sql } of statements) {
    console.log(`→ ${label}`);
    await client.query(sql);
  }

  console.log('TimescaleDB layer applied.');
} finally {
  await client.end();
}
