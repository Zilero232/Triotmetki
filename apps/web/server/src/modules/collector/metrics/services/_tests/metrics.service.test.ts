import type { Job } from 'bullmq';

import { omit } from 'remeda';
import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { MetricsQueries } from '../../providers/metrics-queries.types';
import type { MergeCollectorStateInput } from '../../queries/collector-state.types';

import { mockPrismaService } from '../../../../../core/prisma/_tests/prisma-mock';
import { COLLECTOR_STATE_KEY } from '../../../config';
import { METRICS } from '../../config/metrics.constants';
import { metricsQueries } from '../../providers/metrics-queries.provider';
import { CircuitBreakerService } from '../circuit-breaker.service';
import { MetricsService } from '../metrics.service';

const createMetrics = () => {
  const prisma = mockPrismaService();
  const breaker = mock<CircuitBreakerService>();
  const merges: Omit<MergeCollectorStateInput, 'db'>[] = [];

  const queries: MetricsQueries = {
    ...metricsQueries,
    mergeCollectorState: async (input) => {
      merges.push(omit(input, ['db']));

      return [];
    }
  };

  return { prisma, breaker, merges, metrics: new MetricsService(prisma, breaker, queries) };
};

const job = (attemptsMade = 0) => mock<Job>({ queueName: 'collector.poll', name: 'batch', attemptsMade });

const flushed = async (setup: ReturnType<typeof createMetrics>) => {
  await setup.metrics.flush();

  return setup.prisma.collectorJobMetric.upsert.mock.calls.map(([{ create }]) => create);
};

describe('MetricsService.track', () => {
  it('counts a processed job under its queue and returns the result', async () => {
    const setup = createMetrics();

    expect(await setup.metrics.track({ job: job(), run: async () => 'done' })).toBe('done');

    const [row] = await flushed(setup);

    expect(row).toMatchObject({ queue: 'collector.poll', processed: 1, failed: 0, retried: 0 });
  });

  it('counts a failure and a retry and rethrows', async () => {
    const setup = createMetrics();

    await expect(
      setup.metrics.track({
        job: job(1),
        run: async () => {
          throw new Error('boom');
        }
      })
    ).rejects.toThrow('boom');

    const [row] = await flushed(setup);

    expect(row).toMatchObject({ processed: 0, failed: 1, retried: 1 });
  });

  it('attributes Lesta calls to the queue of the running job', async () => {
    const setup = createMetrics();

    await setup.metrics.track({ job: job(), run: async () => setup.metrics.recordLesta({ outcome: 'degraded' }) });

    const [row] = await flushed(setup);

    expect(row).toMatchObject({ queue: 'collector.poll', lestaRequests: 1, lestaErrors: 1 });
  });

  it('files Lesta calls outside a job under the unscoped bucket', async () => {
    const setup = createMetrics();

    setup.metrics.recordLesta({ outcome: 'ok' });

    const [row] = await flushed(setup);

    expect(row?.queue).toBe(METRICS.unscopedQueue);
  });
});

describe('MetricsService.flush', () => {
  it('stores when each job last succeeded', async () => {
    const setup = createMetrics();

    await setup.metrics.track({ job: job(), run: async () => 'done' });
    await setup.metrics.flush();

    expect(setup.merges).toEqual([{ key: COLLECTOR_STATE_KEY.jobSuccess, value: { 'collector.poll:batch': expect.any(String) } }]);
  });

  it('stores each success only once', async () => {
    const setup = createMetrics();

    await setup.metrics.track({ job: job(), run: async () => 'done' });
    await setup.metrics.flush();
    await setup.metrics.flush();

    expect(setup.merges).toHaveLength(1);
  });

  it('records no success for a failed job', async () => {
    const setup = createMetrics();

    await setup.metrics
      .track({
        job: job(),
        run: async () => {
          throw new Error('boom');
        }
      })
      .catch(() => null);

    await setup.metrics.flush();

    expect(setup.merges).toEqual([]);
  });
});

describe('MetricsService.recordLesta', () => {
  it('feeds the breaker with outages but not with our own rejected requests', () => {
    const { breaker, metrics } = createMetrics();

    metrics.recordLesta({ outcome: 'ok' });
    metrics.recordLesta({ outcome: 'degraded' });
    metrics.recordLesta({ outcome: 'rejected' });

    expect(breaker.record.mock.calls).toEqual([[true], [false]]);
  });
});
