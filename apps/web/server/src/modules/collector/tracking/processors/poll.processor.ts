import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';

import { WORKER_CONCURRENCY } from '../../config';
import { accountBatchPayloadSchema, JOB, QUEUE } from '../../contracts';
import { MetricsService, TrackedWorkerHost } from '../../metrics';
import { DispatchService } from '../services/dispatch.service';
import { PollSyncService } from '../services/poll-sync.service';

@Processor(QUEUE.poll, { concurrency: WORKER_CONCURRENCY.poll })
export class PollProcessor extends TrackedWorkerHost {
  constructor(
    private readonly pipeline: PollSyncService,
    private readonly dispatch: DispatchService,
    metrics: MetricsService
  ) {
    super(metrics);
  }

  protected async handle(job: Job) {
    if (job.name === JOB.poll.dispatch) {
      return { dispatched: await this.dispatch.dispatchActive() };
    }

    const { accountIds } = accountBatchPayloadSchema.parse(job.data);

    return this.pipeline.run({ accountIds, lane: 'priority', tier: 'active' });
  }
}
