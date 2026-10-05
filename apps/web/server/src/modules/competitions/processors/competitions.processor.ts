import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { match } from 'ts-pattern';

import { MetricsService, TrackedWorkerHost } from '../../collector/metrics';
import { COMPETITION_QUEUE } from '../config/competitions.constants';
import { CompetitionScoringAggregateService } from '../services/competition-scoring-aggregate.service';

@Processor(COMPETITION_QUEUE.name, { concurrency: 1 })
export class CompetitionsProcessor extends TrackedWorkerHost {
  constructor(
    private readonly scoring: CompetitionScoringAggregateService,
    metrics: MetricsService
  ) {
    super(metrics);
  }

  protected async handle(job: Job): Promise<unknown> {
    return match(job.name)
      .with(COMPETITION_QUEUE.jobs.score, () => this.scoring.run(new Date()))
      .otherwise(() => null);
  }
}
