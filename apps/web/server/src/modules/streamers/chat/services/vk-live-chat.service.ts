import { Injectable, Logger } from '@nestjs/common';

import type { ChallengeAnnouncement, ChatAnnouncer } from '../chat.types';

@Injectable()
export class VkLiveChatService implements ChatAnnouncer {
  readonly provider = 'vkPlayLive';
  private readonly logger = new Logger(VkLiveChatService.name);

  announce({ streamerUserId }: ChallengeAnnouncement): Promise<void> {
    this.logger.debug(`VK Video Live chat is not connected yet, skipped an announcement for ${streamerUserId}`);

    return Promise.resolve();
  }
}
