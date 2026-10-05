import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { match } from 'ts-pattern';

import { MetricsService, TrackedWorkerHost } from '../../collector/metrics';
import { SHOP_QUEUE } from '../config/queue.constants';
import { BonusCodeSyncService } from '../services/bonus-code-sync.service';
import { BonusCodeWriterService } from '../services/bonus-code-writer.service';
import { NewsEnrichAggregateService } from '../services/news-enrich-aggregate.service';
import { OfferSyncService } from '../services/offer-sync.service';

@Processor(SHOP_QUEUE.name, { concurrency: 1 })
export class ShopProcessor extends TrackedWorkerHost {
  constructor(
    private readonly offers: OfferSyncService,
    private readonly codeScraper: BonusCodeSyncService,
    private readonly bonusCodes: BonusCodeWriterService,
    private readonly news: NewsEnrichAggregateService,
    metrics: MetricsService
  ) {
    super(metrics);
  }

  protected async handle(job: Job): Promise<unknown> {
    const now = new Date();

    return match(job.name)
      .with(SHOP_QUEUE.jobs.offers, () => this.offers.run(now))
      .with(SHOP_QUEUE.jobs.bonusCodes, () => this.codeScraper.run(now))
      .with(SHOP_QUEUE.jobs.bonusStatus, () => this.bonusCodes.refreshStatuses(now))
      .with(SHOP_QUEUE.jobs.newsEnrich, () => this.news.run(now))
      .otherwise(() => null);
  }
}
