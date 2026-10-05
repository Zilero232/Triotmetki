import { Module } from '@nestjs/common';

import { BotCommandsModule } from '../../bot-commands';
import { TwitchPanelService } from './services/twitch-panel.service';

@Module({
  imports: [BotCommandsModule],
  providers: [TwitchPanelService],
  exports: [TwitchPanelService]
})
export class StreamerPanelModule {}
