import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { match } from 'ts-pattern';

import { MetricsService, TrackedWorkerHost } from '../../collector/metrics';
import { PROGRESSION_QUEUE } from '../config/queue.constants';
import { ProgressionAggregateService } from '../services/progression-aggregate.service';

@Processor(PROGRESSION_QUEUE.name, { concurrency: 1 })
export class ProgressionProcessor extends TrackedWorkerHost {
  constructor(
    private readonly runs: ProgressionAggregateService,
    metrics: MetricsService
  ) {
    super(metrics);
  }

  protected async handle(job: Job): Promise<unknown> {
    return match(job.name)
      .with(PROGRESSION_QUEUE.jobs.run, () => this.runs.run(new Date()))
      .otherwise(() => null);
  }
}
