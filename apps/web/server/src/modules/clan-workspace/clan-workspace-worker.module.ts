import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { NotificationsProducerModule } from '../notifications';
import { CLAN_WORKSPACE_QUEUE } from './config/queue.constants';
import { ClanWorkspaceSchedulesService } from './processors/clan-workspace-schedules.service';
import { ClanWorkspaceProcessor } from './processors/clan-workspace.processor';
import { ClanAccessService } from './services/clan-access.service';
import { ClanEventAttendanceWriterService } from './services/clan-event-attendance-writer.service';
import { ClanEventRemindersService } from './services/clan-event-reminders.service';
import { ClanEventsWriterService } from './services/clan-events-writer.service';
import { OfficerReportService } from './services/officer-report.service';

@Module({
  imports: [NotificationsProducerModule, BullModule.registerQueue({ name: CLAN_WORKSPACE_QUEUE.name })],
  providers: [
    ClanAccessService,
    ClanEventsWriterService,
    ClanEventAttendanceWriterService,
    ClanEventRemindersService,
    OfficerReportService,
    ClanWorkspaceProcessor,
    ClanWorkspaceSchedulesService
  ],
  exports: [OfficerReportService]
})
export class ClanWorkspaceWorkerModule {}
