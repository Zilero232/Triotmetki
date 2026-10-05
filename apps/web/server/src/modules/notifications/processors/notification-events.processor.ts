import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { match } from 'ts-pattern';

import { MetricsService, TrackedWorkerHost } from '../../collector/metrics';
import { NOTIFICATIONS_JOB, NOTIFICATIONS_QUEUE } from '../config/notifications-queue.constants';
import { FirstWinRemindersService } from '../services/first-win-reminders.service';
import { MarksWatchService } from '../services/marks-watch.service';
import { SessionReportsService } from '../services/session-reports.service';
import { ThresholdDropsService } from '../services/threshold-drops.service';
import { WeeklyDigestService } from '../services/weekly-digest.service';

@Processor(NOTIFICATIONS_QUEUE.events, { concurrency: 1 })
export class NotificationEventsProcessor extends TrackedWorkerHost<number> {
  constructor(
    private readonly marks: MarksWatchService,
    private readonly sessions: SessionReportsService,
    private readonly thresholds: ThresholdDropsService,
    private readonly digest: WeeklyDigestService,
    private readonly firstWin: FirstWinRemindersService,
    metrics: MetricsService
  ) {
    super(metrics);
  }

  protected async handle(job: Job): Promise<number> {
    return match(job.name)
      .with(NOTIFICATIONS_JOB.events.marksWatch, () => this.marks.run())
      .with(NOTIFICATIONS_JOB.events.sessionReports, () => this.sessions.run())
      .with(NOTIFICATIONS_JOB.events.thresholdDrops, () => this.thresholds.run())
      .with(NOTIFICATIONS_JOB.events.weeklyDigest, () => this.digest.run())
      .with(NOTIFICATIONS_JOB.events.firstWinReminders, () => this.firstWin.run())
      .otherwise(() => 0);
  }
}
