import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { match } from 'ts-pattern';

import { WORKER_CONCURRENCY } from '../../config';
import { accountRatingsPayloadSchema, JOB, QUEUE } from '../../contracts';
import { MetricsService, TrackedWorkerHost } from '../../metrics';
import { BuildUsageAggregateService, ModeMetaAggregateService } from '../meta';
import { AccountRatingsAggregateService } from '../player-ratings';
import { ServerStatsAggregateService, TrackingTierAggregateService } from '../server';
import { LearningCurveAggregateService, TankEconomyAggregateService, TankPercentilesAggregateService } from '../tank-stats';

@Processor(QUEUE.aggregate, { concurrency: WORKER_CONCURRENCY.aggregate })
export class AggregateProcessor extends TrackedWorkerHost {
  constructor(
    private readonly accountRatings: AccountRatingsAggregateService,
    private readonly serverStats: ServerStatsAggregateService,
    private readonly percentiles: TankPercentilesAggregateService,
    private readonly trackingTiers: TrackingTierAggregateService,
    private readonly economy: TankEconomyAggregateService,
    private readonly learning: LearningCurveAggregateService,
    private readonly buildUsage: BuildUsageAggregateService,
    private readonly modeMeta: ModeMetaAggregateService,
    metrics: MetricsService
  ) {
    super(metrics);
  }

  protected async handle(job: Job) {
    return match<string, Promise<unknown>>(job.name)
      .with(JOB.aggregate.accountRatings, () => this.accountRatings.compute(accountRatingsPayloadSchema.parse(job.data)))
      .with(JOB.aggregate.serverStats, () => this.serverStats.compute())
      .with(JOB.aggregate.tankPercentiles, () => this.percentiles.compute())
      .with(JOB.aggregate.tierMaintenance, () => this.trackingTiers.run())
      .with(JOB.aggregate.tankEconomy, () => this.economy.compute())
      .with(JOB.aggregate.learningCurve, () => this.learning.compute())
      .with(JOB.aggregate.buildUsage, () => this.buildUsage.compute())
      .with(JOB.aggregate.modeMeta, () => this.modeMeta.compute())
      .otherwise(async () => ({ ignored: job.name }));
  }
}
