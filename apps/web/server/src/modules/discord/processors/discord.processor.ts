import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { match } from 'ts-pattern';

import { MetricsService, TrackedWorkerHost } from '../../collector/metrics';
import { DISCORD_QUEUE } from '../config/queue.constants';
import { DiscordRemindersService } from '../services/discord-reminders.service';
import { DiscordReportService } from '../services/discord-report.service';
import { DiscordRolesService } from '../services/discord-roles.service';

@Processor(DISCORD_QUEUE.name, { concurrency: 1 })
export class DiscordProcessor extends TrackedWorkerHost {
  constructor(
    private readonly reminders: DiscordRemindersService,
    private readonly roles: DiscordRolesService,
    private readonly reports: DiscordReportService,
    metrics: MetricsService
  ) {
    super(metrics);
  }

  protected async handle(job: Job): Promise<unknown> {
    const now = new Date();

    return match(job.name)
      .with(DISCORD_QUEUE.jobs.reminders, () => this.reminders.send(now))
      .with(DISCORD_QUEUE.jobs.roles, () => this.roles.syncAll())
      .with(DISCORD_QUEUE.jobs.weeklyReport, () => this.reports.sendWeekly(now))
      .otherwise(() => null);
  }
}
