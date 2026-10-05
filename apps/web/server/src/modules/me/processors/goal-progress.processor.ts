import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { match } from 'ts-pattern';

import { MetricsService, TrackedWorkerHost } from '../../collector/metrics';
import { GOAL_PROGRESS_QUEUE } from '../config/goal-progress.constants';
import { GoalProgressAggregateService } from '../services/goal-progress-aggregate.service';

@Processor(GOAL_PROGRESS_QUEUE.name, { concurrency: 1 })
export class GoalProgressProcessor extends TrackedWorkerHost<number> {
  constructor(
    private readonly progress: GoalProgressAggregateService,
    metrics: MetricsService
  ) {
    super(metrics);
  }

  protected async handle(job: Job): Promise<number> {
    return match(job.name)
      .with(GOAL_PROGRESS_QUEUE.jobs.progress, () => this.progress.run(new Date()))
      .otherwise(() => 0);
  }
}
