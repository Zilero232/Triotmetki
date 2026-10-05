import { subDays } from 'date-fns';
import { afterAll, beforeEach, expect, it } from 'vitest';

import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../../core/prisma/_tests/test-database';
import { RETENTION } from '../../config/purge.constants';
import { RETENTION_QUERIES } from '../../queries/retention.queries';
import { RetentionService } from '../retention.service';

const NOW = new Date('2026-09-27T00:00:00Z');

const rule = (table: string) => RETENTION.rules.find((candidate) => candidate.table === table) ?? { days: Number.NaN };

const daysAgo = ({ table, offset }: { table: string; offset: number }) => subDays(NOW, rule(table).days + offset);

const jobMetric = ({ bucketStart, queue = 'poll' }: { bucketStart: Date; queue?: string }) => ({ queue, bucketStart });

describeWithDatabase('RetentionService.purgeExpired', () => {
  const prisma = createTestPrisma();
  const retention = new RetentionService(prisma, RETENTION_QUERIES);

  beforeEach(async () => {
    await truncateTables({ prisma, tables: ['collector_job_metric', 'webhook_delivery', 'webhook_endpoint', 'user', 'tank_percentile'] });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('reports a count for every rule', async () => {
    const result = await retention.purgeExpired(NOW);

    expect(Object.keys(result)).toEqual(RETENTION.rules.map(({ table }) => table));
  });

  it('deletes the rows past the cutoff and keeps the rest', async () => {
    await prisma.collectorJobMetric.createMany({
      data: [
        jobMetric({ bucketStart: daysAgo({ table: 'collector_job_metric', offset: 1 }) }),
        jobMetric({ bucketStart: daysAgo({ table: 'collector_job_metric', offset: -1 }) })
      ]
    });

    const result = await retention.purgeExpired(NOW);

    expect([result.collector_job_metric, await prisma.collectorJobMetric.count()]).toEqual([1, 1]);
  });

  it('keeps deleting in batches until every expired row is gone', async () => {
    const expired = daysAgo({ table: 'collector_job_metric', offset: 1 });

    await prisma.collectorJobMetric.createMany({
      data: Array.from({ length: RETENTION.deleteBatch + 3 }, (_, index) => jobMetric({ bucketStart: expired, queue: `queue-${index}` }))
    });

    const result = await retention.purgeExpired(NOW);

    expect([result.collector_job_metric, await prisma.collectorJobMetric.count()]).toEqual([RETENTION.deleteBatch + 3, 0]);
  });

  it('never deletes a webhook delivery that is still pending', async () => {
    const expired = daysAgo({ table: 'webhook_delivery', offset: 1 });

    await prisma.user.create({ data: { id: 'u1', email: 'u1@example.com', name: 'u1' } });
    await prisma.webhookEndpoint.create({ data: { id: 'w1', userId: 'u1', url: 'https://example.com/hook', secret: 's' } });

    await prisma.webhookDelivery.createMany({
      data: [
        { endpointId: 'w1', event: 'moeGained', payload: {}, status: 'pending', createdAt: expired },
        { endpointId: 'w1', event: 'moeGained', payload: {}, status: 'succeeded', createdAt: expired }
      ]
    });

    await retention.purgeExpired(NOW);

    expect(await prisma.webhookDelivery.findMany({ select: { status: true } })).toEqual([{ status: 'pending' }]);
  });

  it('keeps the latest percentile row of every tank and distribution however stale', async () => {
    const stale = daysAgo({ table: 'tank_percentile', offset: 10 });
    const older = daysAgo({ table: 'tank_percentile', offset: 20 });
    const percentile = { percentiles: {} };

    await prisma.tankPercentile.createMany({
      data: [
        { tankId: 1, distribution: 'damage', date: older, ...percentile },
        { tankId: 1, distribution: 'damage', date: stale, ...percentile },
        { tankId: 1, distribution: 'xp', date: older, ...percentile },
        { tankId: 2, distribution: 'damage', date: older, ...percentile }
      ]
    });

    await retention.purgeExpired(NOW);

    const rows = await prisma.tankPercentile.findMany({
      select: { tankId: true, distribution: true, date: true },
      orderBy: [{ tankId: 'asc' }, { distribution: 'asc' }]
    });

    expect(rows).toEqual([
      { tankId: 1, distribution: 'damage', date: stale },
      { tankId: 1, distribution: 'xp', date: older },
      { tankId: 2, distribution: 'damage', date: older }
    ]);
  });
});
