import { Module } from '@nestjs/common';

import { BillingCoreModule } from '../billing';
import { BotCommandsModule } from '../bot-commands';
import { DiscordCoreModule } from './discord-core.module';
import { DiscordController } from './discord.controller';
import { DiscordCopyService } from './services/discord-copy.service';
import { DiscordGatewayService } from './services/discord-gateway.service';
import { DiscordGuildsWriterService } from './services/discord-guilds-writer.service';
import { DiscordInteractionsService } from './services/discord-interactions.service';
import { DiscordRolesService } from './services/discord-roles.service';
import { DiscordStatusReaderService } from './services/discord-status-reader.service';

@Module({
  imports: [BillingCoreModule, BotCommandsModule, DiscordCoreModule],
  controllers: [DiscordController],
  providers: [
    DiscordCopyService,
    DiscordGatewayService,
    DiscordGuildsWriterService,
    DiscordInteractionsService,
    DiscordRolesService,
    DiscordStatusReaderService
  ]
})
export class DiscordModule {}
