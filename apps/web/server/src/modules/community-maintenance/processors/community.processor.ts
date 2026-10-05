import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { match } from 'ts-pattern';

import { MetricsService, TrackedWorkerHost } from '../../collector/metrics';
import { PlatoonWriterService } from '../../platoons';
import { RecruitingWriterService } from '../../recruiting';
import { COMMUNITY_QUEUE } from '../config/community-maintenance.constants';

@Processor(COMMUNITY_QUEUE.name, { concurrency: 1 })
export class CommunityProcessor extends TrackedWorkerHost {
  constructor(
    private readonly platoons: PlatoonWriterService,
    private readonly recruiting: RecruitingWriterService,
    metrics: MetricsService
  ) {
    super(metrics);
  }

  protected async handle(job: Job): Promise<unknown> {
    const now = new Date();

    return match(job.name)
      .with(COMMUNITY_QUEUE.jobs.expirePosts, async () => ({
        platoon: await this.platoons.expire(now),
        recruiting: await this.recruiting.expire(now)
      }))
      .otherwise(() => null);
  }
}
