import type { DB } from '../../../../generated/kysely/database';
import type { Database } from '../kysely';

export type TruncateTablesInput = {
  prisma: { $kysely: Database };
  tables: (keyof DB)[];
};
