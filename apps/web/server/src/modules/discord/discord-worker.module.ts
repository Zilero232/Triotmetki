import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { BillingCoreModule } from '../billing';
import { ClanWorkspaceWorkerModule } from '../clan-workspace';
import { DISCORD_QUEUE } from './config/queue.constants';
import { DiscordCoreModule } from './discord-core.module';
import { DiscordSchedulesService } from './processors/discord-schedules.service';
import { DiscordProcessor } from './processors/discord.processor';
import { DiscordCopyService } from './services/discord-copy.service';
import { DiscordRemindersService } from './services/discord-reminders.service';
import { DiscordReportService } from './services/discord-report.service';
import { DiscordRolesService } from './services/discord-roles.service';

@Module({
  imports: [BillingCoreModule, ClanWorkspaceWorkerModule, DiscordCoreModule, BullModule.registerQueue({ name: DISCORD_QUEUE.name })],
  providers: [DiscordCopyService, DiscordRemindersService, DiscordReportService, DiscordRolesService, DiscordProcessor, DiscordSchedulesService]
})
export class DiscordWorkerModule {}
