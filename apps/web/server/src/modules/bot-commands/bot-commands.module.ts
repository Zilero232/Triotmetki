import { Module } from '@nestjs/common';

import { PlayersModule } from '../players';
import { BotAccountsReaderService } from './services/bot-accounts-reader.service';
import { BotRepliesService } from './services/bot-replies.service';
import { BotStatsReaderService } from './services/bot-stats-reader.service';

@Module({
  imports: [PlayersModule],
  providers: [BotAccountsReaderService, BotRepliesService, BotStatsReaderService],
  exports: [BotAccountsReaderService, BotRepliesService, BotStatsReaderService]
})
export class BotCommandsModule {}
