import { Module } from '@nestjs/common';

import { StreamerIntegrationsModule } from '../integrations';
import { ChatAnnouncerService } from './services/chat-announcer.service';
import { ChatReplyReaderService } from './services/chat-reply-reader.service';
import { TwitchChatService } from './services/twitch-chat.service';
import { VkLiveChatService } from './services/vk-live-chat.service';

@Module({
  imports: [StreamerIntegrationsModule],
  providers: [ChatReplyReaderService, ChatAnnouncerService, TwitchChatService, VkLiveChatService],
  exports: [ChatReplyReaderService, ChatAnnouncerService, TwitchChatService]
})
export class StreamerChatModule {}
