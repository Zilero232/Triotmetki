import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { match } from 'ts-pattern';

import { MetricsService, TrackedWorkerHost } from '../../collector/metrics';
import { MAP_STATS_QUEUE } from '../config/map-stats.constants';
import { MapStatsAggregateService } from '../services/map-stats-aggregate.service';

@Processor(MAP_STATS_QUEUE.name, { concurrency: 1 })
export class MapStatsProcessor extends TrackedWorkerHost {
  constructor(
    private readonly aggregates: MapStatsAggregateService,
    metrics: MetricsService
  ) {
    super(metrics);
  }

  protected async handle(job: Job): Promise<unknown> {
    return match(job.name)
      .with(MAP_STATS_QUEUE.jobs.aggregate, () => this.aggregates.compute())
      .otherwise(() => null);
  }
}
