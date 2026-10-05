import { afterAll, beforeEach, expect, it } from 'vitest';

import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../../core/prisma/_tests/test-database';
import { deleteExpiredBatch } from '../retention.queries';

const CUTOFF = new Date('2026-09-01T00:00:00Z');
const EXPIRED = new Date('2026-08-01T00:00:00Z');
const FRESH = new Date('2026-09-15T00:00:00Z');
const RULE = { table: 'collector_job_metric', column: 'bucket_start', days: 14 } as const;

describeWithDatabase('deleteExpiredBatch', () => {
  const prisma = createTestPrisma();

  beforeEach(async () => {
    await truncateTables({ prisma, tables: ['collector_job_metric'] });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('deletes at most one batch of expired rows and returns how many it deleted', async () => {
    await prisma.collectorJobMetric.createMany({ data: ['a', 'b', 'c'].map((queue) => ({ queue, bucketStart: EXPIRED })) });

    const deleted = await deleteExpiredBatch({ db: prisma.$kysely, rule: RULE, cutoff: CUTOFF, limit: 2 });

    expect([deleted, await prisma.collectorJobMetric.count()]).toEqual([2, 1]);
  });

  it('keeps the rows on the fresh side of the cutoff', async () => {
    await prisma.collectorJobMetric.createMany({
      data: [
        { queue: 'a', bucketStart: EXPIRED },
        { queue: 'b', bucketStart: FRESH }
      ]
    });

    await deleteExpiredBatch({ db: prisma.$kysely, rule: RULE, cutoff: CUTOFF, limit: 10 });

    expect(await prisma.collectorJobMetric.findMany({ select: { queue: true } })).toEqual([{ queue: 'b' }]);
  });
});
