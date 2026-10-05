import type { VkStatus } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';

import { AppConfigService } from '../../../config';
import { VK_BOT } from '../config/bot.constants';

@Injectable()
export class VkStatusReaderService {
  constructor(private readonly config: AppConfigService) {}

  status(): VkStatus {
    const groupId = this.config.get('VK_GROUP_ID');
    const appId = this.config.get('VK_MINI_APP_ID');
    const isEnabled = Boolean(this.config.get('VK_BOT_TOKEN')) && groupId > 0;
    const hasMiniApp = appId > 0 && Boolean(this.config.get('VK_MINI_APP_SECRET'));

    return {
      enabled: isEnabled,
      linkEnabled: Boolean(this.config.get('VK_ID_CLIENT_ID') && this.config.get('VK_ID_CLIENT_SECRET')),
      botUrl: isEnabled ? VK_BOT.botUrl.replace('{id}', String(groupId)) : null,
      miniAppUrl: hasMiniApp ? VK_BOT.miniAppUrl.replace('{id}', String(appId)) : null
    };
  }
}
