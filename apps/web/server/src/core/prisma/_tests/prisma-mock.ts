import type { CompiledQuery } from 'kysely';

import { DummyDriver, Kysely, PostgresAdapter, PostgresIntrospector, PostgresQueryCompiler } from 'kysely';
import { mockDeep } from 'vitest-mock-extended';

import type { DB } from '../../../../generated/kysely/database';
import type { PrismaService } from '../prisma.service';
import type { MockPrismaServiceInput } from './prisma-mock.types';

const recordingKysely = (queries: CompiledQuery[]) =>
  new Kysely<DB>({
    dialect: {
      createAdapter: () => new PostgresAdapter(),
      createDriver: () => new DummyDriver(),
      createIntrospector: (db) => new PostgresIntrospector(db),
      createQueryCompiler: () => new PostgresQueryCompiler()
    },
    log: (event) => {
      queries.push(event.query);
    }
  });

export const mockPrismaService = ({ queries = [] }: MockPrismaServiceInput = {}) => {
  const prisma = mockDeep<PrismaService>();

  Object.defineProperty(prisma, '$kysely', { value: recordingKysely(queries) });

  return prisma;
};

export const advisoryLocks = (queries: readonly CompiledQuery[]) =>
  queries.filter(({ sql }) => sql.includes('pg_advisory_xact_lock')).map(({ parameters }) => parameters);
