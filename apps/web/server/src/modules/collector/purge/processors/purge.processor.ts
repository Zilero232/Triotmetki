import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { match } from 'ts-pattern';

import { WORKER_CONCURRENCY } from '../../config';
import { JOB, purgeAccountPayloadSchema, QUEUE } from '../../contracts';
import { MetricsService, TrackedWorkerHost } from '../../metrics';
import { PurgeService, RetentionService } from '../services';

@Processor(QUEUE.purge, { concurrency: WORKER_CONCURRENCY.purge })
export class PurgeProcessor extends TrackedWorkerHost {
  constructor(
    private readonly purge: PurgeService,
    private readonly retention: RetentionService,
    metrics: MetricsService
  ) {
    super(metrics);
  }

  protected async handle(job: Job) {
    return match<string, Promise<unknown>>(job.name)
      .with(JOB.purge.dispatch, async () => ({ dispatched: await this.purge.dispatch() }))
      .with(JOB.purge.retention, async () => ({ deleted: await this.retention.purgeExpired() }))
      .otherwise(async () => {
        await this.purge.purgeAccount({
          ...purgeAccountPayloadSchema.parse(job.data),
          isFinalAttempt: job.attemptsMade + 1 >= (job.opts.attempts ?? 1)
        });

        return { purged: true };
      });
  }
}
