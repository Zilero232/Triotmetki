import { sql } from 'kysely';

import type { DeleteExpiredBatchInput } from './retention.types';

export const deleteExpiredBatch = async ({ db, rule, cutoff, limit }: DeleteExpiredBatchInput): Promise<number> => {
  let expired = db
    .selectFrom(rule.table)
    .select(sql`ctid`.as('ctid'))
    .where(sql.ref(rule.column), '<', cutoff);

  if (rule.where) {
    expired = expired.where(rule.where);
  }

  const result = await db
    .deleteFrom(rule.table)
    .where(sql`ctid`, 'in', expired.limit(limit))
    .executeTakeFirstOrThrow();

  return Number(result.numDeletedRows);
};

export const RETENTION_QUERIES = {
  deleteExpiredBatch
} as const;
