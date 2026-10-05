import { Module } from '@nestjs/common';

import { NotificationsProducerModule } from '../notifications';
import { ClanWorkspaceController } from './clan-workspace.controller';
import { ClanAccessService } from './services/clan-access.service';
import { ClanEventAttendanceWriterService } from './services/clan-event-attendance-writer.service';
import { ClanEventsWriterService } from './services/clan-events-writer.service';
import { OfficerReportService } from './services/officer-report.service';
import { RecruitFunnelWriterService } from './services/recruit-funnel-writer.service';
import { WorkspaceWriterService } from './services/workspace-writer.service';

@Module({
  imports: [NotificationsProducerModule],
  controllers: [ClanWorkspaceController],
  providers: [
    ClanAccessService,
    WorkspaceWriterService,
    ClanEventsWriterService,
    ClanEventAttendanceWriterService,
    RecruitFunnelWriterService,
    OfficerReportService
  ]
})
export class ClanWorkspaceModule {}
