import { Module } from '@nestjs/common';

import { AnalyticsModule } from '../analytics';
import { BotCommandsModule } from '../bot-commands';
import { CommunityCoreModule } from '../community-core';
import { MissionsModule } from '../missions';
import { TelegramBotService } from './services/telegram-bot.service';
import { TelegramChatReaderService } from './services/telegram-chat-reader.service';
import { TelegramCommandsService } from './services/telegram-commands.service';
import { TelegramIdentityWriterService } from './services/telegram-identity-writer.service';
import { TelegramInlineService } from './services/telegram-inline.service';
import { TelegramLinkWriterService } from './services/telegram-link-writer.service';
import { TelegramMissionCommandsService } from './services/telegram-mission-commands.service';
import { TelegramPlaylistCommandsService } from './services/telegram-playlist-commands.service';
import { TelegramSettingsWriterService } from './services/telegram-settings-writer.service';
import { TelegramSharedCommandsService } from './services/telegram-shared-commands.service';
import { TelegramCoreModule } from './telegram-core.module';
import { TelegramLinkController } from './telegram-link.controller';
import { TelegramController } from './telegram.controller';

@Module({
  imports: [TelegramCoreModule, BotCommandsModule, MissionsModule, AnalyticsModule, CommunityCoreModule],
  controllers: [TelegramController, TelegramLinkController],
  providers: [
    TelegramBotService,
    TelegramChatReaderService,
    TelegramCommandsService,
    TelegramIdentityWriterService,
    TelegramInlineService,
    TelegramLinkWriterService,
    TelegramMissionCommandsService,
    TelegramPlaylistCommandsService,
    TelegramSettingsWriterService,
    TelegramSharedCommandsService
  ],
  exports: [TelegramCoreModule]
})
export class TelegramModule {}
