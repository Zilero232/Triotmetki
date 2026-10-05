import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { match } from 'ts-pattern';

import { MetricsService, TrackedWorkerHost } from '../../collector/metrics';
import { REPLAYS_QUEUE } from '../config/queue.constants';
import { replayParseJobSchema } from '../dto/replays.schemas';
import { BestOfWeekAggregateService } from '../services/best-of-week-aggregate.service';
import { ReplayOverflowService } from '../services/replay-overflow.service';
import { ReplayParseService } from '../services/replay-parse.service';
import { ReplayTagAggregateService } from '../services/replay-tag-aggregate.service';

@Processor(REPLAYS_QUEUE.name, { concurrency: REPLAYS_QUEUE.concurrency })
export class ReplaysProcessor extends TrackedWorkerHost {
  constructor(
    private readonly parser: ReplayParseService,
    private readonly bestOfWeek: BestOfWeekAggregateService,
    private readonly overflow: ReplayOverflowService,
    private readonly tagBackfill: ReplayTagAggregateService,
    metrics: MetricsService
  ) {
    super(metrics);
  }

  protected async handle(job: Job): Promise<unknown> {
    return match(job.name)
      .with(REPLAYS_QUEUE.jobs.parse, () =>
        this.parser.parse({
          replayId: replayParseJobSchema.parse(job.data).replayId,
          isFinalAttempt: job.attemptsMade + 1 >= (job.opts.attempts ?? 1)
        })
      )
      .with(REPLAYS_QUEUE.jobs.bestOfWeek, () => this.bestOfWeek.feature(new Date()))
      .with(REPLAYS_QUEUE.jobs.overflowCleanup, () => this.overflow.run(new Date()))
      .with(REPLAYS_QUEUE.jobs.tagBackfill, () => this.tagBackfill.run())
      .otherwise(() => null);
  }
}
