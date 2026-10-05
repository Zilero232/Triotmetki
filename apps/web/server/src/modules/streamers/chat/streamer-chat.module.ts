import { Module } from '@nestjs/common';

import { StreamerIntegrationsModule } from '../integrations';
import { ChatAnnouncerService } from './services/chat-announcer.service';
import { StreamerStatsService } from './services/streamer-stats.service';
import { TwitchChatService } from './services/twitch-chat.service';
import { VkLiveChatService } from './services/vk-live-chat.service';

@Module({
  imports: [StreamerIntegrationsModule],
  providers: [StreamerStatsService, ChatAnnouncerService, TwitchChatService, VkLiveChatService],
  exports: [StreamerStatsService, ChatAnnouncerService, TwitchChatService]
})
export class StreamerChatModule {}
