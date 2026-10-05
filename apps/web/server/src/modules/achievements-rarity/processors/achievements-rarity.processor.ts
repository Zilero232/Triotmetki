import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { match } from 'ts-pattern';

import { MetricsService, TrackedWorkerHost } from '../../collector/metrics';
import { ACHIEVEMENTS_RARITY_QUEUE } from '../config/queue.constants';
import { AchievementsSyncService } from '../services/achievements-sync.service';
import { RarityAggregateService } from '../services/rarity-aggregate.service';

@Processor(ACHIEVEMENTS_RARITY_QUEUE.name, { concurrency: 1 })
export class AchievementsRarityProcessor extends TrackedWorkerHost {
  constructor(
    private readonly sync: AchievementsSyncService,
    private readonly aggregates: RarityAggregateService,
    metrics: MetricsService
  ) {
    super(metrics);
  }

  protected async handle(job: Job): Promise<unknown> {
    return match(job.name)
      .with(ACHIEVEMENTS_RARITY_QUEUE.jobs.fetch, () => this.sync.fetch())
      .with(ACHIEVEMENTS_RARITY_QUEUE.jobs.aggregate, () => this.aggregates.compute())
      .otherwise(() => null);
  }
}
