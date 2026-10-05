import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { match } from 'ts-pattern';

import { MetricsService, TrackedWorkerHost } from '../../collector/metrics';
import { SOCIAL_QUEUE } from '../config/queue.constants';
import { LeagueDivisionAggregateService } from '../services/league-division-aggregate.service';
import { WeeklyChallengeAggregateService } from '../services/weekly-challenge-aggregate.service';

@Processor(SOCIAL_QUEUE.name, { concurrency: 1 })
export class SocialProcessor extends TrackedWorkerHost {
  constructor(
    private readonly challenges: WeeklyChallengeAggregateService,
    private readonly leagues: LeagueDivisionAggregateService,
    metrics: MetricsService
  ) {
    super(metrics);
  }

  protected async handle(job: Job): Promise<unknown> {
    return match(job.name)
      .with(SOCIAL_QUEUE.jobs.challenges, () => this.challenges.evaluate(new Date()))
      .with(SOCIAL_QUEUE.jobs.leagues, () => this.leagues.rollover(new Date()))
      .otherwise(() => null);
  }
}
