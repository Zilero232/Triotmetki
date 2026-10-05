import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';

import { WORKER_CONCURRENCY } from '../../config';
import { enrolPayloadSchema, QUEUE } from '../../contracts';
import { MetricsService, TrackedWorkerHost } from '../../metrics';
import { EnrolService } from '../services/enrol.service';

@Processor(QUEUE.enrol, { concurrency: WORKER_CONCURRENCY.enrol })
export class EnrolProcessor extends TrackedWorkerHost {
  constructor(
    private readonly enrolment: EnrolService,
    metrics: MetricsService
  ) {
    super(metrics);
  }

  protected async handle(job: Job) {
    return this.enrolment.enrol(enrolPayloadSchema.parse(job.data));
  }
}
