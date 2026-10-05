import type { OnApplicationShutdown } from '@nestjs/common';

import { Inject, Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { startOfMinute } from 'date-fns';
import { AsyncLocalStorage } from 'node:async_hooks';

import type { LestaOutcomeRecorder, RecordLestaInput } from '../../../../core';
import type { JobContext, MetricCounters, RecordJobInput, RestoreCountersInput, TrackJobInput, WriteCountersInput } from '../metrics.types';
import type { MetricsQueries } from '../providers/metrics-queries.types';

import { errorMessage } from '../../../../common/lib';
import { PrismaService } from '../../../../core';
import { COLLECTOR_STATE_KEY } from '../../config';
import { EMPTY_COUNTERS, METRICS } from '../config/metrics.constants';
import { jobSuccessKey } from '../lib/job-success/job-success';
import { METRICS_QUERIES } from '../providers/metrics-queries.provider';
import { CircuitBreakerService } from './circuit-breaker.service';

@Injectable()
export class MetricsService implements LestaOutcomeRecorder, OnApplicationShutdown {
  private readonly logger = new Logger(MetricsService.name);
  private readonly jobContext = new AsyncLocalStorage<JobContext>();
  private counters = new Map<string, MetricCounters>();
  private succeeded = new Map<string, string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly breaker: CircuitBreakerService,
    @Inject(METRICS_QUERIES) private readonly queries: MetricsQueries
  ) {}

  async track<T>({ job, run }: TrackJobInput<T>): Promise<T> {
    const queue = job.queueName;
    const retried = job.attemptsMade > 0;
    const startedAt = performance.now();

    try {
      const result = await this.jobContext.run({ queue }, run);

      this.recordJob({ queue, durationMs: performance.now() - startedAt, ok: true, retried });
      this.succeeded.set(jobSuccessKey({ queue, name: job.name }), new Date().toISOString());

      return result;
    } catch (error) {
      this.recordJob({ queue, durationMs: performance.now() - startedAt, ok: false, retried });

      throw error;
    }
  }

  recordLesta({ outcome }: RecordLestaInput) {
    const counters = this.countersFor(this.jobContext.getStore()?.queue ?? METRICS.unscopedQueue);

    counters.lestaRequests += 1;
    counters.lestaErrors += outcome === 'ok' ? 0 : 1;

    if (outcome !== 'rejected') {
      this.breaker.record(outcome === 'ok');
    }
  }

  @Interval(METRICS.flushIntervalMs)
  async flush() {
    const pending = this.counters;

    this.counters = new Map();

    const bucketStart = startOfMinute(new Date());

    for (const [queue, counters] of pending) {
      await this.writeCounters({ queue, counters, bucketStart });
    }

    await this.flushSuccesses();
  }

  async onApplicationShutdown() {
    await this.flush();
  }

  private async writeCounters({ queue, counters, bucketStart }: WriteCountersInput) {
    const durationMsTotal = BigInt(Math.round(counters.durationMs));

    try {
      await this.prisma.collectorJobMetric.upsert({
        where: { queue_bucketStart: { queue, bucketStart } },
        create: {
          queue,
          bucketStart,
          processed: counters.processed,
          failed: counters.failed,
          retried: counters.retried,
          durationMsTotal,
          lestaRequests: counters.lestaRequests,
          lestaErrors: counters.lestaErrors
        },
        update: {
          processed: { increment: counters.processed },
          failed: { increment: counters.failed },
          retried: { increment: counters.retried },
          durationMsTotal: { increment: durationMsTotal },
          lestaRequests: { increment: counters.lestaRequests },
          lestaErrors: { increment: counters.lestaErrors }
        }
      });
    } catch (error) {
      this.logger.warn(`metrics flush for ${queue} failed: ${errorMessage(error)}`);
      this.restoreCounters({ queue, counters });
    }
  }

  private async flushSuccesses() {
    if (this.succeeded.size === 0) {
      return;
    }

    const value = Object.fromEntries(this.succeeded);

    this.succeeded = new Map();

    try {
      await this.queries.mergeCollectorState({ db: this.prisma.$kysely, key: COLLECTOR_STATE_KEY.jobSuccess, value });
    } catch (error) {
      this.logger.warn(`job success flush failed: ${errorMessage(error)}`);
      this.succeeded = new Map([...Object.entries(value), ...this.succeeded]);
    }
  }

  private restoreCounters({ queue, counters }: RestoreCountersInput) {
    const current = this.countersFor(queue);

    current.processed += counters.processed;
    current.failed += counters.failed;
    current.retried += counters.retried;
    current.durationMs += counters.durationMs;
    current.lestaRequests += counters.lestaRequests;
    current.lestaErrors += counters.lestaErrors;
  }

  private recordJob({ queue, durationMs, ok, retried }: RecordJobInput) {
    const counters = this.countersFor(queue);

    counters.processed += ok ? 1 : 0;
    counters.failed += ok ? 0 : 1;
    counters.retried += retried ? 1 : 0;
    counters.durationMs += durationMs;
  }

  private countersFor(queue: string): MetricCounters {
    const existing = this.counters.get(queue);

    if (existing) {
      return existing;
    }

    const created = { ...EMPTY_COUNTERS };

    this.counters.set(queue, created);

    return created;
  }
}
