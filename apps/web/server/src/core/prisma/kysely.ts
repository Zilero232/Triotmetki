import type { Driver } from 'kysely';

import { Kysely, PostgresAdapter, PostgresIntrospector, PostgresQueryCompiler } from 'kysely';

import type { DB } from '../../../generated/kysely/database';

import { NumericResultPlugin } from './numeric-result.plugin';

export type Database = Kysely<DB>;

export const createKysely = (driver: Driver): Database =>
  new Kysely<DB>({
    dialect: {
      createAdapter: () => new PostgresAdapter(),
      createDriver: () => driver,
      createIntrospector: (db) => new PostgresIntrospector(db),
      createQueryCompiler: () => new PostgresQueryCompiler()
    },
    plugins: [new NumericResultPlugin()]
  });
