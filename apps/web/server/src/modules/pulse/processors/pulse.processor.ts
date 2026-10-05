import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { match } from 'ts-pattern';

import { MetricsService, TrackedWorkerHost } from '../../collector/metrics';
import { PULSE_QUEUE } from '../config/pulse.constants';
import { PulseAggregateService } from '../services/pulse-aggregate.service';

@Processor(PULSE_QUEUE.name, { concurrency: 1 })
export class PulseProcessor extends TrackedWorkerHost {
  constructor(
    private readonly pulse: PulseAggregateService,
    metrics: MetricsService
  ) {
    super(metrics);
  }

  protected async handle(job: Job): Promise<unknown> {
    return match(job.name)
      .with(PULSE_QUEUE.jobs.sample, () => this.pulse.sample(new Date()))
      .otherwise(() => null);
  }
}
