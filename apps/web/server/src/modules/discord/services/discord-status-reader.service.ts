import type { DiscordStatus } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';

import { AppConfigService } from '../../../config';
import { inviteUrl } from '../lib/invite-url/invite-url';

@Injectable()
export class DiscordStatusReaderService {
  constructor(private readonly config: AppConfigService) {}

  status(): DiscordStatus {
    const applicationId = this.config.get('DISCORD_APPLICATION_ID');
    const isEnabled = Boolean(this.config.get('DISCORD_BOT_TOKEN') && applicationId);

    return {
      enabled: isEnabled,
      linkEnabled: Boolean(applicationId && this.config.get('DISCORD_CLIENT_SECRET')),
      inviteUrl: isEnabled ? inviteUrl(applicationId) : null
    };
  }
}
