import { Injectable, Logger } from '@nestjs/common';

import type { ChallengeAnnouncement, ChatAnnouncer } from '../chat.types';

import { TwitchChatService } from './twitch-chat.service';
import { VkLiveChatService } from './vk-live-chat.service';

@Injectable()
export class ChatAnnouncerService {
  private readonly logger = new Logger(ChatAnnouncerService.name);
  private readonly announcers: ChatAnnouncer[];

  constructor(twitch: TwitchChatService, vk: VkLiveChatService) {
    this.announcers = [twitch, vk];
  }

  async announce(announcement: ChallengeAnnouncement): Promise<void> {
    const results = await Promise.allSettled(this.announcers.map((announcer) => announcer.announce(announcement)));

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        this.logger.warn(`${this.announcers[index]?.provider ?? 'chat'} announcement failed: ${String(result.reason)}`);
      }
    });
  }
}
