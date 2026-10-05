import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { match } from 'ts-pattern';

import { MetricsService, TrackedWorkerHost } from '../../collector/metrics';
import { HONEST_RNG_QUEUE } from '../config/queue.constants';
import { RngAggregateService } from '../services/rng-aggregate.service';

@Processor(HONEST_RNG_QUEUE.name, { concurrency: 1 })
export class HonestRngProcessor extends TrackedWorkerHost {
  constructor(
    private readonly aggregates: RngAggregateService,
    metrics: MetricsService
  ) {
    super(metrics);
  }

  protected async handle(job: Job): Promise<unknown> {
    return match(job.name)
      .with(HONEST_RNG_QUEUE.jobs.aggregate, () => this.aggregates.compute())
      .otherwise(() => null);
  }
}
