import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { match } from 'ts-pattern';

import { MetricsService, TrackedWorkerHost } from '../../collector/metrics';
import { EVENTS_QUEUE } from '../config/queue.constants';
import { DropsAggregateService } from '../services/drops-aggregate.service';
import { EventCalendarSyncService } from '../services/event-calendar-sync.service';

@Processor(EVENTS_QUEUE.name, { concurrency: 1 })
export class EventsProcessor extends TrackedWorkerHost {
  constructor(
    private readonly calendar: EventCalendarSyncService,
    private readonly drops: DropsAggregateService,
    metrics: MetricsService
  ) {
    super(metrics);
  }

  protected async handle(job: Job): Promise<unknown> {
    return match(job.name)
      .with(EVENTS_QUEUE.jobs.calendar, () => this.calendar.run(new Date()))
      .with(EVENTS_QUEUE.jobs.drops, () => this.drops.run(new Date()))
      .otherwise(() => null);
  }
}
