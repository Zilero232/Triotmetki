import { sql } from 'kysely';
import { describe, inject } from 'vitest';

import type { TruncateTablesInput } from './test-database.types';

import { createPrismaClient } from '../prisma.factory';

const testDatabaseUrl = inject('testDatabaseUrl');

export const describeWithDatabase = describe.skipIf(testDatabaseUrl === null);

export const createTestPrisma = () => createPrismaClient({ url: testDatabaseUrl ?? '', pool: { max: 4 } });

export const truncateTables = ({ prisma, tables }: TruncateTablesInput) =>
  sql`TRUNCATE ${sql.join(tables.map((table) => sql.table(table)))} RESTART IDENTITY CASCADE`.execute(prisma.$kysely);
