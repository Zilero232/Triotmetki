import { Module } from '@nestjs/common';

import { BotCommandsModule } from '../../bot-commands';
import { TwitchPanelReaderService } from './services/twitch-panel-reader.service';

@Module({
  imports: [BotCommandsModule],
  providers: [TwitchPanelReaderService],
  exports: [TwitchPanelReaderService]
})
export class StreamerPanelModule {}
