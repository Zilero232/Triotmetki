import { API } from '@discordjs/core';
import { Inject, Injectable } from '@nestjs/common';

import type { SendDirectInput } from '../discord.types';

import { DISCORD_TOKENS } from '../config/tokens.constants';
import { toNotificationMessage } from '../mappers/messages.mappers';

@Injectable()
export class DiscordSenderService {
  constructor(@Inject(DISCORD_TOKENS.api) private readonly api: API | null) {}

  get isEnabled(): boolean {
    return this.api !== null;
  }

  async sendDirect({ discordUserId, ...message }: SendDirectInput): Promise<void> {
    if (!this.api) {
      return;
    }

    const channel = await this.api.users.createDM(discordUserId);

    await this.api.channels.createMessage(channel.id, toNotificationMessage(message));
  }
}
