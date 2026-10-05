import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { match } from 'ts-pattern';

import { WORKER_CONCURRENCY } from '../../config';
import { encyclopediaPayloadSchema, JOB, QUEUE } from '../../contracts';
import { MetricsService, TrackedWorkerHost } from '../../metrics';
import { CatalogSyncService } from '../services/catalog-sync.service';
import { EncyclopediaSyncService } from '../services/encyclopedia-sync.service';
import { ExpectedValuesSyncService } from '../services/expected-values-sync.service';
import { MasteryThresholdsSyncService } from '../services/mastery-thresholds-sync.service';
import { MoeEstimateAggregateService } from '../services/moe-estimate-aggregate.service';
import { MoeThresholdsSyncService } from '../services/moe-thresholds-sync.service';

@Processor(QUEUE.reference, { concurrency: WORKER_CONCURRENCY.reference })
export class ReferenceProcessor extends TrackedWorkerHost {
  constructor(
    private readonly encyclopedia: EncyclopediaSyncService,
    private readonly expectedValues: ExpectedValuesSyncService,
    private readonly moe: MoeThresholdsSyncService,
    private readonly moeEstimate: MoeEstimateAggregateService,
    private readonly mastery: MasteryThresholdsSyncService,
    private readonly catalog: CatalogSyncService,
    metrics: MetricsService
  ) {
    super(metrics);
  }

  protected async handle(job: Job) {
    return match<string, Promise<unknown>>(job.name)
      .with(JOB.reference.versionCheck, () => this.encyclopedia.checkVersion())
      .with(JOB.reference.encyclopedia, () => this.encyclopedia.sync(encyclopediaPayloadSchema.parse(job.data)))
      .with(JOB.reference.wn8Expected, () => this.expectedValues.sync())
      .with(JOB.reference.moeThresholds, () => this.moe.sync())
      .with(JOB.reference.moeEstimate, () => this.moeEstimate.sync())
      .with(JOB.reference.masteryThresholds, () => this.mastery.sync())
      .with(JOB.reference.englishNames, () => this.catalog.englishNames())
      .otherwise(async () => ({ ignored: job.name }));
  }
}
